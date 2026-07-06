import { Router } from 'express';
import {
  getDashboardStats,
  getPendingCooks,
  getUsers,
  updateUserStatus,
  getOrders,
  verifyCook,
  runPayoutCycle,
  adminLogin,
  forgotPassword,
  getCooks,
  updateFssai,
  getConfig,
  updateConfig,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCookById,
  deleteCook,
  getCuisines,
  getCuisineById,
  createCuisine,
  updateCuisine,
  deleteCuisine,
} from './admin.controller';

const router = Router();

// Dashboard Stats & Onboarding Verification
router.get('/dashboard/stats', getDashboardStats);
router.get('/cooks/pending', getPendingCooks);

// Customers (User table)
router.get('/users', getUsers);
router.get('/admin/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/admin/users/:id/status', updateUserStatus);

// Orders (cross-kitchen ledger)
router.get('/orders', getOrders);
router.get('/admin/orders', getOrders);
router.post('/cooks/:id/verify', verifyCook);
router.post('/payouts/run', runPayoutCycle);

// Admin Authentication
router.post('/auth/login', adminLogin);
router.post('/auth/forgot-password', forgotPassword);

// Cooks Management
router.get('/cooks', getCooks);
router.get('/cooks/:id', getCookById);
router.post('/cooks/:id/fssai-update', updateFssai);
router.delete('/cooks/:id', deleteCook);

// Platform Configuration
router.get('/config', getConfig);
router.get('/admin/config', getConfig);
router.put('/config', updateConfig);
router.put('/admin/config', updateConfig);

// Coupon Management
router.get('/coupons', getCoupons);
router.get('/admin/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.post('/admin/coupons', createCoupon);
router.put('/coupons/:code', updateCoupon);
router.put('/admin/coupons/:code', updateCoupon);
router.delete('/coupons/:code', deleteCoupon);
router.delete('/admin/coupons/:code', deleteCoupon);

// Cuisine Management
router.get('/cuisines', getCuisines);
router.get('/admin/cuisines', getCuisines);
router.get('/cuisines/:id', getCuisineById);
router.get('/admin/cuisines/:id', getCuisineById);
router.post('/cuisines', createCuisine);
router.post('/admin/cuisines', createCuisine);
router.put('/cuisines/:id', updateCuisine);
router.put('/admin/cuisines/:id', updateCuisine);
router.delete('/cuisines/:id', deleteCuisine);
router.delete('/admin/cuisines/:id', deleteCuisine);

export default router;
