import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';

import userRoutes from './modules/user/user.routes';
import kitchenRoutes from './modules/kitchen/kitchen.routes';
import adminRoutes from './modules/admin/admin.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend clients
app.use(cors());
app.use(express.json());

// Swagger UI mount
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verify API service status
 *     responses:
 *       200:
 *         description: Server is online and functional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// App Router routes
app.use('/api/user', userRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`===============================================`);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📘 Swagger docs available at http://localhost:${port}/api-docs`);
  if (process.env.NGROK_URL) {
    console.log(`🔗 Public Ngrok docs: ${process.env.NGROK_URL}/api-docs`);
  }
  console.log(`===============================================`);
});

export default app;
