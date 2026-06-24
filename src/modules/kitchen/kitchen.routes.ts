import express from 'express';
import { verifyToken } from '../../auth';
import * as kitchenCtrl from './kitchen.controller';

const router = express.Router();

// --- Public Endpoints ---
router.post('/kitchen/auth/otp/send', kitchenCtrl.sendOtp);
router.post('/kitchen/auth/otp/verify', kitchenCtrl.verifyOtp);
router.post('/kitchen/register', kitchenCtrl.submitOnboarding);
router.post('/kitchen/upload', kitchenCtrl.upload);
router.get('/kitchen/cuisines', kitchenCtrl.getCuisines);

// --- Protected Endpoints (Token Verification Required) ---
router.get('/kitchen/details', verifyToken, kitchenCtrl.getKitchenDetails);
router.post('/kitchen/reapply', verifyToken, kitchenCtrl.reapplyOnboarding);
router.get('/kitchen/status', verifyToken, kitchenCtrl.getKitchenStatus);
router.post('/kitchen/fcm-token', verifyToken, kitchenCtrl.updateFcmToken);

export default router;
