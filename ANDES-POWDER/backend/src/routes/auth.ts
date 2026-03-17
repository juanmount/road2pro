import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { getFirebaseAuth } from '../config/firebase';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { firebaseUid, email, displayName } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Firebase UID and email are required' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name, last_login_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, firebase_uid, email, display_name, created_at`,
      [firebaseUid, email, displayName || null]
    );

    const user = result.rows[0];

    await pool.query(
      'INSERT INTO user_preferences (user_id) VALUES ($1)',
      [user.id]
    );

    res.status(201).json({
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/me', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.firebase_uid, u.email, u.display_name, u.photo_url, 
              u.created_at, u.last_login_at,
              up.notifications_enabled, up.powder_alert_threshold, 
              up.preferred_elevation, up.temperature_unit
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      displayName: user.display_name,
      photoUrl: user.photo_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      preferences: {
        notificationsEnabled: user.notifications_enabled,
        powderAlertThreshold: user.powder_alert_threshold,
        preferredElevation: user.preferred_elevation,
        temperatureUnit: user.temperature_unit,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.patch('/me', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, photoUrl } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(displayName);
    }

    if (photoUrl !== undefined) {
      updates.push(`photo_url = $${paramCount++}`);
      values.push(photoUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user!.userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, firebase_uid, email, display_name, photo_url`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.patch('/me/preferences', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      notificationsEnabled, 
      powderAlertThreshold, 
      preferredElevation,
      temperatureUnit 
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (notificationsEnabled !== undefined) {
      updates.push(`notifications_enabled = $${paramCount++}`);
      values.push(notificationsEnabled);
    }

    if (powderAlertThreshold !== undefined) {
      updates.push(`powder_alert_threshold = $${paramCount++}`);
      values.push(powderAlertThreshold);
    }

    if (preferredElevation !== undefined) {
      updates.push(`preferred_elevation = $${paramCount++}`);
      values.push(preferredElevation);
    }

    if (temperatureUnit !== undefined) {
      updates.push(`temperature_unit = $${paramCount++}`);
      values.push(temperatureUnit);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No preferences to update' });
    }

    values.push(req.user!.userId);

    const result = await pool.query(
      `UPDATE user_preferences 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
