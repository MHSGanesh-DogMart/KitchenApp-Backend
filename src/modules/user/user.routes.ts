import express from 'express';
import { verifyToken } from '../../auth';
import * as userCtrl from './user.controller';

const router = express.Router();

// Public customer auth via OTP (two-step: send + verify)
router.post('/user/auth/otp/send', userCtrl.sendOtp);
router.post('/user/auth/otp/verify', userCtrl.verifyOtp);

// Customer's OWN profile — id comes from the token (no id in path)
router.get('/user/me', verifyToken, userCtrl.getMyProfile);
router.put('/user/me', verifyToken, userCtrl.updateMyProfile);
router.post('/user/upload', verifyToken, userCtrl.uploadProfileImage);

// Public cuisines list for customer app
router.get('/user/cuisines', userCtrl.getCuisines);

// Customer home feed (token required → returns greeting name; lat/lng + optional cuisineId)
router.get('/user/home', verifyToken, userCtrl.getHome);

// Browse kitchens & dishes (token required)
router.get('/user/kitchens', verifyToken, userCtrl.listKitchens);
router.get('/user/kitchens/:id', verifyToken, userCtrl.getKitchenById);
router.get('/user/kitchens/:id/menu', verifyToken, userCtrl.getKitchenMenu);
router.get('/user/dishes', verifyToken, userCtrl.listDishes);
router.get('/user/dishes/:id', verifyToken, userCtrl.getDishById);

export default router;
