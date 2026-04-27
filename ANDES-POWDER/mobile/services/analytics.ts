import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple Analytics Service (no Firebase required)
// Stores events locally and can sync to backend later

const EVENTS_STORAGE_KEY = '@andes_powder_analytics_events';
const MAX_EVENTS_STORED = 1000;

// Analytics Events for Early Access / Founder Program
export const AnalyticsEvents = {
  // Screen Views
  PRO_SCREEN_VIEW: 'pro_screen_view',
  EARLY_ACCESS_MODAL_VIEW: 'early_access_modal_view',
  CHECKOUT_SCREEN_VIEW: 'checkout_screen_view',
  
  // User Actions
  EARLY_ACCESS_CTA_TAP: 'early_access_cta_tap',
  PURCHASE_INITIATED: 'purchase_initiated',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  
  // Engagement
  RESORT_DETAIL_VIEW: 'resort_detail_view',
  FORECAST_INTERACTION: 'forecast_interaction',
  WEBCAM_VIEW: 'webcam_view',
} as const;

// Helper: Store event locally
const storeEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    const eventsJson = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    const events = eventsJson ? JSON.parse(eventsJson) : [];
    
    const newEvent = {
      name: eventName,
      params: params || {},
      timestamp: new Date().toISOString(),
    };
    
    events.push(newEvent);
    
    // Keep only last MAX_EVENTS_STORED events
    const trimmedEvents = events.slice(-MAX_EVENTS_STORED);
    
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(trimmedEvents));
    
    // Log to console for debugging
    console.log('[Analytics]', eventName, params);
  } catch (error) {
    console.error('Error storing event:', error);
  }
};

// User Properties
export const setUserProperties = async (properties: {
  userId?: string;
  isFounder?: boolean;
  daysActive?: number;
  resortsViewed?: number;
}) => {
  try {
    await AsyncStorage.setItem('@user_properties', JSON.stringify(properties));
    console.log('[Analytics] User properties updated:', properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
};

// Track Screen View
export const trackScreenView = async (screenName: string, screenClass?: string) => {
  await storeEvent('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
};

// Track Early Access Events
export const trackEarlyAccessEvent = async (
  eventName: string,
  params?: {
    source?: string;
    price?: number;
    currency?: string;
    sessionDuration?: number;
    resortsViewed?: number;
  }
) => {
  await storeEvent(eventName, params);
};

// Track Purchase Events
export const trackPurchase = async (params: {
  transactionId: string;
  value: number;
  currency: string;
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
  }>;
}) => {
  await storeEvent('purchase', params);
};

// Track User Engagement Level
export const trackUserEngagement = async (params: {
  daysActive: number;
  resortsViewed: number;
  forecastsChecked: number;
  avgSessionDuration: number;
}) => {
  await storeEvent('user_engagement_snapshot', {
    days_active: params.daysActive,
    resorts_viewed: params.resortsViewed,
    forecasts_checked: params.forecastsChecked,
    avg_session_duration: params.avgSessionDuration,
    engagement_level: getEngagementLevel(params),
  });
};

// Helper: Calculate engagement level
const getEngagementLevel = (params: {
  daysActive: number;
  resortsViewed: number;
  forecastsChecked: number;
}): 'casual' | 'active' | 'power_user' => {
  const score = 
    params.daysActive * 2 + 
    params.resortsViewed * 1.5 + 
    params.forecastsChecked * 1;
  
  if (score > 50) return 'power_user';
  if (score > 20) return 'active';
  return 'casual';
};

// Track Conversion Funnel
export const trackConversionStep = async (
  step: 'awareness' | 'interest' | 'consideration' | 'purchase',
  params?: Record<string, any>
) => {
  await storeEvent('conversion_funnel', {
    step,
    ...params,
  });
};

// Get all stored events (for debugging or syncing to backend)
export const getStoredEvents = async () => {
  try {
    const eventsJson = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    return eventsJson ? JSON.parse(eventsJson) : [];
  } catch (error) {
    console.error('Error getting stored events:', error);
    return [];
  }
};

// Clear all stored events
export const clearStoredEvents = async () => {
  try {
    await AsyncStorage.removeItem(EVENTS_STORAGE_KEY);
    console.log('[Analytics] Events cleared');
  } catch (error) {
    console.error('Error clearing events:', error);
  }
};

export default {
  AnalyticsEvents,
  setUserProperties,
  trackScreenView,
  trackEarlyAccessEvent,
  trackPurchase,
  trackUserEngagement,
  trackConversionStep,
};
