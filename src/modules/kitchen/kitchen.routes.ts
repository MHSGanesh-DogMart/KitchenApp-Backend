import express from 'express';
import { verifyToken } from '../../auth';
import * as kitchenCtrl from './kitchen.controller';
import * as menuCtrl from './menu.controller';
import * as orderCtrl from './order.controller';

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

// --- Menu management (kitchen-scoped, token required) ---
router.get('/kitchen/menu', verifyToken, menuCtrl.getMyMenus);
router.post('/kitchen/menu', verifyToken, menuCtrl.addMenu);
router.put('/kitchen/menu/:id', verifyToken, menuCtrl.editMenu);
router.patch('/kitchen/menu/:id/availability', verifyToken, menuCtrl.toggleAvailability);
router.delete('/kitchen/menu/:id', verifyToken, menuCtrl.removeMenu);

// --- Kitchen open/close (accepting orders) ---
router.patch('/kitchen/availability', verifyToken, orderCtrl.setAvailability);

// --- Orders (kitchen-scoped, token required) ---
router.get('/kitchen/summary', verifyToken, orderCtrl.getSummary);
router.get('/kitchen/orders', verifyToken, orderCtrl.listOrders);
router.get('/kitchen/orders/:id', verifyToken, orderCtrl.getOrder);
router.patch('/kitchen/orders/:id/accept', verifyToken, orderCtrl.acceptOrder);
router.patch('/kitchen/orders/:id/reject', verifyToken, orderCtrl.rejectOrder);
router.patch('/kitchen/orders/:id/status', verifyToken, orderCtrl.updateStatus);

export default router;
