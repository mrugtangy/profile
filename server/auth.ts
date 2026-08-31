import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getDbAdapter, loadDbConfig } from './db/index.js';
import { AdminUser } from './db/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'app_jwt_secret_key_123456789_super_secure';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { id: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string };
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const db = await getDbAdapter();
    const admin = await db.getAdminById(decoded.id);

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized: Administrator account not found' });
    }

    if (!admin.enabled) {
      return res.status(403).json({ error: 'Forbidden: Administrator account is disabled' });
    }

    req.user = admin;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Authentication error' });
  }
}
