import express from 'express';
import { verifyToken } from '../../auth';
import * as userCtrl from './user.controller';
import * as cartCtrl from './cart.controller';

const router = express.Router();

// Public customer auth via OTP (two-step: send + verify)
router.post('/user/auth/otp/send', userCtrl.sendOtp);
router.post('/user/auth/otp/verify', userCtrl.verifyOtp);

// Customer's OWN profile — id comes from the token (no id in path)
router.get('/user/me', verifyToken, userCtrl.getMyProfile);
router.put('/user/me', verifyToken, userCtrl.updateMyProfile);
router.post('/user/upload', verifyToken, userCtrl.uploadProfileImage);

// FCM device token (append, supports multiple devices), logout, delete account
router.post('/user/fcm-token', verifyToken, userCtrl.updateFcmToken);
router.post('/user/logout', verifyToken, userCtrl.logout);
router.delete('/user/account', verifyToken, userCtrl.deleteAccount);

// Public cuisines + coupons list for customer app
router.get('/user/cuisines', userCtrl.getCuisines);
router.get('/user/coupons', userCtrl.getCoupons);

// Customer home feed (token required → returns greeting name; lat/lng + optional cuisineId)
router.get('/user/home', verifyToken, userCtrl.getHome);

// Browse kitchens & dishes (token required)
router.get('/user/kitchens', verifyToken, userCtrl.listKitchens);
router.get('/user/kitchens/:id', verifyToken, userCtrl.getKitchenById);
router.get('/user/kitchens/:id/menu', verifyToken, userCtrl.getKitchenMenu);
router.get('/user/dishes', verifyToken, userCtrl.listDishes);
router.get('/user/dishes/:id', verifyToken, userCtrl.getDishById);

// Cart (server-side, single-kitchen; token required)
router.get('/user/cart', verifyToken, cartCtrl.getCart);
router.post('/user/cart/add', verifyToken, cartCtrl.addItem);
router.post('/user/cart/increment', verifyToken, cartCtrl.incrementItem);
router.post('/user/cart/decrement', verifyToken, cartCtrl.decrementItem);
router.delete('/user/cart/item/:menuItemId', verifyToken, cartCtrl.removeItem);
router.post('/user/cart/coupon', verifyToken, cartCtrl.applyCoupon);
router.delete('/user/cart/coupon', verifyToken, cartCtrl.removeCoupon);
router.delete('/user/cart', verifyToken, cartCtrl.clearCart);

// Wishlist / favourites (token required)
router.get('/user/wishlist', verifyToken, userCtrl.getWishlist);
router.post('/user/wishlist', verifyToken, userCtrl.addWishlist);
router.delete('/user/wishlist/:type/:targetId', verifyToken, userCtrl.removeWishlist);

export default router;
