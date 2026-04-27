import { Router, Request, Response } from 'express';
import { pushNotificationService } from '../services/push-notification-service';

const router = Router();

// Save push token for a user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    await pushNotificationService.savePushToken(userId, token);
    
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
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

export default router;
