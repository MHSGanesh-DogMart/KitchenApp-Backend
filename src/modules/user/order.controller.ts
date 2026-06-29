import { Request, Response, NextFunction } from 'express';
import * as orderService from '../../services/orderService';
import { OrderError } from '../../services/orderService';

const uid = (req: Request) => (req as any).user?.id as string | undefined;

/** Step 1: validate cart + create a Razorpay order. Returns payment params. */
export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { fulfillment, addressId, note, lat, lng } = req.body;
    const result = await orderService.checkout(id, {
      fulfillment: fulfillment === 'pickup' ? 'pickup' : 'delivery',
      addressId: addressId ? String(addressId) : undefined,
      note: note ? String(note) : undefined,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
    });
    return res.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

/** Step 2: verify the Razorpay signature → confirm the order. */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' });
    }
    const order = await orderService.verifyPayment(id, {
      orderId: String(orderId),
      razorpayPaymentId: String(razorpayPaymentId),
      razorpayOrderId: String(razorpayOrderId),
      razorpaySignature: String(razorpaySignature),
    });
    return res.json({ success: true, message: 'Order placed successfully', data: order });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const orders = await orderService.listOrders(id);
    return res.json({ success: true, data: orders });
  } catch (e) {
    next(e);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const order = await orderService.getOrder(id, String(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const order = await orderService.cancelOrder(id, String(req.params.id));
    return res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};
