import { Request, Response, NextFunction } from 'express';
import * as cookService from '../../services/cookService';
import * as cuisineService from '../../services/cuisineService';
import { generateToken } from '../../auth';

/** Get public user profile (limited fields) */
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cook = await cookService.findCookById(req.params.id);
    if (!cook) return res.status(404).json({ success: false, message: 'User not found' });
    const { id, name, phone, tier } = cook;
    return res.json({ success: true, data: { id, name, phone, tier } });
  } catch (error) {
    next(error);
  }
};

/** Update user profile (allowed fields) */
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await cookService.findCookById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    const updates = req.body;
    const updated = { ...existing, ...updates } as any;
    const saved = await cookService.upsertCook(updated);
    return res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
};

/** OTP Login for Customers / Users */
export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone format (must be 10 digits)' });
    }
    if (otp !== '1234') {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }
    
    // Check if the user (modeled in Cook schema for demo) exists, if not auto-create
    let user = await cookService.findCookByPhone(phone);
    if (!user) {
      user = await cookService.createCook({
        name: 'Padosi Customer',
        phone: phone,
        status: 'Active',
        tier: 1,
      });
    }
    
    const token = generateToken(user.id, 'user');
    return res.status(200).json({ success: true, token, user });
  } catch (error) {
    next(error);
  }
};

/** Get active cuisines list (public - for user/customer app) */
export const getCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisines = await cuisineService.listCuisines(undefined, true);
    return res.json({ success: true, data: cuisines });
  } catch (error) {
    next(error);
  }
};
