import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import adminRoutes from './modules/admin/admin.routes';
import kitchenRoutes from './modules/kitchen/kitchen.routes';
import userRoutes from './modules/user/user.routes';
import { setupAdminSwagger } from './modules/admin/swagger';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Register module routes
app.use('/api', adminRoutes);
app.use('/api', kitchenRoutes);
app.use('/api', userRoutes);

// Swagger UI for admin
setupAdminSwagger(app);

app.get('/', (_req, res) => {
  res.send('Padosi Backend is running');
});

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'OK', message: 'API service is healthy' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
