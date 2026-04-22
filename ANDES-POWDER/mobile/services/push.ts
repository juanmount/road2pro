import api from '../config/api';

export const pushService = {
  async registerToken(userId: string, token: string): Promise<void> {
    try {
      await api.post('/push/register', { userId, token });
      console.log('[PUSH API] Token registered successfully');
    } catch (error) {
      console.error('[PUSH API] Error registering token:', error);
      throw error;
    }
  },

  async sendTestNotification(userId: string): Promise<void> {
    try {
      await api.post('/push/test', { userId });
      console.log('[PUSH API] Test notification sent');
    } catch (error) {
      console.error('[PUSH API] Error sending test notification:', error);
      throw error;
    }
  },
};
