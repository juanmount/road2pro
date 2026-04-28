import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  // Basic toggles
  snowAlerts: boolean;
  stormAlerts: boolean;
  windAlerts: boolean;
  
  // Advanced snow alert settings
  minSnowfallCm: number; // Minimum snowfall to trigger alert (cm)
  requireHighConfidence: boolean; // Only alert if confidence score is high
  
  // Wind alert settings
  minWindSpeedKmh: number; // Minimum wind speed to trigger alert (km/h)
  
  // Favorite resorts (only get alerts for these)
  favoriteResorts: string[]; // Resort IDs
  allResorts: boolean; // If true, ignore favoriteResorts and alert for all
  
  // Timing
  advanceNoticeDays: number; // How many days in advance (1-7)
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  snowAlerts: true,
  stormAlerts: true,
  windAlerts: true,
  minSnowfallCm: 10,
  requireHighConfidence: false,
  minWindSpeedKmh: 70,
  favoriteResorts: [],
  allResorts: true,
  advanceNoticeDays: 3,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Request notification permissions and get Expo Push Token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for notifications');
        return null;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Alertas de Nieve',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#63b3ed',
          sound: 'default',
          enableVibrate: true,
        });
      }

      // Get Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || '9ef6fdd6-aca4-443a-8bae-2b3f1f611be3';
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        this.expoPushToken = tokenData.data;
        console.log('Expo Push Token obtained:', this.expoPushToken);
        return this.expoPushToken;
      } catch (tokenError) {
        // Fallback to local device ID if Expo token fails
        console.warn('Could not get Expo Push Token, using device ID:', tokenError);
        this.expoPushToken = `local-${Device.deviceName || 'device'}`;
        return this.expoPushToken;
      }
    } catch (error) {
      console.error('Error registering for notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to backend
   */
  async savePushToken(token: string, userId?: string): Promise<void> {
    try {
      // Use device ID as fallback userId if not provided
      const finalUserId = userId || Device.deviceName || 'anonymous';
      
      await api.post('/push/register', {
        userId: finalUserId,
        token,
      });
      console.log('Push token saved to backend');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    if (!this.expoPushToken) {
      console.log('No push token available');
      return;
    }

    try {
      await api.put('/notifications/preferences', {
        token: this.expoPushToken,
        preferences,
      });
      console.log('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  /**
   * Initialize push notifications (register + save token)
   */
  async initialize(userId?: string): Promise<void> {
    try {
      const token = await this.registerForPushNotifications();
      if (token) {
        await this.savePushToken(token, userId);
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❄️ Nevada Importante',
        body: 'Se pronostican 15cm en Cerro Catedral en las próximas 24 horas',
        data: { resortId: 'cerro-catedral' },
      },
      trigger: { seconds: 2 },
    });
  }

  /**
   * Get notification preferences from local storage
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem('notificationPreferences');
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Save notification preferences locally and sync to backend
   */
  async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      // Save locally
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      
      // Sync to backend
      await this.updatePreferences(preferences);
      
      console.log('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  }
}

export default new NotificationService();
