import { Request, Response, NextFunction } from 'express';

/**
 * Get dashboard stats for Admin Panel.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        gmv: 4528000, // in paise = 45,280 INR
        activeOrders: 18,
        activeCooks: 84,
        totalCustomers: 1204,
        settledPayouts: 2317300,
        refundPool: {
          allocated: 1000000,
          spent: 24000
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List chefs awaiting admin verification.
 */
export const getPendingCooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'cook_03',
          name: 'Home Delights (Chef Priya)',
          phone: '+919900990099',
          tier: 'Tier 1',
          appliedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 36 hours ago
          documents: {
            pan: { number: 'ABCDE1234F', verified: true },
            aadhaar: { number: '123456789012', verified: true },
            fssai: { number: '23624003000999', verified: false }
          }
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a cook registration.
 */
export const verifyCook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { approve, reason } = req.body;

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Approve boolean is required' });
    }

    return res.status(200).json({
      success: true,
      message: `Chef registration ${approve ? 'APPROVED' : 'REJECTED'}`,
      data: {
        cookId: id,
        status: approve ? 'ACTIVE' : 'REJECTED',
        reason: approve ? undefined : reason,
        reviewedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Run weekly payout cycle.
 */
export const runPayoutCycle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Settlement payout run cycle executed successfully',
      data: {
        cycleId: 'payout_cycle_2026_w25',
        totalProcessed: 2317300,
        recipientsCount: 42,
        failedCount: 0,
        executedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};
