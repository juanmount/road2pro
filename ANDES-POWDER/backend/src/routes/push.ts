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

    // For development: just log the token, don't save to database yet
    console.log(`[PUSH] Token registered for user ${userId}: ${token}`);
    
    res.json({ success: true, message: 'Push token registered (dev mode)' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Send test notification to a user
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await pushNotificationService.sendToUser(userId, {
      title: '🎿 Andes Powder Test',
      body: 'Las notificaciones están funcionando correctamente!',
      data: { type: 'test' },
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
