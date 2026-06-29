import { Request, Response, NextFunction } from 'express';
import * as orderService from '../../services/orderService';
import { OrderError } from '../../services/orderService';

// The kitchen token's user id IS the cook id (generateToken(cook.id, 'kitchen')).
const cookId = (req: Request) => (req as any).user?.id as string | undefined;

/** GET /kitchen/orders?status= — orders for the logged-in kitchen. */
export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = cookId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const status = req.query.status ? String(req.query.status) : undefined;
    const orders = await orderService.listKitchenOrders(id, status);
    return res.json({ success: true, data: orders });
  } catch (e) {
    next(e);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = cookId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const order = await orderService.getKitchenOrder(id, String(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (e) {
    next(e);
  }
};

export const acceptOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = cookId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const order = await orderService.acceptOrder(id, String(req.params.id));
    return res.json({ success: true, message: 'Order accepted', data: order });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

export const rejectOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = cookId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const order = await orderService.rejectOrder(id, String(req.params.id));
    return res.json({ success: true, message: 'Order rejected', data: order });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

/** PATCH /kitchen/orders/:id/status { status } — move the order forward. */
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = cookId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });
    const order = await orderService.updateKitchenStatus(id, String(req.params.id), String(status));
    return res.json({ success: true, message: 'Order updated', data: order });
  } catch (e) {
    if (e instanceof OrderError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};
