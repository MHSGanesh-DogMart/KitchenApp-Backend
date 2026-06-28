import { Request, Response, NextFunction } from 'express';
import * as addressService from '../../services/addressService';

const uid = (req: Request) => (req as any).user?.id as string | undefined;

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const list = await addressService.listAddresses(id);
    return res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { line1, lat, lng } = req.body;
    if (!line1 || !String(line1).trim()) {
      return res.status(400).json({ success: false, message: 'Address line is required' });
    }
    if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return res.status(400).json({ success: false, message: 'Pin your location on the map (lat/lng required)' });
    }
    const created = await addressService.createAddress(id, {
      ...req.body,
      lat: Number(lat),
      lng: Number(lng),
    });
    return res.status(201).json({ success: true, message: 'Address saved', data: created });
  } catch (e) {
    next(e);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const body: any = { ...req.body };
    if (body.lat != null) body.lat = Number(body.lat);
    if (body.lng != null) body.lng = Number(body.lng);
    const updated = await addressService.updateAddress(id, String(req.params.id), body);
    if (!updated) return res.status(404).json({ success: false, message: 'Address not found' });
    return res.json({ success: true, message: 'Address updated', data: updated });
  } catch (e) {
    next(e);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const removed = await addressService.deleteAddress(id, String(req.params.id));
    if (!removed) return res.status(404).json({ success: false, message: 'Address not found' });
    return res.json({ success: true, message: 'Address removed' });
  } catch (e) {
    next(e);
  }
};

export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uid(req);
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const updated = await addressService.setDefault(id, String(req.params.id));
    if (!updated) return res.status(404).json({ success: false, message: 'Address not found' });
    return res.json({ success: true, message: 'Default address set', data: updated });
  } catch (e) {
    next(e);
  }
};
