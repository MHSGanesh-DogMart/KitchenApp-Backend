import { Router } from 'express';
import { sendOtp, verifyOtp, getProfile, getCooks } from './user.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User API
 *   description: Endpoints for the Padosi Customer / User Application
 */

/**
 * @swagger
 * /api/user/auth/otp/send:
 *   post:
 *     summary: Request OTP validation
 *     tags: [User API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP code generated and sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully to +919876543210"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tempId:
 *                       type: string
 *                       example: "otp_temp_12345"
 *       400:
 *         description: Missing fields
 */
router.post('/auth/otp/send', sendOtp);

/**
 * @swagger
 * /api/user/auth/otp/verify:
 *   post:
 *     summary: Verify OTP code
 *     tags: [User API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               code:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Auth Token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       400:
 *         description: Invalid parameters or wrong OTP code
 */
router.post('/auth/otp/verify', verifyOtp);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Fetch current user profile details
 *     tags: [User API]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile data
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
router.get('/profile', getProfile);

/**
 * @swagger
 * /api/user/cooks:
 *   get:
 *     summary: Get verified cooks in 5 km radius
 *     tags: [User API]
 *     responses:
 *       200:
 *         description: Array of nearby home cooks
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
router.get('/cooks', getCooks);

export default router;
