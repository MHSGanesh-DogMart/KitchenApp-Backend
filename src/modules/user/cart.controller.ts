import { Request, Response, NextFunction } from 'express';
import * as cartService from '../../services/cartService';
import { CartKitchenConflict, CartError } from '../../services/cartService';

const uid = (req: Request) => (req as any).user?.id as string | undefined;

/** Read lat/lng/fulfillment from body (mutations) or query (GET) for the bill. */
function billOpts(req: Request) {
  const src: any = { ...req.query, ...req.body };
  const lat = src.lat != null && src.lat !== '' ? Number(src.lat) : undefined;
  const lng = src.lng != null && src.lng !== '' ? Number(src.lng) : undefined;
  const fulfillment = src.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    fulfillment: fulfillment as 'delivery' | 'pickup',
  };
}

async function respondCart(req: Request, res: Response, id: string) {
  const cart = await cartService.getCartWithBill(id, billOpts(req));
  return res.json({ success: true, data: cart });
}

/** GET the cart + computed bill (lat/lng/fulfillment as query params). */
export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    return respondCart(req, res, id);
  } catch (e) {
    next(e);
  }
};

/** Add a dish. 409 CART_KITCHEN_CONFLICT if a different kitchen is in the cart. */
export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { menuItemId, qty, force } = req.body;
    if (!menuItemId) return res.status(400).json({ success: false, message: 'menuItemId is required' });
    await cartService.addItem(id, String(menuItemId), Number(qty) || 1, force === true || force === 'true');
    return respondCart(req, res, id);
  } catch (e) {
    if (e instanceof CartKitchenConflict) {
      return res.status(409).json({
        success: false,
        code: e.code, // 'CART_KITCHEN_CONFLICT' — app shows "clear cart?" dialog
        message: e.message,
        currentKitchen: e.currentKitchenName,
        newKitchen: e.newKitchenName,
      });
    }
    if (e instanceof CartError) {
      return res.status(e.status).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const incrementItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { menuItemId } = req.body;
    if (!menuItemId) return res.status(400).json({ success: false, message: 'menuItemId is required' });
    await cartService.incrementItem(id, String(menuItemId));
    return respondCart(req, res, id);
  } catch (e) {
    if (e instanceof CartError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

export const decrementItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { menuItemId } = req.body;
    if (!menuItemId) return res.status(400).json({ success: false, message: 'menuItemId is required' });
    await cartService.decrementItem(id, String(menuItemId));
    return respondCart(req, res, id);
  } catch (e) {
    next(e);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await cartService.removeItem(id, String(req.params.menuItemId));
    return respondCart(req, res, id);
  } catch (e) {
    next(e);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await cartService.clearCart(id);
    return respondCart(req, res, id);
  } catch (e) {
    next(e);
  }
};

export const applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });
    await cartService.applyCoupon(id, String(code).trim());
    return respondCart(req, res, id);
  } catch (e) {
    if (e instanceof CartError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

export const removeCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await cartService.removeCoupon(id);
    return respondCart(req, res, id);
  } catch (e) {
    next(e);
  }
};
