import { Router, Request, Response } from 'express';
import { pushNotificationService } from '../services/push-notification-service';
import pool from '../config/database';

const router = Router();

// Save push token for a user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body;

    console.log('[PUSH REGISTER] Received request:', { userId, token });

    if (!userId || !token) {
      console.log('[PUSH REGISTER] Missing userId or token');
      return res.status(400).json({ error: 'userId and token are required' });
    }

    await pushNotificationService.savePushToken(userId, token);
    
    console.log('[PUSH REGISTER] Token saved successfully');
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('[PUSH REGISTER] Error:', error);
    res.status(500).json({ error: 'Failed to register push token', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Send test notification to a user
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await pushNotificationService.sendToUser(
      userId,
      title || '🌨️ Test Notification',
      body || 'This is a test push notification from Andes Powder',
      { type: 'test' }
    );

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get stats about registered tokens
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const activeTokens = await pushNotificationService.getActiveTokenCount();
    
    res.json({
      success: true,
      activeTokens,
      message: `${activeTokens} active push tokens registered`
    });
  } catch (error) {
    console.error('Error getting push stats:', error);
    res.status(500).json({ error: 'Failed to get push stats' });
  }
});

// Update notification preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const { token, preferences } = req.body;

    if (!token || !preferences) {
      return res.status(400).json({ error: 'token and preferences are required' });
    }

    // Get user_id from token
    const tokenResult = await pool.query(
      `SELECT user_id FROM push_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const userId = tokenResult.rows[0].user_id;

    // Upsert preferences
    await pool.query(`
      INSERT INTO user_preferences (
        user_id, snow_alerts, storm_alerts, wind_alerts,
        min_snowfall_cm, require_high_confidence, min_wind_speed_kmh,
        favorite_resorts, all_resorts, advance_notice_days,
        quiet_hours_enabled, quiet_hours_start, quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        snow_alerts = $2,
        storm_alerts = $3,
        wind_alerts = $4,
        min_snowfall_cm = $5,
        require_high_confidence = $6,
        min_wind_speed_kmh = $7,
        favorite_resorts = $8,
        all_resorts = $9,
        advance_notice_days = $10,
        quiet_hours_enabled = $11,
        quiet_hours_start = $12,
        quiet_hours_end = $13
    `, [
      userId,
      preferences.snowAlerts,
      preferences.stormAlerts,
      preferences.windAlerts,
      preferences.minSnowfallCm,
      preferences.requireHighConfidence,
      preferences.minWindSpeedKmh,
      preferences.favoriteResorts || [],
      preferences.allResorts,
      preferences.advanceNoticeDays,
      preferences.quietHoursEnabled,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
    ]);

    res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
