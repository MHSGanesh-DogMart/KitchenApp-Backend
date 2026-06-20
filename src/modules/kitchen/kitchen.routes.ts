import { Router } from 'express';
import { getLiveOrders, updateOrderStatus, getKitchenProfile, toggleOnline } from './kitchen.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen API
 *   description: Endpoints for the Padosi Partner / Kitchen Application
 */

/**
 * @swagger
 * /api/kitchen/profile:
 *   get:
 *     summary: Fetch active kitchen profile details
 *     tags: [Kitchen API]
 *     responses:
 *       200:
 *         description: Kitchen profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/profile', getKitchenProfile);

/**
 * @swagger
 * /api/kitchen/orders/live:
 *   get:
 *     summary: List incoming live orders for active kitchen
 *     tags: [Kitchen API]
 *     responses:
 *       200:
 *         description: Live orders queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 */
router.get('/orders/live', getLiveOrders);

/**
 * @swagger
 * /api/kitchen/orders/{id}/status:
 *   post:
 *     summary: Update state of an order in the lifecycle
 *     tags: [Kitchen API]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, COOKING, READY_FOR_PICKUP, DELIVERED, CANCELLED_BY_CHEF]
 *                 example: "COOKING"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid parameters or state transition
 */
router.post('/orders/:id/status', updateOrderStatus);

/**
 * @swagger
 * /api/kitchen/toggle-online:
 *   patch:
 *     summary: Toggle kitchen availability status
 *     tags: [Kitchen API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isOnline
 *             properties:
 *               isOnline:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Availability status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.patch('/toggle-online', toggleOnline);

export default router;
