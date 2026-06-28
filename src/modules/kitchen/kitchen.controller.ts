import { Request, Response, NextFunction } from 'express';
import * as cookService from '../../services/cookService';
import * as cuisineService from '../../services/cuisineService';
import { generateToken } from '../../auth';
import multer from 'multer';
import { uploadToFirebase, initFirebase } from '../../services/firebaseStorage';

// Initialise Firebase Admin SDK at startup
initFirebase();

// ── Multer memory storage — accepts any field name the client sends ──────────
export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
}).any(); // Accepts: "file", "image", "banner", "photo", etc.

/** Request OTP for kitchen users */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone } = req.body;
    const phoneNum = mobileNumber || phone;
    if (!phoneNum) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    // Log OTP sending dynamically
    console.log(`[OTP] Sent verification OTP code 1234 to phone: ${phoneNum}`);
    return res.json({
      success: true,
      message: 'OTP sent successfully (Code: 1234)'
    });
  } catch (error) {
    next(error);
  }
};

/** Verify OTP code and check if cook exists */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone, otp, code, fcmToken } = req.body;
    const phoneNum = mobileNumber || phone;
    const otpCode = otp || code;

    if (!phoneNum || !otpCode) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP code are required' });
    }
    if (otpCode !== '1234') {
      return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    }

    const cook = await cookService.findCookByPhone(phoneNum);
    if (cook) {
      // Append this device's FCM token if provided on verification
      if (fcmToken) {
        await cookService.updateFcmToken(cook.id, fcmToken);
      }
      const token = generateToken(cook.id, 'kitchen');
      return res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          token,
          isRegistered: true,
          status: cook.status,
          cook
        }
      });
    } else {
      // Cook does not exist yet -> isRegistered is false
      return res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          token: null,
          isRegistered: false,
          status: 'NEW',
          cook: null
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/** Submit onboarding registration for a new cook */
export const submitOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, name } = req.body;
    if (!phone || !name) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    // Check if cook already exists to prevent duplicate onboarding
    let cook = await cookService.findCookByPhone(phone);
    if (cook) {
      return res.status(400).json({ success: false, message: 'Chef is already registered with this phone number' });
    }

    // Create the cook in SQLite
    const payload = {
      ...req.body,
      status: 'Kitchen_Pending' // Initial state on onboarding completion
    };

    cook = await cookService.createCook(payload);
    const token = generateToken(cook.id, 'kitchen');

    return res.status(200).json({
      success: true,
      message: 'Onboarding registration completed successfully',
      data: {
        token,
        status: cook.status,
        cook
      }
    });
  } catch (error) {
    next(error);
  }
};

/** Get onboarding registration details for the authenticated cook */
export const getKitchenDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = (req as any).user?.id;
    if (!cookId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const cook = await cookService.findCookById(cookId);
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook profile not found' });
    }
    return res.json({
      success: true,
      data: {
        cook
      }
    });
  } catch (error) {
    next(error);
  }
};

/** Reapply onboarding registration details for an existing cook (e.g. if rejected) */
export const reapplyOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = (req as any).user?.id;
    if (!cookId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const existingCook = await cookService.findCookById(cookId);
    if (!existingCook) {
      return res.status(404).json({ success: false, message: 'Cook profile not found' });
    }

    // Merge existing cook fields with incoming body, keeping same ID, and resetting status
    const updatedData = {
      ...existingCook,
      ...req.body,
      id: cookId,
      status: 'Kitchen_Pending'
    };

    const updatedCook = await cookService.upsertCook(updatedData);

    return res.json({
      success: true,
      message: 'Reapplied onboarding registration successfully',
      data: {
        status: updatedCook.status,
        cook: updatedCook
      }
    });
  } catch (error) {
    next(error);
  }
};

/** Upload image/document attachment → Firebase Storage */
export const upload = (req: Request, res: Response, next: NextFunction) => {
  multerUpload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ success: false, message: 'File upload failed.' });
    }

    // .any() puts files in req.files (array); grab the first one regardless of field name
    const files = req.files as Express.Multer.File[] | undefined;
    const uploadedFile = files && files.length > 0 ? files[0] : undefined;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No file received. Send the image as multipart/form-data (any field name).',
      });
    }

    console.log(`[UPLOAD] Field: "${uploadedFile.fieldname}" | File: ${uploadedFile.originalname} | ${uploadedFile.size} bytes`);

    try {
      const fileUrl = await uploadToFirebase(
        uploadedFile.buffer,
        uploadedFile.originalname || 'upload.jpg',
        uploadedFile.mimetype || 'image/jpeg',
        'kitchen-uploads'
      );

      return res.json({
        success: true,
        fileName: uploadedFile.originalname,
        fileUrl,
      });
    } catch (uploadErr: any) {
      console.error('[UPLOAD ERROR]', uploadErr);
      return res.status(500).json({
        success: false,
        message: uploadErr.message || 'Failed to upload file to Firebase Storage.',
      });
    }
  });
};

/** Get the current cook status */
export const getKitchenStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = (req as any).user?.id;
    if (!cookId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const cook = await cookService.findCookById(cookId);
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook profile not found' });
    }
    return res.json({
      success: true,
      status: cook.status
    });
  } catch (error) {
    next(error);
  }
};

/** Update FCM push token */
export const updateFcmToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookId = (req as any).user?.id;
    if (!cookId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }
    const updated = await cookService.updateFcmToken(cookId, fcmToken);
    return res.json({
      success: true,
      message: 'FCM token updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/** Keep existing placeholder endpoints if needed by other components */
export const getCookById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cook = await cookService.findCookById(req.params.id as string);
    if (!cook) return res.status(404).json({ success: false, message: 'Cook not found' });
    return res.json({ success: true, data: cook });
  } catch (error) {
    next(error);
  }
};

export const updateFssaiLicense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await cookService.updateFssai(req.params.id as string, req.body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/** Get active cuisines list (public) */
export const getCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisines = await cuisineService.listCuisines(undefined, true);
    return res.json({ success: true, data: cuisines });
  } catch (error) {
    next(error);
  }
};
