import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import pool from '../config/database';

interface PushToken {
  userId: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PushNotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  /**
   * Save or update a user's push notification token
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      // Validate token format
      if (!Expo.isExpoPushToken(token)) {
        console.error(`[PUSH] Invalid Expo push token: ${token}`);
        return;
      }

      // Upsert token in database (PostgreSQL syntax)
      await pool.query(
        `INSERT INTO push_tokens (user_id, token, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (token) 
         DO UPDATE SET user_id = $1, updated_at = NOW()`,
        [userId, token]
      );

      console.log(`[PUSH] Token registered for user ${userId}`);
    } catch (error) {
      console.error('[PUSH] Error saving push token:', error);
      throw error;
    }
  }

  /**
   * Send push notification to users in specific regions
   */
  async sendAlertNotification(
    title: string,
    body: string,
    affectedRegions: string[],
    alertId: string,
    severity: 'low' | 'moderate' | 'high' | 'extreme'
  ): Promise<void> {
    try {
      // Get all active push tokens
      const result = await pool.query(
        `SELECT DISTINCT token FROM push_tokens WHERE updated_at > NOW() - INTERVAL '30 days'`
      );
      
      const tokens = (result.rows as any[]).map(row => row.token);
      
      if (tokens.length === 0) {
        console.log('[PUSH] No active tokens found');
        return;
      }

      console.log(`[PUSH] Sending alert to ${tokens.length} devices`);

      // Prepare messages
      const messages: ExpoPushMessage[] = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          alertId,
          severity,
          affectedRegions,
          type: 'weather_alert'
        },
        priority: severity === 'extreme' || severity === 'high' ? 'high' : 'default',
        badge: 1
      }));

      // Send in batches (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('[PUSH] Error sending chunk:', error);
        }
      }

      // Log results
      const successCount = tickets.filter(t => t.status === 'ok').length;
      const errorCount = tickets.filter(t => t.status === 'error').length;
      
      console.log(`[PUSH] Sent: ${successCount} success, ${errorCount} errors`);

      // Handle errors (remove invalid tokens)
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error') {
          const token = messages[i].to;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.removeToken(token as string);
          }
        }
      }
    } catch (error) {
      console.error('[PUSH] Error sending alert notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT token FROM push_tokens WHERE user_id = $1 AND updated_at > NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const tokens = (result.rows as any[]).map(row => row.token);

      if (tokens.length === 0) {
        console.log(`[PUSH] No active tokens for user ${userId}`);
        return;
      }

      const messages: ExpoPushMessage[] = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        badge: 1
      }));

      await this.expo.sendPushNotificationsAsync(messages);
      console.log(`[PUSH] Sent notification to user ${userId}`);
    } catch (error) {
      console.error('[PUSH] Error sending to user:', error);
      throw error;
    }
  }

  /**
   * Remove invalid or expired token
   */
  private async removeToken(token: string): Promise<void> {
    try {
      await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [token]);
      console.log(`[PUSH] Removed invalid token`);
    } catch (error) {
      console.error('[PUSH] Error removing token:', error);
    }
  }

  /**
   * Get count of active tokens
   */
  async getActiveTokenCount(): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT COUNT(DISTINCT token) as count FROM push_tokens WHERE updated_at > NOW() - INTERVAL '30 days'`
      );
      return (result.rows as any[])[0]?.count || 0;
    } catch (error) {
      console.error('[PUSH] Error getting token count:', error);
      return 0;
    }
  }

  /**
   * Send bulk notifications to multiple users with different messages
   */
  async sendBulkNotifications(
    notifications: Array<{ token: string; title: string; body: string; data?: any }>
  ): Promise<void> {
    try {
      if (notifications.length === 0) return;

      const messages: ExpoPushMessage[] = notifications.map(notif => ({
        to: notif.token,
        sound: 'default',
        title: notif.title,
        body: notif.body,
        data: notif.data || {},
        badge: 1,
      }));

      // Send in batches (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('[PUSH] Error sending chunk:', error);
        }
      }

      console.log(`[PUSH] Sent ${notifications.length} bulk notifications`);
    } catch (error) {
      console.error('[PUSH] Error sending bulk notifications:', error);
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
