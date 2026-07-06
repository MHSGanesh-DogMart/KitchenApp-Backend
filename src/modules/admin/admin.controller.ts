import { Request, Response, NextFunction } from 'express';
import * as cookService from '../../services/cookService';
import * as configService from '../../services/configService';
import * as couponService from '../../services/couponService';
import * as cuisineService from '../../services/cuisineService';
import * as userService from '../../services/userService';
import * as orderService from '../../services/orderService';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config';

import { generateToken } from '../../auth';

/** Admin login - with validations */
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (email !== 'admin@padosi.com' || password !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = generateToken(email, 'admin');
    return res.json({
      success: true,
      data: {
        token,
        admin: {
          email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalCooks = await cookService.countCooks();
    const pending = await cookService.countPendingCooks();
    return res.json({ success: true, data: { totalCooks, pending } });
  } catch (error) {
    next(error);
  }
};

export const getPendingCooks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await cookService.getPendingCooks();
    return res.json({ success: true, data: pending });
  } catch (error) {
    next(error);
  }
};

/** List customers (User table) for the admin Customers page — server-side search + pagination */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const [result, stats] = await Promise.all([
      userService.listAllUsers({ search, page, limit }),
      userService.userStats(),
    ]);

    return res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/** Cross-kitchen order ledger for the admin Orders page — search + filter + pagination */
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const [result, stats] = await Promise.all([
      orderService.listAllOrders({ search, status, page, limit }),
      orderService.adminOrderStats(),
    ]);

    return res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/** Block or unblock a customer from the admin Customers page */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const raw = String(req.body?.status ?? '');
    const status = raw === 'Blocked' ? 'Blocked' : raw === 'Active' ? 'Active' : null;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status must be "Active" or "Blocked"' });
    }
    const updated = await userService.setUserStatus(id, status);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getCookById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cook = await cookService.findCookById(req.params.id as string);
    if (!cook) return res.status(404).json({ success: false, message: 'Cook not found' });
    return res.json({ success: true, data: cook });
  } catch (error) {
    next(error);
  }
};

export const verifyCook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const updated = await cookService.verifyCook(id);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cookService.deleteCook(req.params.id as string);
    return res.json({ success: true, message: 'Cook deleted' });
  } catch (error) {
    next(error);
  }
};

export const getConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await configService.getOrCreatePlatformConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await configService.updatePlatformConfig(req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.q as string;
    const status = req.query.status as string;
    const coupons = await couponService.listCoupons(search, status);
    return res.json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, description, type, value, cap, endsAt } = req.body;
    if (!code || !description || !type || value === undefined || !cap || !endsAt) {
      return res.status(400).json({ success: false, message: 'Missing required coupon fields' });
    }
    const existing = await couponService.findCouponByCode(code);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    const coupon = await couponService.createCoupon(req.body);
    return res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const existing = await couponService.findCouponByCode(code);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    const updated = await couponService.updateCouponByCode(code, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const existing = await couponService.findCouponByCode(code);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    await couponService.deleteCouponByCode(code);
    return res.json({ success: true, message: `Coupon ${code} deleted` });
  } catch (error) {
    next(error);
  }
};

export const runPayoutCycle = async (_req: Request, res: Response, next: NextFunction) => {
  // Stub: simulate payout
  return res.json({ success: true, message: 'Payout cycle executed' });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    return res.json({ success: true, message: `Password reset link sent to ${email}` });
  } catch (error) {
    next(error);
  }
};

export const getCooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    let cooks = await cookService.listAllCooks();
    if (status) {
      cooks = cooks.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
    return res.json({ success: true, data: cooks });
  } catch (error) {
    next(error);
  }
};

export const updateFssai = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const updated = await cookService.updateFssai(id, req.body);
    const activated = await cookService.upsertCook({ ...updated, status: 'ACTIVE' });
    return res.json({ success: true, data: activated });
  } catch (error) {
    next(error);
  }
};

// ─── Cuisine CRUD ───────────────────────────────────────────────────────────

export const getCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.q as string | undefined;
    const activeParam = req.query.isActive as string | undefined;
    const isActive = activeParam !== undefined ? activeParam === 'true' : undefined;
    const cuisines = await cuisineService.listCuisines(search, isActive);
    return res.json({ success: true, data: cuisines });
  } catch (error) {
    next(error);
  }
};

export const getCuisineById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisine = await cuisineService.findCuisineById(req.params.id);
    if (!cuisine) return res.status(404).json({ success: false, message: 'Cuisine not found' });
    return res.json({ success: true, data: cuisine });
  } catch (error) {
    next(error);
  }
};

export const createCuisine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, imageUrl, isActive, sortOrder } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Cuisine name is required' });
    }
    const existing = await cuisineService.findCuisineByName(name.trim());
    if (existing) {
      return res.status(400).json({ success: false, message: `Cuisine "${name.trim()}" already exists` });
    }
    const cuisine = await cuisineService.createCuisine({ name, description, imageUrl, isActive, sortOrder });
    return res.status(201).json({ success: true, data: cuisine });
  } catch (error) {
    next(error);
  }
};

export const updateCuisine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await cuisineService.findCuisineById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Cuisine not found' });
    const updated = await cuisineService.updateCuisine(id, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCuisine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await cuisineService.findCuisineById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Cuisine not found' });
    await cuisineService.deleteCuisine(id);
    return res.json({ success: true, message: `Cuisine "${existing.name}" deleted` });
  } catch (error) {
    next(error);
  }
};
