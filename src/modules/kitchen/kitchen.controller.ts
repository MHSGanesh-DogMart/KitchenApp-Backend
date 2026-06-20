import { Request, Response, NextFunction } from 'express';

/**
 * Get live orders for active kitchen.
 */
export const getLiveOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'ord_1001',
          customerId: 'user_01',
          items: [
            { id: 'dish_01', name: 'Hyderabadi Chicken Biryani Thali', qty: 2, price: 290 }
          ],
          totalAmount: 580,
          status: 'PLACED',
          notes: 'Make it spicy, please!',
          placedAt: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order lifecycle status.
 */
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED_BY_CHEF'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        id,
        status,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current kitchen partner profile.
 */
export const getKitchenProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        id: 'cook_01',
        name: 'Aroma Kitchen',
        chefName: 'Lakshmi Prasad',
        phone: '+919988776655',
        tier: 'Tier 1',
        isOnline: true,
        fssai: {
          number: '23624003000124',
          status: 'VERIFIED',
          expiry: '2027-12-31'
        },
        ratings: 4.8,
        monthlyOrders: 142
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle active online status of the kitchen.
 */
export const toggleOnline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isOnline boolean is required' });
    }
    return res.status(200).json({
      success: true,
      message: `Kitchen is now ${isOnline ? 'Online' : 'Offline'}`,
      data: {
        id: 'cook_01',
        isOnline
      }
    });
  } catch (error) {
    next(error);
  }
};
