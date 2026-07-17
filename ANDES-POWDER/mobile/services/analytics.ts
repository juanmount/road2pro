// Lazy-load native Firebase Analytics — crashes silently if native module not compiled yet
// (Expo Go / builds without @react-native-firebase). Requires EAS build for real tracking.
let _analytics: any = null;
function getAnalytics(): any | null {
  if (_analytics) return _analytics;
  try {
    const mod = require('@react-native-firebase/analytics');
    _analytics = mod.default ?? mod;
    return _analytics;
  } catch {
    return null;
  }
}

export const AnalyticsEvents = {
  PRO_SCREEN_VIEW: 'pro_screen_view',
  EARLY_ACCESS_MODAL_VIEW: 'early_access_modal_view',
  CHECKOUT_SCREEN_VIEW: 'checkout_screen_view',
  EARLY_ACCESS_CTA_TAP: 'early_access_cta_tap',
  PURCHASE_INITIATED: 'purchase_initiated',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  RESORT_DETAIL_VIEW: 'resort_detail_view',
  FORECAST_INTERACTION: 'forecast_interaction',
  WEBCAM_VIEW: 'webcam_view',
} as const;

export const trackScreenView = async (screenName: string, screenClass?: string) => {
  try {
    const a = getAnalytics();
    if (!a) return;
    await a().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log('[Analytics] screen_view:', screenName);
  } catch (e) {
    console.warn('[Analytics] trackScreenView error:', e);
  }
};

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    const a = getAnalytics();
    if (!a) return;
    await a().logEvent(eventName, params);
    console.log('[Analytics]', eventName, params);
  } catch (e) {
    console.warn('[Analytics] logEvent error:', e);
  }
};

export const setUserProperties = async (properties: {
  userId?: string;
  isPro?: boolean;
  isFounder?: boolean;
}) => {
  try {
    const a = getAnalytics();
    if (!a) return;
    if (properties.userId) await a().setUserId(properties.userId);
    if (properties.isPro !== undefined) await a().setUserProperty('is_pro', String(properties.isPro));
    if (properties.isFounder !== undefined) await a().setUserProperty('is_founder', String(properties.isFounder));
    console.log('[Analytics] user properties:', properties);
  } catch (e) {
    console.warn('[Analytics] setUserProperties error:', e);
  }
};

export const trackEarlyAccessEvent = async (eventName: string, params?: Record<string, any>) => {
  await logEvent(eventName, params);
};

export const trackPurchase = async (params: {
  transactionId: string;
  value: number;
  currency: string;
  items: Array<{ item_id: string; item_name: string; price: number }>;
}) => {
  try {
    const a = getAnalytics();
    if (!a) return;
    await a().logPurchase({
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency,
      items: params.items.map(i => ({ item_id: i.item_id, item_name: i.item_name, price: i.price })),
    });
    console.log('[Analytics] purchase:', params.transactionId, params.value, params.currency);
  } catch (e) {
    console.warn('[Analytics] trackPurchase error:', e);
  }
};

export const trackConversionStep = async (
  step: 'awareness' | 'interest' | 'consideration' | 'purchase',
  params?: Record<string, any>
) => {
  await logEvent('conversion_funnel', { step, ...params });
};

export default {
  AnalyticsEvents,
  trackScreenView,
  logEvent,
  setUserProperties,
  trackEarlyAccessEvent,
  trackPurchase,
  trackConversionStep,
};
