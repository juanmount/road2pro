import Constants from 'expo-constants';


export async function initMeta() {
  try {
    if (Constants?.appOwnership === 'expo') return;
    const { Settings } = await import('react-native-fbsdk-next');
    Settings.setAdvertiserIDCollectionEnabled(true);
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.initializeSDK();
  } catch (e) {
    console.warn('[META] init error', e);
  }
}

export async function logEvent(name: string, params?: Record<string, any>) {
  try {
    if (Constants?.appOwnership === 'expo') return;
    const { AppEventsLogger } = await import('react-native-fbsdk-next');
    AppEventsLogger.logEvent(name, params || {});
  } catch (e) {
    console.warn('[META] logEvent error', e);
  }
}

export async function logPurchase(value: number, currency: string, params?: Record<string, any>) {
  try {
    if (Constants?.appOwnership === 'expo') return;
    const { AppEventsLogger } = await import('react-native-fbsdk-next');
    AppEventsLogger.logPurchase(value, currency, params || {});
  } catch (e) {
    console.warn('[META] logPurchase error', e);
  }

}
