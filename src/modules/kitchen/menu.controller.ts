import { Request, Response, NextFunction } from 'express';
import * as menuService from '../../services/menuService';
import { isValidDiet, isValidSpice, DIET_OPTIONS, SPICE_OPTIONS } from '../../constants/menu';

const getCookId = (req: Request): string | null =>
  (req as any).user?.id ?? null;

/** GET /api/kitchen/menu — all menu items for the authenticated kitchen */
export const getMyMenus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = getCookId(req);
    if (!cookId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const items = await menuService.listMenusByCook(cookId);
    return res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/** POST /api/kitchen/menu — add a new menu item */
export const addMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = getCookId(req);
    if (!cookId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, price, diet, spice } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    if (diet !== undefined && !isValidDiet(diet)) {
      return res.status(400).json({ success: false, message: `diet must be one of: ${DIET_OPTIONS.join(', ')}` });
    }
    if (spice !== undefined && !isValidSpice(spice)) {
      return res.status(400).json({ success: false, message: `spice must be one of: ${SPICE_OPTIONS.join(', ')}` });
    }

    const item = await menuService.createMenu(cookId, {
      ...req.body,
      price: Number(price),
      perDay: req.body.perDay !== undefined ? Number(req.body.perDay) : undefined,
    });
    return res.status(201).json({ success: true, message: 'Menu item added', data: item });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/kitchen/menu/:id — edit a menu item (must belong to this kitchen) */
export const editMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = getCookId(req);
    if (!cookId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = req.params.id as string;
    const existing = await menuService.findMenuById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Menu item not found' });
    if (existing.cookId !== cookId) {
      return res.status(403).json({ success: false, message: 'Not your menu item' });
    }

    const { diet, spice, price } = req.body;
    if (diet !== undefined && !isValidDiet(diet)) {
      return res.status(400).json({ success: false, message: `diet must be one of: ${DIET_OPTIONS.join(', ')}` });
    }
    if (spice !== undefined && !isValidSpice(spice)) {
      return res.status(400).json({ success: false, message: `spice must be one of: ${SPICE_OPTIONS.join(', ')}` });
    }

    const updates = { ...req.body };
    if (price !== undefined) updates.price = Number(price);
    if (req.body.perDay !== undefined) updates.perDay = Number(req.body.perDay);
    delete updates.cookId; // never reassign owner

    const item = await menuService.updateMenu(id, updates);
    return res.json({ success: true, message: 'Menu item updated', data: item });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/kitchen/menu/:id/availability — turn a menu item on/off */
export const toggleAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = getCookId(req);
    if (!cookId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = req.params.id as string;
    const existing = await menuService.findMenuById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Menu item not found' });
    if (existing.cookId !== cookId) {
      return res.status(403).json({ success: false, message: 'Not your menu item' });
    }

    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isAvailable (boolean) is required' });
    }

    const item = await menuService.setAvailability(id, isAvailable);
    return res.json({
      success: true,
      message: isAvailable ? 'Menu item turned ON' : 'Menu item turned OFF',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/kitchen/menu/:id — delete a menu item (must belong to this kitchen) */
export const removeMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = getCookId(req);
    if (!cookId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = req.params.id as string;
    const existing = await menuService.findMenuById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Menu item not found' });
    if (existing.cookId !== cookId) {
      return res.status(403).json({ success: false, message: 'Not your menu item' });
    }

    await menuService.deleteMenu(id);
    return res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
};
