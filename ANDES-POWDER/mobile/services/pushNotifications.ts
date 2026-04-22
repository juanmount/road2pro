import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  schedulePowderAlert: (resortName: string, snowfall: number, time: string) => Promise<void>;
  scheduleWindAlert: (resortName: string, windSpeed: number) => Promise<void>;
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Get permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('[PUSH] Permission denied for push notifications');
    return null;
  }
  
  console.log('[PUSH] Permissions granted');
  
  // For now, use a mock token for development
  // In production, you'll need to configure EAS and get real Expo Push Token
  token = `DEV_TOKEN_${Date.now()}`;
  console.log('[PUSH] Using development token:', token);

  return token;
}

async function schedulePowderAlert(resortName: string, snowfall: number, time: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌨️ Alerta de Nieve!',
      body: `${Math.round(snowfall)}cm esperados en ${resortName} ${time}`,
      data: { type: 'powder_alert', resortName, snowfall },
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

async function scheduleWindAlert(resortName: string, windSpeed: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💨 Alerta de Viento',
      body: `Vientos de ${Math.round(windSpeed)} km/h en ${resortName}. Posible cierre de medios.`,
      data: { type: 'wind_alert', resortName, windSpeed },
      sound: true,
    },
    trigger: null,
  });
}

export const pushNotificationService: PushNotificationService = {
  registerForPushNotifications: registerForPushNotificationsAsync,
  schedulePowderAlert,
  scheduleWindAlert,
};
