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
      console.log('No auth header provided for:', req.path);
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Verifying token for:', req.path, 'Token length:', token?.length);

    const decodedToken = await getFirebaseAuth().verifyIdToken(token);
    console.log('Token verified successfully for UID:', decodedToken.uid);

    let result = await pool.query(
      'SELECT id, firebase_uid, email FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    // If user doesn't exist in database, create it automatically
    if (result.rows.length === 0) {
      console.log('User not found in database, creating automatically:', decodedToken.uid);
      
      try {
        // First, ensure UUID extension is enabled
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        
        const insertResult = await pool.query(
          `INSERT INTO users (firebase_uid, email, display_name, last_login_at, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW(), NOW())
           RETURNING id, firebase_uid, email`,
          [decodedToken.uid, decodedToken.email, decodedToken.name || null]
        );
        
        // Create user preferences
        await pool.query(
          'INSERT INTO user_preferences (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW())',
          [insertResult.rows[0].id]
        );
        
        result = insertResult;
        console.log('User created successfully:', insertResult.rows[0].id);
      } catch (insertError: any) {
        console.error('Error creating user:', insertError);
        console.error('Error details:', insertError.message, insertError.code);
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }
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
  } catch (error: any) {
    console.error('Authentication error for:', req.path);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
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
      'SELECT id, firebase_uid, email FROM users WHERE firebase_uid = $1',
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
