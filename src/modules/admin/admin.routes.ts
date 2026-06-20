import { Router } from 'express';
import { getDashboardStats, getPendingCooks, verifyCook, runPayoutCycle } from './admin.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin API
 *   description: Endpoints for the Padosi Operations & Admin Web Panel
 */

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Fetch high-level admin dashboard statistics
 *     tags: [Admin API]
 *     responses:
 *       200:
 *         description: Dashboard stats summary
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
router.get('/dashboard/stats', getDashboardStats);

/**
 * @swagger
 * /api/admin/cooks/pending:
 *   get:
 *     summary: Get list of chefs awaiting FSSAI / identity verification
 *     tags: [Admin API]
 *     responses:
 *       200:
 *         description: Array of pending onboarding applications
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
router.get('/cooks/pending', getPendingCooks);

/**
 * @swagger
 * /api/admin/cooks/{id}/verify:
 *   post:
 *     summary: Approve or reject chef onboarding application
 *     tags: [Admin API]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Cook ID to verify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approve
 *             properties:
 *               approve:
 *                 type: boolean
 *                 example: true
 *               reason:
 *                 type: string
 *                 example: "FSSAI registration expired"
 *     responses:
 *       200:
 *         description: Cook verification status updated successfully
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
 *         description: Missing fields
 */
router.post('/cooks/:id/verify', verifyCook);

/**
 * @swagger
 * /api/admin/payouts/run:
 *   post:
 *     summary: Execute weekly payouts run cycle manually
 *     tags: [Admin API]
 *     responses:
 *       200:
 *         description: Payout run executed successfully
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
router.post('/payouts/run', runPayoutCycle);

export default router;
