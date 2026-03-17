import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../config/firebase';
import pool from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    userId: string;
  };
}

export async function authenticateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    const decodedToken = await getFirebaseAuth().verifyIdToken(token);

    const result = await pool.query(
      'SELECT id, firebase_uid, email FROM users WHERE firebase_uid = $1 AND is_active = true',
      [decodedToken.uid]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || user.email,
      userId: user.id,
    };

    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getFirebaseAuth().verifyIdToken(token);

    const result = await pool.query(
      'SELECT id, firebase_uid, email FROM users WHERE firebase_uid = $1 AND is_active = true',
      [decodedToken.uid]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || user.email,
        userId: user.id,
      };
    }

    next();
  } catch (error) {
    next();
  }
}
