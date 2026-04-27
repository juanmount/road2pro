import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackUserEngagement, setUserProperties } from '../services/analytics';

interface UserEngagementData {
  daysActive: number;
  resortsViewed: number;
  forecastsChecked: number;
  avgSessionDuration: number;
  firstVisit: string;
  lastVisit: string;
  sessionCount: number;
}

const STORAGE_KEY = '@andes_powder_engagement';

export const useUserEngagement = () => {
  const [engagement, setEngagement] = useState<UserEngagementData | null>(null);

  // Load engagement data on mount
  useEffect(() => {
    loadEngagementData();
  }, []);

  const loadEngagementData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setEngagement(parsed);
        
        // Update user properties in analytics
        await setUserProperties({
          daysActive: parsed.daysActive,
          resortsViewed: parsed.resortsViewed,
        });
      } else {
        // First time user
        const initialData: UserEngagementData = {
          daysActive: 1,
          resortsViewed: 0,
          forecastsChecked: 0,
          avgSessionDuration: 0,
          firstVisit: new Date().toISOString(),
          lastVisit: new Date().toISOString(),
          sessionCount: 1,
        };
        await saveEngagementData(initialData);
        setEngagement(initialData);
      }
    } catch (error) {
      console.error('Error loading engagement data:', error);
    }
  };

  const saveEngagementData = async (data: UserEngagementData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setEngagement(data);
    } catch (error) {
      console.error('Error saving engagement data:', error);
    }
  };

  // Track new session
  const trackSession = async () => {
    if (!engagement) return;

    const now = new Date();
    const lastVisit = new Date(engagement.lastVisit);
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
    );

    const updatedData: UserEngagementData = {
      ...engagement,
      daysActive: daysSinceLastVisit > 0 ? engagement.daysActive + 1 : engagement.daysActive,
      lastVisit: now.toISOString(),
      sessionCount: engagement.sessionCount + 1,
    };

    await saveEngagementData(updatedData);
  };

  // Track resort view
  const trackResortView = async (resortId: string) => {
    if (!engagement) return;

    const updatedData: UserEngagementData = {
      ...engagement,
      resortsViewed: engagement.resortsViewed + 1,
    };

    await saveEngagementData(updatedData);
    
    // Update analytics
    await setUserProperties({
      resortsViewed: updatedData.resortsViewed,
    });
  };

  // Track forecast check
  const trackForecastCheck = async () => {
    if (!engagement) return;

    const updatedData: UserEngagementData = {
      ...engagement,
      forecastsChecked: engagement.forecastsChecked + 1,
    };

    await saveEngagementData(updatedData);
  };

  // Send engagement snapshot to analytics
  const sendEngagementSnapshot = async () => {
    if (!engagement) return;

    await trackUserEngagement({
      daysActive: engagement.daysActive,
      resortsViewed: engagement.resortsViewed,
      forecastsChecked: engagement.forecastsChecked,
      avgSessionDuration: engagement.avgSessionDuration,
    });
  };

  // Calculate if user is ready for conversion (power user)
  const isReadyForConversion = (): boolean => {
    if (!engagement) return false;
    
    // User is "ready" if they've:
    // - Been active for 3+ days
    // - Viewed 5+ resorts
    // - Checked forecasts 10+ times
    return (
      engagement.daysActive >= 3 &&
      engagement.resortsViewed >= 5 &&
      engagement.forecastsChecked >= 10
    );
  };

  // Get engagement level
  const getEngagementLevel = (): 'casual' | 'active' | 'power_user' => {
    if (!engagement) return 'casual';
    
    const score = 
      engagement.daysActive * 2 + 
      engagement.resortsViewed * 1.5 + 
      engagement.forecastsChecked * 1;
    
    if (score > 50) return 'power_user';
    if (score > 20) return 'active';
    return 'casual';
  };

  return {
    engagement,
    trackSession,
    trackResortView,
    trackForecastCheck,
    sendEngagementSnapshot,
    isReadyForConversion,
    getEngagementLevel,
  };
};
