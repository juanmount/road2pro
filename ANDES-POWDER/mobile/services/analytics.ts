// Analytics stub — safe for Expo Go and OTA builds.
// TODO: swap for @react-native-firebase/analytics once EAS build with native Firebase is shipped.

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

export const trackScreenView = async (screenName: string, _screenClass?: string) => {
  console.log('[Analytics] screen_view:', screenName);
};

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  console.log('[Analytics]', eventName, params);
};

export const setUserProperties = async (properties: {
  userId?: string;
  isPro?: boolean;
  isFounder?: boolean;
}) => {
  console.log('[Analytics] user properties:', properties);
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
  console.log('[Analytics] purchase:', params.transactionId, params.value, params.currency);
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
