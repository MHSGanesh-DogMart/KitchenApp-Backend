import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'padosi_backend_jwt_secret';
const OTP_CODE = '1234'; // dummy OTP

/** Generate JWT for a given user id and role */
export function generateToken(userId: string, role: 'admin' | 'kitchen' | 'user'): string {
  const payload = { sub: userId, role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/** Verify JWT and attach user info to request */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or malformed token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    (req as any).user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/** Dummy OTP login endpoint for kitchen and user */
export async function otpLogin(req: Request, res: Response) {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }
  if (otp !== OTP_CODE) {
    return res.status(401).json({ success: false, message: 'Invalid OTP' });
  }
  // In a real system we would lookup/create the user. Here we generate a token.
  const token = generateToken(phone, 'kitchen');
  return res.status(200).json({ success: true, token });
}
