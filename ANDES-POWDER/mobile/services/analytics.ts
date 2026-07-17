import analytics from '@react-native-firebase/analytics';

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
    await analytics().logScreenView({
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
    await analytics().logEvent(eventName, params);
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
    if (properties.userId) await analytics().setUserId(properties.userId);
    if (properties.isPro !== undefined) await analytics().setUserProperty('is_pro', String(properties.isPro));
    if (properties.isFounder !== undefined) await analytics().setUserProperty('is_founder', String(properties.isFounder));
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
    await analytics().logPurchase({
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
