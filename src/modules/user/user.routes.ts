import express from 'express';
import { verifyToken } from '../../auth';
import * as userCtrl from './user.controller';

const router = express.Router();

// Public customer auth via OTP (two-step: send + verify)
router.post('/user/auth/otp/send', userCtrl.sendOtp);
router.post('/user/auth/otp/verify', userCtrl.verifyOtp);

// Public endpoint to fetch a user profile (no auth required for demo)
router.get('/user/profile/:id', userCtrl.getUserProfile);

// Public cuisines list for customer app
router.get('/user/cuisines', userCtrl.getCuisines);

// Protected endpoint to update user profile
router.put('/user/profile/:id', verifyToken, userCtrl.updateUserProfile);

export default router;
