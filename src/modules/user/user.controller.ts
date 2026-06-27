import { Request, Response, NextFunction } from 'express';
import * as userService from '../../services/userService';
import * as cuisineService from '../../services/cuisineService';
import { generateToken } from '../../auth';

/** Get public customer profile (limited fields) */
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.findUserById(req.params.id as string);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { id, name, email, phone } = user;
    return res.json({ success: true, data: { id, name, email, phone } });
  } catch (error) {
    next(error);
  }
};

/** Update customer profile (name / email) */
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await userService.findUserById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    const { name, email, fcmToken } = req.body;
    const saved = await userService.updateUser(id, { name, email, fcmToken });
    return res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
};

/** Request OTP for a customer (dummy code 1234) */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone } = req.body;
    const phoneNum = mobileNumber || phone;
    if (!phoneNum) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    console.log(`[OTP] Sent verification OTP code 1234 to customer: ${phoneNum}`);
    return res.json({
      success: true,
      message: 'OTP sent successfully (Code: 1234)',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify customer OTP. On first verification the customer account is
 * created from the supplied name + email. Returning customers just log in.
 * This User record is independent of any Cook (kitchen) record on the same phone.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone, otp, code, fcmToken, name, email } = req.body;
    const phoneNum = mobileNumber || phone;
    const otpCode = otp || code;

    if (!phoneNum || !otpCode) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP code are required' });
    }
    if (otpCode !== '1234') {
      return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    }

    let user = await userService.findUserByPhone(phoneNum);
    const isRegistered = !!user;

    if (!user) {
      // New customer → require a name to create the account
      if (!name || !name.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Name is required to create your account' });
      }
      user = await userService.createUser({
        name: name.toString(),
        phone: phoneNum,
        email: email?.toString(),
        fcmToken: fcmToken,
      });
    } else if (fcmToken) {
      user = await userService.updateFcmToken(user.id, fcmToken);
    }

    const token = generateToken(user.id, 'user');
    return res.json({
      success: true,
      message: isRegistered ? 'Welcome back!' : 'Account created successfully',
      data: {
        token,
        isRegistered,
        status: user.status,
        user,
      },
    });
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
