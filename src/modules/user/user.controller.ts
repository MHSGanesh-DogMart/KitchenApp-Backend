import { Request, Response, NextFunction } from 'express';

/**
 * Send OTP to user phone number.
 */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    // Mock OTP logic
    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${phone}`,
      data: { tempId: 'otp_temp_12345' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP code.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone and OTP code are required' });
    }
    // Mock validation
    if (code !== '1234' && code !== '4321') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token: 'mock_jwt_token_for_user_abc123',
        user: {
          id: 'user_01',
          name: 'Jane Doe',
          phone,
          email: 'jane.doe@example.com',
          coins: 50
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        id: 'user_01',
        name: 'Jane Doe',
        phone: '+919876543210',
        email: 'jane.doe@example.com',
        dob: '1995-08-12',
        coins: 50,
        savedAddresses: [
          { id: 'addr_01', label: 'Home', line1: 'Madhapur', lat: 17.4483, lng: 78.3741, isDefault: true }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby verified home cooks.
 */
export const getCooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'cook_01',
          name: 'Aroma Kitchen (Chef Lakshmi)',
          rating: 4.8,
          tier: 'Tier 1',
          distance: '1.2 km',
          eta: '30-45 mins',
          fssai: '23624003000124',
          dishes: [
            { id: 'dish_01', name: 'Hyderabadi Chicken Biryani Thali', price: 290, image: 'https://example.com/biryani.jpg', available: true },
            { id: 'dish_02', name: 'Veg Meals Thali', price: 180, image: 'https://example.com/vegmeals.jpg', available: true }
          ]
        },
        {
          id: 'cook_02',
          name: 'Pista House - Local Style (Chef Ahmed)',
          rating: 4.6,
          tier: 'Tier 2',
          distance: '2.5 km',
          eta: '35-50 mins',
          fssai: '13621004000392',
          dishes: [
            { id: 'dish_03', name: 'Double Ka Meetha', price: 120, image: 'https://example.com/sweet.jpg', available: true }
          ]
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};
