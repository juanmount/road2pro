import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Image, Modal, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resortsService } from '../../../../services/resorts';
import { Resort, CurrentConditions, ElevationBand } from '../../../../types';
import { DailyForecastCard } from '../../../../components/DailyForecastCard';
import { SnowfallChart } from '../../../../components/SnowfallChart';
import { TemperatureCurve } from '../../../../components/TemperatureCurve';
import { WebcamsModal } from '../../../../components/WebcamsModal';
import { WeeklySummary } from '../../../../components/WeeklySummary';
import BestTimeCard from '../../../../components/BestTimeCard';
import ENSOCard from '../../../../components/ENSOCard';
import { getWeatherIcon } from '../../../../utils/weather-icons';
import { getWindNarrative, getWindDirectionLabel, getWindExplanation, getWindTrend, getSkiSeason } from '../../../../utils/wind-narrative';
import { useUserEngagement } from '../../../../hooks/useUserEngagement';
import { trackScreenView, AnalyticsEvents, trackEarlyAccessEvent } from '../../../../services/analytics';
import trendingService, { TrendingData } from '../../../../services/trending';

export default function ResortDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trackResortView, trackForecastCheck } = useUserEngagement();
  const [resort, setResort] = useState<Resort | null>(null);
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [selectedElevation, setSelectedElevation] = useState<ElevationBand>('mid');
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [todayRealSnowfall, setTodayRealSnowfall] = useState<number>(0);
  const [todayForecastSnowfall, setTodayForecastSnowfall] = useState<number>(0);
  const [last5DaysSnowfall, setLast5DaysSnowfall] = useState<any[]>([]);
  const [dailyForecast, setDailyForecast] = useState<any[]>([]);
  const [stormCrossingData, setStormCrossingData] = useState<any>(null);
  const [snowRealityData, setSnowRealityData] = useState<any>(null);
  const [windImpactData, setWindImpactData] = useState<any>(null);
  const [bestTimeWindows, setBestTimeWindows] = useState<any[]>([]);
  const [trendingData, setTrendingData] = useState<TrendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webcamsVisible, setWebcamsVisible] = useState(false);
  const [windExplanationVisible, setWindExplanationVisible] = useState(false);
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);

  useEffect(() => {
    loadResortData();
    
    // Track resort view for analytics
    if (id) {
      trackScreenView(`Resort_${id}`, 'ResortDetailScreen');
      trackResortView(id);
      trackEarlyAccessEvent(AnalyticsEvents.RESORT_DETAIL_VIEW, {
        source: 'resort_list',
      });
    }
  }, [id, selectedElevation]);

  useFocusEffect(
    useCallback(() => {
      loadResortData();
    }, [id, selectedElevation])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResortData();
    setRefreshing(false);
  };

  const loadResortData = async () => {
    try {
      setLoading(true);
      console.log('[LOAD] Loading resort data for:', id, 'elevation:', selectedElevation);
      
      console.log('[LOAD] Fetching resort by ID...');
      const resortData = await resortsService.getById(id);
      console.log('[LOAD] Resort data loaded:', resortData?.name);
      setResort(resortData);
      
      // Fetch current conditions with elevation-specific data
      try {
        const conditionsData = await resortsService.getCurrentConditions(id);
        console.log('[LOAD] Current conditions loaded:', conditionsData);
        setConditions(conditionsData);
      } catch (error) {
        console.warn('[LOAD] Failed to load current conditions:', error);
        setConditions(null);
      }
      
      let hourlyForecast: any[] = [];
      try {
        console.log('[LOAD] Fetching hourly forecast...');
        hourlyForecast = await resortsService.getHourlyForecast(id, selectedElevation, 168);
        console.log('[LOAD] Hourly forecast loaded:', hourlyForecast?.length, 'hours');
      } catch (error) {
        console.warn('[LOAD] Failed to load hourly forecast:', error);
        hourlyForecast = [];
      }
      
      // Debug: Check Saturday and Sunday data
      const saturdayHours = hourlyForecast.filter((h: any) => {
        const date = new Date(h.time);
        return date.getDate() === 15 && date.getMonth() === 2; // March 15
      });
      const sundayHours = hourlyForecast.filter((h: any) => {
        const date = new Date(h.time);
        return date.getDate() === 16 && date.getMonth() === 2; // March 16
      });
      
      if (saturdayHours.length > 0) {
        const satSnowfall = saturdayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
        console.log(`[DEBUG] Saturday (15): ${saturdayHours.length} hours, total snowfall: ${satSnowfall.toFixed(2)} cm`);
        console.log('[DEBUG] Saturday snowfall values:', saturdayHours.map((h: any) => h.snowfall));
      }
      
      if (sundayHours.length > 0) {
        const sunSnowfall = sundayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
        console.log(`[DEBUG] Sunday (16): ${sundayHours.length} hours, total snowfall: ${sunSnowfall.toFixed(2)} cm`);
        console.log('[DEBUG] Sunday snowfall values:', sundayHours.map((h: any) => h.snowfall));
      }
      
      // Calculate today's forecast snowfall (next 24 hours from now)
      const currentTime = new Date();
      const next24Hours = hourlyForecast.filter((h: any) => {
        const hourTime = new Date(h.time);
        const hoursFromNow = (hourTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        return hoursFromNow >= 0 && hoursFromNow <= 24;
      });
      const todayForecastSnowfall = next24Hours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
      
      // Calculate today's REAL snowfall (with Snow Reality Engine adjustments)
      const elevationMeters = !resort ? 1600 : (
        selectedElevation === 'base' ? resort.baseElevation : 
        selectedElevation === 'mid' ? resort.midElevation : 
        resort.summitElevation
      );
      
      let todayRealSnowfall = 0;
      next24Hours.forEach((h: any) => {
        const hourSnow = h.snowfall || 0;
        if (hourSnow > 0) {
          const freezingLevel = h.freezingLevel || 3000;
          const margin = freezingLevel - elevationMeters;
          const windSpeed = h.windSpeed || 0;
          
          // Freezing level filter
          let baseAdjustment = 1.0;
          if (margin <= -300) baseAdjustment = 0.95;
          else if (margin <= -100) baseAdjustment = 0.88;
          else if (margin <= 50) baseAdjustment = 0.45;
          else if (margin <= 150) baseAdjustment = 0.20;
          else if (margin <= 250) baseAdjustment = 0.08;
          else baseAdjustment = 0;
          
          if (baseAdjustment > 0) {
            // Wind loss (elevation-adjusted for Patagonia)
            const elevationWindMultiplier = selectedElevation === 'summit' ? 2.0 : 
                                            selectedElevation === 'mid' ? 1.5 : 1.0;
            const effectiveWind = windSpeed * elevationWindMultiplier;
            let windLoss = 0;
            if (effectiveWind > 60) windLoss = 0.35;
            else if (effectiveWind > 40) windLoss = 0.25;
            else if (effectiveWind > 25) windLoss = 0.15;
            else if (effectiveWind > 15) windLoss = 0.08;
            else windLoss = 0.03;
            
            const adjusted = hourSnow * baseAdjustment * (1 - windLoss);
            todayRealSnowfall += adjusted;
          }
        }
      });
      
      setTodayRealSnowfall(todayRealSnowfall);
      setTodayForecastSnowfall(todayForecastSnowfall);
      console.log(`[TODAY] Forecast: ${todayForecastSnowfall.toFixed(1)}cm, Real (adjusted): ${todayRealSnowfall.toFixed(1)}cm from ${next24Hours.length} hours`);
      
      // Fetch snowfall history from snowfall_history table
      try {
        console.log('[LOAD] Fetching snowfall history...');
        const historyData = await resortsService.getSnowfallHistory(id, selectedElevation, 5);
        setLast5DaysSnowfall(historyData);
        console.log('[HISTORY] Loaded', historyData.length, 'days of snowfall history');
      } catch (error) {
        console.warn('[HISTORY] Failed to load snowfall history:', error);
        setLast5DaysSnowfall([]);
      }
      
      setHourlyData(hourlyForecast);
      
      // Save to AsyncStorage for Hourly Forecast screen to use
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(
          `hourly-forecast-${id}-${selectedElevation}-v2`,
          JSON.stringify(hourlyForecast)
        );
        console.log('[CACHE] Saved hourly forecast to AsyncStorage');
      } catch (error) {
        console.warn('[CACHE] Failed to save to AsyncStorage:', error);
      }
      
      // Debug: Log first hour data
      if (hourlyForecast && hourlyForecast.length > 0) {
        console.log('[LIVE CARD] First hour:', {
          time: hourlyForecast[0].time,
          wind: hourlyForecast[0].windSpeed,
          freezing: hourlyForecast[0].freezingLevel,
          temp: hourlyForecast[0].temperature
        });
      }
      
      // Use hourly forecast to build daily forecast (more reliable than backend endpoint)
      // Include ALL hours (past and future) to show precipitation that already happened
      console.log('[DAILY FORECAST] Total hourly data:', hourlyForecast.length);
      
      // Group ALL hourly data by day (including past hours with precipitation)
      const dailyMap = new Map<string, any[]>();
      const now = new Date(); // Keep this for confidence calculation
      
      hourlyForecast.forEach((h: any) => {
        const date = new Date(h.time);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, []);
        }
        dailyMap.get(dateKey)!.push(h);
      });
      
      console.log('[DAILY FORECAST] Days with data:', Array.from(dailyMap.keys()));
      
      // Build daily forecast from hourly data - show 7 days starting from TODAY (no past days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('[DAILY FORECAST] Today date:', today.toISOString(), 'Day:', today.getDate(), 'Month:', today.getMonth() + 1);
      
      // Create 7 days starting from today
      const dailyFromHourly: any[] = [];
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        
        console.log(`[DAILY FORECAST] Day ${i}: targetDate=${targetDate.toISOString()}, dateKey=${dateKey}`);
        
        const hours = dailyMap.get(dateKey) || [];
        
        if (hours.length > 0) {
          const temps = hours.map(h => h.temperature);
          const maxTemp = Math.max(...temps);
          const minTemp = Math.min(...temps);
          
          // Calculate ADJUSTED snowfall (same logic as getDailyForecasts)
          const elevationMeters = !resort ? 1600 : (
            selectedElevation === 'base' ? resort.baseElevation : 
            selectedElevation === 'mid' ? resort.midElevation : 
            resort.summitElevation
          );
          
          let adjustedSnowfall = 0;
          hours.forEach(h => {
            const hourSnow = h.snowfall || 0;
            if (hourSnow > 0) {
              const freezingLevel = h.freezingLevel || 3000;
              const margin = freezingLevel - elevationMeters;
              const windSpeed = h.windSpeed || 0;
              
              let baseAdjustment = 1.0;
              if (margin <= -300) baseAdjustment = 0.95;
              else if (margin <= -100) baseAdjustment = 0.88;
              else if (margin <= 50) baseAdjustment = 0.45;
              else if (margin <= 150) baseAdjustment = 0.20;
              else if (margin <= 250) baseAdjustment = 0.08;
              else baseAdjustment = 0;
              
              if (baseAdjustment > 0) {
                const elevationWindMultiplier = selectedElevation === 'summit' ? 2.0 : 
                                                selectedElevation === 'mid' ? 1.5 : 1.0;
                const effectiveWind = windSpeed * elevationWindMultiplier;
                let windLoss = 0;
                if (effectiveWind > 60) windLoss = 0.35;
                else if (effectiveWind > 40) windLoss = 0.25;
                else if (effectiveWind > 25) windLoss = 0.15;
                else if (effectiveWind > 15) windLoss = 0.08;
                else windLoss = 0.03;
                
                const adjusted = hourSnow * baseAdjustment * (1 - windLoss);
                adjustedSnowfall += adjusted;
              }
            }
          });
          
          const snowfall = Math.max(adjustedSnowfall, 0);
          const precipitation = hours.reduce((sum, h) => sum + (h.precipitation || 0), 0);
          const maxWindSpeed = Math.max(...hours.map(h => h.windSpeed || 0));
          const avgCloudCover = hours.reduce((sum, h) => sum + (h.cloudCover || 0), 0) / hours.length;
          
          const hourlyDetails = hours.map((h: any, idx: number) => {
            const icon = getWeatherIcon({
              hour: new Date(h.time).getHours(),
              phase: h.phase || 'none',
              cloudCover: h.cloudCover || 0,
              precipitation: h.precipitation || 0
            });
            
            // Debug first 3 hours
            if (idx < 3) {
              console.log(`[HOURLY DETAIL ${idx}] Phase: ${h.phase}, Precip: ${h.precipitation}mm, Temp: ${h.temperature}°C, Icon: ${icon}`);
            }
            
            return {
              time: new Date(h.time),
              temperature: h.temperature,
              precipitation: h.precipitation,
              snowfall: h.snowfall || 0,
              windSpeed: h.windSpeed,
              windGust: h.windGust,
              windDirection: h.windDirection,
              humidity: h.humidity || 70,
              freezingLevel: h.freezingLevel || 2000,
              phase: h.phase || 'unknown',
              icon: icon
            };
          });
          
          // Calculate icon for the day
          // For TODAY: use current hour to match LIVE card
          // For future days: use most common condition during daylight hours (8am-6pm)
          let representativeHour;
          if (i === 0) {
            // Today - find hour closest to current time
            const currentHour = new Date().getHours();
            representativeHour = hours.find(h => new Date(h.time).getHours() === currentHour) 
                              || hours.find(h => new Date(h.time).getHours() === currentHour - 1)
                              || hours.find(h => new Date(h.time).getHours() === currentHour + 1)
                              || hours[0];
            console.log(`[TODAY ICON] Using hour ${new Date(representativeHour.time).getHours()} (current: ${currentHour})`);
          } else {
            // Future days - use most common phase during daylight hours (8am-6pm)
            const daylightHours = hours.filter(h => {
              const hr = new Date(h.time).getHours();
              return hr >= 8 && hr <= 18;
            });
            
            if (daylightHours.length > 0) {
              // Find most common phase
              const phaseCounts: Record<string, number> = {};
              daylightHours.forEach(h => {
                const phase = h.phase || 'none';
                phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
              });
              const mostCommonPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0][0];
              
              // Use hour with most common phase, preferring afternoon
              representativeHour = daylightHours.find(h => (h.phase || 'none') === mostCommonPhase && new Date(h.time).getHours() >= 12)
                                || daylightHours.find(h => (h.phase || 'none') === mostCommonPhase)
                                || daylightHours[Math.floor(daylightHours.length / 2)];
            } else {
              representativeHour = hours[Math.floor(hours.length / 2)];
            }
          }
          
          const dayIcon = getWeatherIcon({
            hour: new Date(representativeHour.time).getHours(),
            phase: representativeHour.phase || 'none',
            cloudCover: representativeHour.cloudCover || 0,
            precipitation: representativeHour.precipitation || 0
          });
          
          // Calculate confidence score based on lead time
          const hoursOut = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          let leadTimeFactor = 1.0;
          if (hoursOut <= 24) leadTimeFactor = 1.0;
          else if (hoursOut <= 48) leadTimeFactor = 0.9;
          else if (hoursOut <= 72) leadTimeFactor = 0.8;
          else if (hoursOut <= 120) leadTimeFactor = 0.7;
          else if (hoursOut <= 168) leadTimeFactor = 0.6;
          else leadTimeFactor = 0.5;
          
          const confidenceScore = leadTimeFactor * 10;
          
          let confidenceReason = '';
          if (confidenceScore >= 7.5) {
            if (hoursOut <= 24) {
              confidenceReason = 'Alta confianza - Pronóstico de corto plazo';
            } else if (hoursOut <= 72) {
              confidenceReason = 'Alta confianza - Pronóstico confiable';
            } else {
              confidenceReason = 'Buena confianza - Pronóstico lejano';
            }
          } else if (confidenceScore >= 5.0) {
            if (hoursOut > 120) {
              confidenceReason = 'Confianza moderada - Pronóstico muy lejano';
            } else {
              confidenceReason = 'Confianza moderada - Revisá más cerca de la fecha';
            }
          } else {
            confidenceReason = 'Baja confianza - Pronóstico demasiado lejano';
          }
          
          dailyFromHourly.push({
            date: dateKey,
            maxTemp,
            minTemp,
            snowfall,
            precipitation,
            maxWindSpeed,
            cloudCover: avgCloudCover,
            icon: dayIcon,
            hourlyDetails,
            confidenceScore: Math.round(confidenceScore * 10) / 10,
            confidenceReason
          });
        } else {
          // No data for this day, create placeholder with zeros
          dailyFromHourly.push({
            date: dateKey,
            maxTemp: 0,
            minTemp: 0,
            snowfall: 0,
            precipitation: 0,
            maxWindSpeed: 0,
            cloudCover: 0,
            hourlyDetails: []
          });
        }
      }
      
      console.log('[DAILY FORECAST] Built from hourly data:', dailyFromHourly.length, 'days');
      console.log('[DAILY FORECAST] Sample day:', dailyFromHourly[0]);
      
      // FILTER OUT PAST DAYS - only show from today onwards
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const filteredForecast = dailyFromHourly.filter(day => {
        const [fy, fm, fd] = day.date.split('-').map(Number);
        const dayDate = new Date(fy, fm - 1, fd);
        return dayDate >= todayDate;
      }).slice(0, 7); // Limit to 7 days AFTER filtering
      
      console.log('[DAILY FORECAST] After filtering past days:', filteredForecast.length, 'days');
      console.log('[DAILY FORECAST] First day after filter:', filteredForecast[0]?.date);
      console.log('[DAILY FORECAST] Last day after filter:', filteredForecast[filteredForecast.length - 1]?.date);
      
      setDailyForecast(filteredForecast);
      
      // Calculate Storm Crossing Score for each day (Patagonian-specific)
      const stormCrossingByDay = filteredForecast.map((day, idx) => {
        const dayHours = day.hourlyDetails || [];
        
        if (dayHours.length === 0 || !resort) return null;
        
        // CRITICAL: Use adjusted snowfall from filteredForecast (after Snow Engine)
        // This ensures Storm Crossing badge only shows when there's REAL snow after adjustments
        const adjustedSnowfall = day.snowfall || 0;
        const totalPrecipitation = dayHours.reduce((sum: number, h: any) => sum + (h.precipitation || 0), 0);
        
        // If no adjusted snowfall, don't show Storm Crossing Score
        // (Snow Engine already removed it due to wind/rain/temp factors)
        if (adjustedSnowfall < 0.5) {
          console.log(`[STORM CROSSING] Day ${idx}: No real snow after adjustments (${adjustedSnowfall.toFixed(1)}cm) - skipping score`);
          return null;
        }
        
        console.log(`[STORM CROSSING] Day ${idx}: ${adjustedSnowfall.toFixed(1)}cm adjusted snow, ${totalPrecipitation.toFixed(1)}mm precip - calculating score...`);
        
        // Calculate average conditions for the day
        const avgHumidity = dayHours.reduce((sum, h) => sum + (h.humidity || 70), 0) / dayHours.length;
        const avgWind = dayHours.reduce((sum, h) => sum + h.windSpeed, 0) / dayHours.length;
        const avgFrz = dayHours.reduce((sum, h) => sum + h.freezingLevel, 0) / dayHours.length;
        const avgTemp = dayHours.reduce((sum, h) => sum + h.temperature, 0) / dayHours.length;
        
        // STORM CROSSING ALGORITHM (simplified frontend version)
        let score = 50; // Base score
        let factors = [];
        
        // 1. Humidity (Pacific moisture indicator)
        if (avgHumidity > 75) {
          score += 20;
          factors.push('High humidity (Pacific moisture)');
        } else if (avgHumidity > 60) {
          score += 10;
          factors.push('Moderate humidity');
        } else {
          score -= 10;
          factors.push('Dry air (weak system)');
        }
        
        // 2. Freezing Level (snow vs rain)
        const elevationMeters = selectedElevation === 'base' ? resort.baseElevation : 
                               selectedElevation === 'mid' ? resort.midElevation : 
                               resort.summitElevation;
        const frzMargin = avgFrz - elevationMeters;
        
        if (frzMargin < -200) {
          score += 15;
          factors.push('Deep cold (excellent snow quality)');
        } else if (frzMargin < 100) {
          score += 10;
          factors.push('Good freezing level');
        } else if (frzMargin > 500) {
          score -= 20;
          factors.push('High freezing level (rain risk)');
        }
        
        // 3. Wind Direction (westerly = favorable for crossing)
        const westWindHours = dayHours.filter(h => {
          const dir = h.windDirection || 0;
          return dir >= 240 && dir <= 330; // W to NW
        }).length;
        const westWindRatio = westWindHours / dayHours.length;
        
        if (westWindRatio > 0.6) {
          score += 15;
          factors.push('Westerly flow (favorable crossing)');
        } else if (westWindRatio < 0.3) {
          score -= 10;
          factors.push('Unfavorable wind direction');
        }
        
        // 4. Snowfall consistency (persistent vs sporadic)
        const snowHours = dayHours.filter(h => h.snowfall > 0.1).length;
        if (snowHours > dayHours.length * 0.5) {
          score += 10;
          factors.push('Persistent snowfall');
        }
        
        // Clamp score 0-100
        score = Math.max(0, Math.min(100, score));
        
        // Determine category
        let category: 'LOW' | 'MEDIUM' | 'HIGH';
        if (score >= 70) category = 'HIGH';
        else if (score >= 40) category = 'MEDIUM';
        else category = 'LOW';
        
        return {
          score: Math.round(score),
          category,
          explanation: factors.join(', ')
        };
      });
      
      setStormCrossingData(stormCrossingByDay);
      setSnowRealityData(null);
      setWindImpactData(null);
      
      // Fetch Best Time to Ski windows
      try {
        const bestTimeData = await resortsService.getBestTimeToSki(id, selectedElevation);
        setBestTimeWindows(bestTimeData || []);
        if (bestTimeData && bestTimeData.length > 0) {
          console.log('[BEST TIME] Found', bestTimeData.length, 'optimal ski windows');
        }
      } catch (error) {
        // Silently handle - empty array is expected when conditions aren't ideal
        setBestTimeWindows([]);
      }
      
      // Load trending data
      try {
        console.log('[TRENDING] Loading trending data...');
        const trending = await trendingService.getTrending(id, selectedElevation, 7);
        console.log('[TRENDING] Loaded', trending.length, 'trending entries');
        setTrendingData(trending);
      } catch (error) {
        console.warn('[TRENDING] Failed to load trending data:', error);
        setTrendingData([]);
      }
      
    } catch (err) {
      console.error('[LOAD ERROR] Error loading resort data:', err);
      console.error('[LOAD ERROR] Stack:', (err as Error).stack);
      alert('Error loading data: ' + (err as Error).message);
    } finally {
      console.log('[LOAD] Setting loading to false');
      setLoading(false);
    }
  };

  const getDailyForecasts = () => {
    if (!hourlyData || hourlyData.length === 0) {
      return [];
    }
    
    const days: any[] = [];
    const grouped = new Map<string, any[]>();
    
    // Group hourly data by local date (midnight to midnight)
    hourlyData.forEach(hour => {
      const date = new Date(hour.time);
      // Extract local date components (automatically uses device timezone)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(hour);
    });
    
    // Get today's date (midnight) for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process each day
    grouped.forEach((hours, dateKey) => {
      // Use the first hour's date to get correct day name and date
      // This avoids timezone issues with parsing dateKey string
      const firstHourDate = new Date(hours[0].time);
      
      // Skip past days (only show today and future)
      const dayMidnight = new Date(firstHourDate);
      dayMidnight.setHours(0, 0, 0, 0);
      if (dayMidnight < today) {
        return; // Skip this day
      }
      
      const dayName = firstHourDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayDate = firstHourDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const temps = hours.map(h => h.temperature);
      
      // Intelligent snow calculation: only count hours where freezing level is below elevation
      const elevationMeters = !resort ? 1600 : (
        selectedElevation === 'base' ? resort.baseElevation : 
        selectedElevation === 'mid' ? resort.midElevation : 
        resort.summitElevation
      );
      
      // COMPREHENSIVE PATAGONIA CALCULATION
      // Get current month for seasonal adjustments
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const isAutumn = currentMonth >= 3 && currentMonth <= 5; // Mar-May
      const isSpring = currentMonth >= 9 && currentMonth <= 11; // Sep-Nov
      const isWinter = currentMonth >= 6 && currentMonth <= 8; // Jun-Aug
      
      // Elevation-specific wind multiplier (Patagonian winds are brutal at summit)
      const elevationWindMultiplier = selectedElevation === 'summit' ? 2.0 : 
                                      selectedElevation === 'mid' ? 1.5 : 1.0;
      
      let realSnowfall = 0;
      let debugInfo: any[] = [];
      let totalWindLoss = 0;
      let totalRainLoss = 0;
      let totalSolarLoss = 0;
      let totalSeasonalLoss = 0;
      
      // Store adjusted snowfall for each hour
      const adjustedSnowfallByHour = new Map<string, number>();
      
      hours.forEach(h => {
        const hourSnow = h.snowfall || 0;
        let adjusted = 0; // Declare outside to use in both branches
        
        if (hourSnow > 0) {
          const freezingLevel = h.freezingLevel || 3000;
          const margin = freezingLevel - elevationMeters;
          const windSpeed = h.windSpeed || 0;
          const temp = h.temperature || 0;
          const humidity = h.humidity || 70;
          const hour = new Date(h.time).getHours();
          
          let baseAdjustment = 1.0;
          let reason = '';
          
          // 1. FREEZING LEVEL - Primary filter
          if (margin <= -300) {
            baseAdjustment = 0.95; // Excellent conditions
            reason = 'excellent';
          } else if (margin <= -100) {
            baseAdjustment = 0.88; // Good conditions
            reason = 'good';
          } else if (margin <= 50) {
            baseAdjustment = 0.45; // Marginal - heavy losses
            reason = 'marginal';
          } else if (margin <= 150) {
            baseAdjustment = 0.20; // Mostly rain
            reason = 'mostly_rain';
          } else if (margin <= 250) {
            baseAdjustment = 0.08; // Almost all rain
            reason = 'rain_dominant';
          } else {
            baseAdjustment = 0; // All rain
            reason = 'rain';
          }
          
          if (baseAdjustment > 0) {
            // 2. PATAGONIAN WIND LOSSES (enhanced for elevation)
            // Wind is brutal in Patagonia, especially at summit
            const effectiveWind = windSpeed * elevationWindMultiplier;
            let windLoss = 0;
            if (effectiveWind > 60) {
              windLoss = 0.35; // Extreme wind - massive redistribution
            } else if (effectiveWind > 40) {
              windLoss = 0.25; // Strong wind
            } else if (effectiveWind > 25) {
              windLoss = 0.15; // Moderate wind
            } else if (effectiveWind > 15) {
              windLoss = 0.08; // Light wind
            } else {
              windLoss = 0.03; // Calm
            }
            
            // 3. SOLAR RADIATION / MELTING
            // More significant in autumn/spring, during daylight hours
            let solarLoss = 0;
            if (hour >= 10 && hour <= 16) { // Peak sun hours
              if (isAutumn || isSpring) {
                solarLoss = temp > 0 ? 0.12 : 0.06; // Significant melting in shoulder seasons
              } else if (isWinter) {
                solarLoss = temp > 0 ? 0.05 : 0.02; // Less melting in winter
              } else { // Summer
                solarLoss = 0.20; // Heavy melting
              }
            }
            
            // 4. SEASONAL PERSISTENCE FACTOR
            // Snow doesn't stick as well in autumn/spring
            let seasonalLoss = 0;
            if (isAutumn || isSpring) {
              seasonalLoss = 0.10; // 10% additional loss in shoulder seasons
            }
            
            // 5. HUMIDITY / DENSITY IMPACT
            // High humidity = heavier, denser snow = less depth
            let densityLoss = 0;
            if (humidity > 80 && temp > -2) {
              densityLoss = 0.08; // Wet, heavy snow
            } else if (humidity > 70 && temp > -5) {
              densityLoss = 0.04;
            }
            
            // Apply all losses multiplicatively
            let finalAdjustment = baseAdjustment;
            finalAdjustment *= (1 - windLoss);
            finalAdjustment *= (1 - solarLoss);
            finalAdjustment *= (1 - seasonalLoss);
            finalAdjustment *= (1 - densityLoss);
            
            adjusted = hourSnow * Math.max(0, finalAdjustment);
            realSnowfall += adjusted;
            
            // Track losses for reporting
            totalWindLoss += hourSnow * windLoss;
            totalSolarLoss += hourSnow * solarLoss;
            totalSeasonalLoss += hourSnow * seasonalLoss;
            totalRainLoss += hourSnow * (1 - baseAdjustment);
            
            if (adjusted > 0.05) {
              debugInfo.push({
                time: hour,
                snow: hourSnow.toFixed(1),
                freezing: freezingLevel,
                margin: margin.toFixed(0),
                wind: effectiveWind.toFixed(0),
                temp: temp.toFixed(1),
                adjustment: (finalAdjustment * 100).toFixed(0) + '%',
                result: adjusted.toFixed(1),
                reason,
                losses: `W:${(windLoss*100).toFixed(0)}% S:${(solarLoss*100).toFixed(0)}% Sn:${(seasonalLoss*100).toFixed(0)}%`
              });
            }
          }
          
          // Store adjusted snowfall for this hour
          adjustedSnowfallByHour.set(h.time, adjusted);
        } else {
          // No snow for this hour
          adjustedSnowfallByHour.set(h.time, 0);
        }
      });
      
      const snowfall = Math.max(realSnowfall, 0);
      
      // Calculate icon intelligently:
      // 1. If there's significant precipitation, use the hour with most precipitation
      // 2. Otherwise, use daytime hours (10:00-18:00) to determine icon based on cloudiness
      const totalPrecip = hours.reduce((sum, h) => sum + (h.precipitation || 0) + (h.snowfall || 0), 0);
      
      let representativeHour;
      if (totalPrecip > 0.5) {
        // Use hour with most precipitation
        representativeHour = hours.reduce((max, h) => {
          const precip = (h.precipitation || 0) + (h.snowfall || 0);
          const maxPrecip = (max.precipitation || 0) + (max.snowfall || 0);
          return precip > maxPrecip ? h : max;
        }, hours[0]);
      } else {
        // Use daytime hours (10:00-18:00) to avoid night/early morning bias
        const daytimeHours = hours.filter(h => {
          const hour = new Date(h.time).getHours();
          return hour >= 10 && hour <= 18;
        });
        
        if (daytimeHours.length > 0) {
          // Use the hour with highest cloud cover during daytime
          representativeHour = daytimeHours.reduce((max, h) => {
            return (h.cloudCover || 0) > (max.cloudCover || 0) ? h : max;
          }, daytimeHours[0]);
        } else {
          // Fallback to afternoon hour
          representativeHour = hours.find(h => new Date(h.time).getHours() === 15) || hours[Math.floor(hours.length / 2)];
        }
      }
      
      const icon = getWeatherIcon({
        hour: new Date(representativeHour.time).getHours(),
        phase: representativeHour.phase,
        cloudCover: representativeHour.cloudCover,
        precipitation: (representativeHour.precipitation || 0) + (representativeHour.snowfall || 0),
      });
      
      // Helper function to calculate wind impact for hourly data
      // Note: windSpeed already comes specific for selected elevation band
      // We only need to apply the model correction factor
      const calculateHourlyWindImpact = (windSpeed: number, temp: number) => {
        // Models tend to underestimate mountain wind by ~20-30%
        const modelCorrectionFactor = 1.25;
        const adjustedWind = Math.round(windSpeed * modelCorrectionFactor);
        
        // Determine category
        let category: 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME' = 'CALM';
        if (adjustedWind >= 50) category = 'EXTREME';
        else if (adjustedWind >= 30) category = 'STRONG';
        else if (adjustedWind >= 15) category = 'MODERATE';
        
        return { adjustedWind, category };
      };

      const rawSnowfall = hours.reduce((sum, h) => sum + (h.snowfall || 0), 0);
      
      console.log(`[SnowEngine] ${dayName}: Raw=${rawSnowfall.toFixed(1)}cm, Adjusted=${realSnowfall.toFixed(1)}cm, Reduction=${((1 - realSnowfall/rawSnowfall) * 100).toFixed(0)}%`);
      
      const dayData = {
        dateKey,
        day: dayName,
        date: dayDate,
        snowfall: Math.round(realSnowfall * 10) / 10,
        tempHigh: Math.round(Math.max(...temps)),
        tempLow: Math.round(Math.min(...temps)),
        icon,
        hourlyDetails: hours.map(h => {
          const windImpact = calculateHourlyWindImpact(h.windSpeed || 0, h.temperature || 0);
          const adjustedSnow = adjustedSnowfallByHour.get(h.time) || 0;
          return {
            time: new Date(h.time),
            temperature: h.temperature,
            precipitation: h.precipitation || 0,
            snowfall: adjustedSnow, // Use adjusted snowfall instead of raw
            windSpeed: h.windSpeed || 0,
            windGust: h.windGust,
            windDirection: h.windDirection,
            adjustedWindSpeed: windImpact.adjustedWind,
            windCategory: windImpact.category,
            humidity: h.humidity || 0,
            freezingLevel: h.freezingLevel || 0,
            phase: h.phase || 'none',
            icon: getWeatherIcon({
              hour: new Date(h.time).getHours(),
              phase: h.phase || 'none',
              cloudCover: h.cloudCover || 0,
              precipitation: (h.precipitation || 0) + (h.snowfall || 0)
            })
          };
        }),
        stormCrossing: undefined,
        snowReality: undefined,
        windImpact: undefined
      };
      
      days.push(dayData);
    });
    
    // Don't limit here - let the filter handle it to ensure 7 days after filtering
    return days;
  };

  if (loading || !resort) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#63b3ed" />
        <Text style={styles.loadingText}>Cargando pronóstico...</Text>
      </View>
    );
  }

  const dailyForecasts = getDailyForecasts();

  // Get current hour data - use first future hour to match hourly forecast display
  const getCurrentHourData = () => {
    if (!hourlyData || hourlyData.length === 0) return null;
    
    // Find the hour closest to current time (within ±30 minutes)
    const now = new Date();
    const currentHourTimestamp = now.getTime();
    
    // Find the closest hour to now
    let closestHour = hourlyData[0];
    let minDiff = Math.abs(new Date(hourlyData[0].time).getTime() - currentHourTimestamp);
    
    for (const hour of hourlyData) {
      const hourTime = new Date(hour.time).getTime();
      const diff = Math.abs(hourTime - currentHourTimestamp);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestHour = hour;
      }
    }
    
    console.log('[getCurrentHourData] Current time:', now.toISOString());
    console.log('[getCurrentHourData] Using closest hour:', new Date(closestHour.time).toISOString());
    console.log('[getCurrentHourData] Data:', {
      temp: closestHour.temperature,
      wind: closestHour.windSpeed,
      freezing: closestHour.freezingLevel,
      phase: closestHour.phase,
      cloudCover: closestHour.cloudCover
    });
    
    return closestHour;
  };

  // Calculate wind adjustment
  // Note: hourlyData already comes specific for selected elevation band
  // Show raw values from DB without correction to match hourly forecast
  const getAdjustedWind = () => {
    // Prioritize conditions.byElevation for elevation-specific wind data
    let windSpeed = 0;
    if (conditions?.byElevation?.[selectedElevation]?.windSpeed) {
      windSpeed = conditions.byElevation[selectedElevation].windSpeed;
      console.log(`[WIND] Using conditions.byElevation.${selectedElevation}.windSpeed:`, windSpeed);
    } else {
      const currentHour = getCurrentHourData();
      if (!currentHour) return null;
      windSpeed = currentHour.windSpeed || 0;
      console.log('[WIND] Using hourly forecast windSpeed:', windSpeed);
    }
    
    // Don't apply correction - show raw DB values
    const adjustedWindKmh = windSpeed;
    
    // Determine category
    let category = 'CALM';
    if (adjustedWindKmh >= 50) category = 'EXTREME';
    else if (adjustedWindKmh >= 30) category = 'STRONG';
    else if (adjustedWindKmh >= 15) category = 'MODERATE';
    
    return {
      adjustedWindKmh,
      category
    };
  };

  const currentWindImpact = getAdjustedWind();

  return (
    <ImageBackground
      source={require('../../../../assets/cerro-catedral-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.overlay} />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
      {/* Resort Header Card */}
      <View style={styles.headerCard}>
        <ImageBackground
          source={require('../../../../assets/Background_home.jpeg')}
          style={styles.headerCardBackground}
          imageStyle={styles.headerCardImage}
        >
          <View style={styles.headerCardGradient}>
            <View style={styles.headerCardContent}>
              <View style={styles.headerTop}>
                <View style={styles.headerMainInfo}>
                  <Text style={styles.resortName}>{resort.name}</Text>
                  {(() => {
                    const season = getSkiSeason();
                    if (season === 'pre-season') {
                      return (
                        <View style={styles.seasonBadge}>
                          <Ionicons name="snow-outline" size={10} color="#94a3b8" />
                          <Text style={styles.seasonBadgeText}>Pre-temporada</Text>
                        </View>
                      );
                    } else if (season === 'off-season') {
                      return (
                        <View style={[styles.seasonBadge, { backgroundColor: 'rgba(100, 116, 139, 0.2)' }]}>
                          <Ionicons name="close-circle-outline" size={12} color="#64748b" />
                          <Text style={[styles.seasonBadgeText, { color: '#64748b' }]}>FUERA DE TEMPORADA</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <Text style={styles.headerLocation}>{resort.region}, Argentina</Text>
                  <Text style={styles.headerStatsText}>
                    {(() => {
                      const name = resort.name.toLowerCase();
                      if (name.includes('catedral')) return '120km esquiables • 53 pistas';
                      if (name.includes('chapelco')) return '140km esquiables • 35 pistas';
                      if (name.includes('bayo')) return '30km esquiables • 24 pistas';
                      if (name.includes('castor')) return '35km esquiables • 28 pistas';
                      return '35km esquiables • 28 pistas';
                    })()}
                  </Text>
                </View>
                <View style={styles.headerRightInfo}>
                  <Image 
                    source={require('../../../../assets/Logo_horizontal.png')} 
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.headerSunInfo}>
                    <View style={styles.sunItem}>
                      <Text style={styles.sunLabel}>Amanecer</Text>
                      <Text style={styles.sunTime}>07:24</Text>
                    </View>
                    <View style={styles.sunItem}>
                      <Text style={styles.sunLabel}>Atardecer</Text>
                      <Text style={styles.sunTime}>19:48</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.elevationSelector}>
        {(['base', 'mid', 'summit'] as ElevationBand[]).map((elevation) => (
          <TouchableOpacity
            key={elevation}
            style={[
              styles.elevationButton,
              selectedElevation === elevation && styles.elevationButtonActive,
            ]}
            onPress={() => setSelectedElevation(elevation)}
          >
            {/* Elevation indicator bar */}
            <View style={styles.elevationIndicatorContainer}>
              <View style={[
                styles.elevationIndicator,
                elevation === 'base' && styles.elevationIndicatorBase,
                elevation === 'mid' && styles.elevationIndicatorMid,
                elevation === 'summit' && styles.elevationIndicatorSummit,
                selectedElevation === elevation && styles.elevationIndicatorActive,
              ]} />
            </View>
            
            {/* Content */}
            <View style={styles.elevationButtonContent}>
              <Text style={[styles.elevationButtonLabel, selectedElevation === elevation && styles.elevationButtonLabelActive]}>
                {elevation === 'base' ? 'BASE' : elevation === 'mid' ? 'MID' : 'SUMMIT'}
              </Text>
              <Text style={[styles.elevationButtonMeters, selectedElevation === elevation && styles.elevationButtonMetersActive]}>
                {resort ? (elevation === 'base' ? resort.baseElevation : elevation === 'mid' ? resort.midElevation : resort.summitElevation) : '---'}
              </Text>
              <Text style={[styles.elevationButtonUnit, selectedElevation === elevation && styles.elevationButtonUnitActive]}>
                METERS
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {(() => {
        const currentHour = getCurrentHourData();
        if (!currentHour) return null;
        
        return (
        <View style={styles.liveCard}>
          <ImageBackground
            source={require('../../../../assets/nieve-catedral-live.jpg')}
            style={styles.liveCardBackground}
            imageStyle={styles.liveCardBackgroundImage}
          >
            <View style={[
              styles.liveCardOverlay,
              currentHour.phase === 'snow' && styles.liveCardSnow,
              currentHour.phase === 'rain' && styles.liveCardRain,
              (!currentHour.phase || currentHour.phase === 'none') && styles.liveCardClear,
            ]} />
          <View style={styles.liveCardContent}>
          <View style={styles.liveHeader}>
            <TouchableOpacity 
              style={styles.liveBadge}
              onPress={() => setWebcamsVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.livePulse} />
              <Text style={styles.liveLabel}>LIVE</Text>
              <Ionicons name="videocam" size={14} color="#fff" style={styles.webcamIcon} />
            </TouchableOpacity>
            <View style={styles.elevationInfo}>
              <Text style={styles.elevationText}>
                {selectedElevation === 'base' ? 'BASE' : selectedElevation === 'mid' ? 'MID' : 'SUMMIT'} • {resort ? (selectedElevation === 'base' ? resort.baseElevation : selectedElevation === 'mid' ? resort.midElevation : resort.summitElevation) : '---'}m
              </Text>
              <View style={styles.freezingLevelBadge}>
                <Ionicons name="snow-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.freezingLevel}>
                  Frz {Math.round(currentHour.freezingLevel || 2000)}m
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.mainDisplay}>
            <View style={styles.tempSection}>
              <Text style={styles.weatherIcon}>
                {getWeatherIcon({
                  hour: new Date().getHours(),
                  phase: currentHour.phase || 'none',
                  cloudCover: currentHour.cloudCover || 0,
                  precipitation: currentHour.precipitation || 0
                })}
              </Text>
              <Text style={styles.bigTemp}>{Math.round(currentHour.temperature || 0)}°</Text>
              <Text style={styles.tempUnit}>C</Text>
            </View>
            <View style={styles.quickMetrics}>
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickLabel}>WIND</Text>
                <View style={styles.quickValueRow}>
                  <Text style={[
                    styles.quickValue,
                    currentWindImpact?.category === 'EXTREME' && styles.windExtreme,
                    currentWindImpact?.category === 'STRONG' && styles.windStrong,
                    currentWindImpact?.category === 'MODERATE' && styles.windModerate,
                  ]}>{Math.round(currentWindImpact?.adjustedWindKmh || currentHour.windSpeed || 0)}</Text>
                  <Text style={styles.quickUnit}>km/h</Text>
                </View>
              </View>
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickLabel}>HUMIDITY</Text>
                <View style={styles.quickValueRow}>
                  <Text style={styles.quickValue}>{Math.round(currentHour.humidity || 50)}</Text>
                  <Text style={styles.quickUnit}>%</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Wind Narrative - Separate compact section */}
          {(() => {
            const windDir = currentHour.windDirection || 270;
            const windSpeed = currentWindImpact?.adjustedWindKmh || currentHour.windSpeed || 0;
            const precip = currentHour.precipitation || 0;
            const narrative = getWindNarrative(windDir, windSpeed, precip);
            const dirLabel = getWindDirectionLabel(windDir);
            
            // Get wind trend (compare current with 6-8 hours ahead)
            const futureWindDir = hourlyData[6]?.windDirection || hourlyData[8]?.windDirection || windDir;
            const trend = getWindTrend(windDir, futureWindDir);
            
            return (
              <TouchableOpacity 
                style={styles.windNarrativeSection}
                onPress={() => setWindExplanationVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="compass-outline" size={16} color={narrative.color} />
                <Text style={[styles.windDirectionBadge, { backgroundColor: narrative.color }]}>
                  {dirLabel}
                </Text>
                <Text style={styles.windNarrativeText}>{narrative.context}</Text>
                
                {/* Wind Trend Arrow */}
                {trend.rotating && (
                  <View style={styles.windTrendContainer}>
                    <Text style={styles.windTrendArrow}>{trend.arrow}</Text>
                    <Text style={styles.windTrendLabel}>{trend.futureLabel}</Text>
                  </View>
                )}
                
                <Ionicons name="information-circle-outline" size={18} color="#64748b" style={{ marginLeft: trend.rotating ? 8 : 'auto' }} />
              </TouchableOpacity>
            );
          })()}
          
          {/* Snow metrics - always show comparison data for consistency */}
          <View style={styles.glassMetrics}>
            {(() => {
              // Show TODAY's comparison: raw Open-Meteo vs our adjusted forecast
                  // This is educational and shows why we're different
                  
                  // Get today's hourly data to calculate raw snowfall
                  const now = new Date();
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const todayEnd = new Date(todayStart);
                  todayEnd.setDate(todayEnd.getDate() + 1);
                  
                  const todayHours = hourlyData.filter(h => {
                    const hourTime = new Date(h.time);
                    return hourTime >= todayStart && hourTime < todayEnd;
                  });
                  
                  // Calculate RAW snowfall (what Open-Meteo says without adjustments)
                  const rawTodaySnowfall = todayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
                  
                  // Our adjusted forecast uses Snow Reality Engine
                  const adjustedTodaySnowfall = todayRealSnowfall;
                  
                  // Calculate adjustment percentage
                  const adjustmentPercent = rawTodaySnowfall > 0 
                    ? Math.round(((rawTodaySnowfall - adjustedTodaySnowfall) / rawTodaySnowfall) * 100)
                    : 0;
                  
                  // Calculate next 7 days total
                  const next7Days = dailyForecast.slice(0, 7);
                  const total7Days = next7Days.reduce((sum: number, day: any) => sum + (day.snowfall || 0), 0);
                  
                  return (
                    <>
                      <View style={styles.glassBox}>
                        <Text style={styles.metricLabel}>GENÉRICO</Text>
                        <Text style={styles.glassNumber}>{Math.round(rawTodaySnowfall * 10) / 10}</Text>
                        <Text style={styles.glassUnit}>cm</Text>
                      </View>
                      <View style={styles.glassBox}>
                        <Text style={styles.metricLabel}>ANDES</Text>
                        <Text style={styles.glassNumber}>{Math.round(adjustedTodaySnowfall * 10) / 10}</Text>
                        <Text style={styles.glassUnit}>cm</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.glassBox}
                        onPress={() => setAdjustmentModalVisible(true)}
                      >
                        <Text style={styles.metricLabel}>AJUSTE</Text>
                        <Text style={styles.glassNumber}>{adjustmentPercent > 0 ? `-${adjustmentPercent}` : adjustmentPercent}%</Text>
                        <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
                      </TouchableOpacity>
                      <View style={styles.glassBox}>
                        <Text style={styles.metricLabel}>PRÓX 7D</Text>
                        <Text style={styles.glassNumber}>{Math.round(total7Days * 10) / 10}</Text>
                        <Text style={styles.glassUnit}>cm</Text>
                      </View>
                    </>
                  );
            })()}
          </View>
          </View>
          </ImageBackground>
        </View>
        );
      })()}

      {/* Best Time to Ski */}
      {bestTimeWindows.length > 0 && (
        <BestTimeCard windows={bestTimeWindows} />
      )}

      {/* Weekly Forecast - Horizontal Scroll */}
      {dailyForecast.length > 0 && (
        <View style={styles.dailyForecastSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyCardsContainer}
          >
            {dailyForecast.map((day, index) => {
              const [dy, dm, dd] = day.date.split('-').map(Number);
              const date = new Date(dy, dm - 1, dd);
              const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
              const dateStr = date.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
              
              console.log(`[RENDER] Day ${index}:`, dayName, dateStr, `${day.snowfall}cm`, `${day.maxTemp}°/${day.minTemp}°`);
              
              // Find trending data for this date
              const dayTrending = trendingData.find(t => t.date === day.date);
              
              return (
                <DailyForecastCard
                  key={index}
                  day={dayName}
                  date={dateStr}
                  snowfall={day.snowfall}
                  tempHigh={day.maxTemp}
                  tempLow={day.minTemp}
                  icon={day.icon || '☀️'}
                  hourlyDetails={day.hourlyDetails || []}
                  stormCrossing={stormCrossingData?.[index] || undefined}
                  confidenceScore={day.confidenceScore}
                  confidenceReason={day.confidenceReason}
                  trending={dayTrending ? {
                    change: dayTrending.change,
                    changePercent: dayTrending.changePercent,
                    trend: dayTrending.trend
                  } : undefined}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Weekly Summary - Total snowfall, bar chart, and best day recommendation */}
      {dailyForecast.length > 0 && (
        <WeeklySummary 
          days={dailyForecast.map(day => ({
            date: day.date,
            dayName: (() => { const [wy, wm, wd] = day.date.split('-').map(Number); return new Date(wy, wm - 1, wd).toLocaleDateString('es-AR', { weekday: 'short' }); })(),
            snowfall: day.snowfall || 0,
            temperature: day.maxTemp || 0,
            windSpeed: day.maxWindSpeed || 0,
            powderScore: day.powderScore || 0
          }))}
          elevation={selectedElevation}
        />
      )}

      </ScrollView>

      {/* Webcams Modal */}
      <WebcamsModal
        visible={webcamsVisible}
        onClose={() => setWebcamsVisible(false)}
        resortName={resort?.name || 'Cerro Catedral'}
      />

      {/* Adjustment Explanation Modal */}
      <Modal
        visible={adjustmentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAdjustmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Ajuste de Pronóstico</Text>
                <Text style={styles.modalSubtitle}>Andes Powder Engine</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustmentModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1a365d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.adjustmentModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.adjustmentModalDescription}>
                Los modelos meteorológicos globales no capturan las particularidades de la Patagonia. Nuestro algoritmo propietario aplica correcciones basadas en años de datos históricos y condiciones locales específicas.
              </Text>
              
              <View style={styles.adjustmentFactorsSection}>
                <View style={styles.adjustmentFactor}>
                  <View style={styles.adjustmentFactorHeader}>
                    <View style={styles.factorIconContainer}>
                      <Ionicons name="thermometer-outline" size={20} color="#0ea5e9" />
                    </View>
                    <Text style={styles.adjustmentFactorTitle}>Análisis Térmico Vertical</Text>
                  </View>
                  <Text style={styles.adjustmentFactorText}>
                    Evaluamos la estructura térmica de la atmósfera y su relación con la topografía del cerro. El nivel de congelación determina la fase de la precipitación y la eficiencia de acumulación en cada banda de elevación.
                  </Text>
                </View>
                
                <View style={styles.adjustmentFactor}>
                  <View style={styles.adjustmentFactorHeader}>
                    <View style={styles.factorIconContainer}>
                      <Ionicons name="flag-outline" size={20} color="#0ea5e9" />
                    </View>
                    <Text style={styles.adjustmentFactorTitle}>Dinámica Eólica Regional</Text>
                  </View>
                  <Text style={styles.adjustmentFactorText}>
                    Los vientos del oeste característicos de Patagonia generan redistribución significativa de nieve. Aplicamos factores de corrección diferenciados por elevación y exposición al viento dominante.
                  </Text>
                </View>
                
                <View style={styles.adjustmentFactor}>
                  <View style={styles.adjustmentFactorHeader}>
                    <View style={styles.factorIconContainer}>
                      <Ionicons name="sunny-outline" size={20} color="#0ea5e9" />
                    </View>
                    <Text style={styles.adjustmentFactorTitle}>Balance Radiativo</Text>
                  </View>
                  <Text style={styles.adjustmentFactorText}>
                    La radiación solar incidente varía según latitud, estación y hora del día. Modelamos el impacto en la ablación superficial y persistencia del manto nivoso.
                  </Text>
                </View>
                
                <View style={styles.adjustmentFactor}>
                  <View style={styles.adjustmentFactorHeader}>
                    <View style={styles.factorIconContainer}>
                      <Ionicons name="analytics-outline" size={20} color="#0ea5e9" />
                    </View>
                    <Text style={styles.adjustmentFactorTitle}>Calibración Histórica</Text>
                  </View>
                  <Text style={styles.adjustmentFactorText}>
                    Validamos y ajustamos continuamente nuestro modelo contra observaciones reales de nevadas en los principales centros de esquí de la región.
                  </Text>
                </View>
              </View>
              
              <View style={styles.adjustmentSummaryBox}>
                <Text style={styles.adjustmentSummaryTitle}>Resultado</Text>
                <Text style={styles.adjustmentSummaryText}>
                  El pronóstico ajustado representa una estimación más precisa de la acumulación real esperada, considerando las condiciones meteorológicas y topográficas específicas de cada cerro.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wind Explanation Modal */}
      {(() => {
        const currentHour = getCurrentHourData();
        const windDir = currentHour?.windDirection || 270;
        const windSpeed = currentWindImpact?.adjustedWindKmh || conditions?.byElevation[selectedElevation]?.windSpeed || 0;
        const futureWindDir = hourlyData[6]?.windDirection || hourlyData[8]?.windDirection;
        const explanation = getWindExplanation(windDir, windSpeed, futureWindDir);
        
        return (
          <Modal
            visible={windExplanationVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setWindExplanationVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.windModalContent}>
                <View style={styles.windModalHeader}>
                  <Text style={styles.windModalTitle}>{explanation.title}</Text>
                  <TouchableOpacity onPress={() => setWindExplanationVisible(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#64748b" />
                  </TouchableOpacity>
                </View>
                
                {/* Current Wind Condition */}
                <View style={styles.currentWindBox}>
                  <View style={styles.currentWindHeader}>
                    <Ionicons name="speedometer-outline" size={20} color="#0c4a6e" />
                    <Text style={styles.currentWindLabel}>Condición Actual</Text>
                  </View>
                  <View style={styles.currentWindData}>
                    <View style={styles.currentWindItem}>
                      <Text style={styles.currentWindValue}>{Math.round(windSpeed)}</Text>
                      <Text style={styles.currentWindUnit}>km/h</Text>
                    </View>
                    <View style={styles.currentWindDivider} />
                    <View style={styles.currentWindItem}>
                      <Text style={styles.currentWindDirection}>{getWindDirectionLabel(windDir)}</Text>
                      <Text style={styles.currentWindDegrees}>{Math.round(windDir)}°</Text>
                    </View>
                  </View>
                </View>
                
                <ScrollView style={styles.windModalScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.windModalDescription}>{explanation.description}</Text>
                  
                  <View style={styles.windDetailsSection}>
                    {explanation.details.map((detail: string, index: number) => (
                      <View key={index} style={styles.windDetailItem}>
                        <Text style={styles.windDetailText}>{detail}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.windImpactBox}>
                    <Text style={styles.windImpactLabel}>Impacto en Ski</Text>
                    <Text style={styles.windImpactText}>{explanation.impact}</Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        );
      })()}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 1.0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%)',
  },
  // Header Card Container
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerCardBackground: {
    minHeight: 110,
  },
  headerCardImage: {
    borderRadius: 20,
  },
  headerCardGradient: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  headerCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerMainInfo: {
    flex: 1,
  },
  resortName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  seasonBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  headerLocation: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerStatsText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  headerRightInfo: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerLogo: {
    width: 120,
    height: 28,
  },
  headerSunInfo: {
    alignItems: 'flex-end',
  },
  sunItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 3,
  },
  sunLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sunTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  elevationSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  elevationButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  elevationButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0284c7',
  },
  elevationIndicatorContainer: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  elevationIndicator: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  elevationIndicatorBase: {
    width: '33%',
  },
  elevationIndicatorMid: {
    width: '66%',
  },
  elevationIndicatorSummit: {
    width: '100%',
  },
  elevationIndicatorActive: {
    backgroundColor: '#0284c7',
  },
  elevationButtonContent: {
    alignItems: 'center',
  },
  elevationButtonLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  elevationButtonLabelActive: {
    color: '#fff',
  },
  elevationButtonMeters: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -0.3,
  },
  elevationButtonMetersActive: {
    color: '#fff',
  },
  elevationButtonUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 1,
  },
  elevationButtonUnitActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // LIVE Card
  liveCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  liveCardBackground: {
    minHeight: 200,
  },
  liveCardBackgroundImage: {
    borderRadius: 20,
  },
  liveCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
  },
  liveCardSnow: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  liveCardRain: {
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
  },
  liveCardClear: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  liveCardContent: {
    padding: 14,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  webcamIcon: {
    marginLeft: 2,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  elevationInfo: {
    alignItems: 'flex-end',
  },
  elevationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  freezingLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginTop: 4,
  },
  freezingLevel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mainDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tempSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weatherIcon: {
    fontSize: 38,
    marginRight: 6,
  },
  bigTemp: {
    fontSize: 56,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -3,
    lineHeight: 56,
  },
  tempUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 2,
  },
  quickMetrics: {
    gap: 12,
  },
  quickMetricItem: {
    alignItems: 'flex-end',
  },
  quickLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  quickValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  quickValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -0.5,
  },
  quickUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0c4a6e',
    opacity: 0.7,
  },
  windCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  windExtreme: {
    color: '#ef4444',
  },
  windStrong: {
    color: '#f97316',
  },
  windModerate: {
    color: '#eab308',
  },
  windNarrativeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  windDirectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  windNarrativeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0c4a6e',
    lineHeight: 16,
  },
  windTrendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(100, 116, 139, 0.3)',
  },
  windTrendArrow: {
    fontSize: 16,
    color: '#64748b',
  },
  windTrendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  snowAnalysisSection: {
    marginTop: 12,
    marginBottom: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(12, 74, 110, 0.15)',
  },
  snowAnalysisTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  glassMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  glassBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(12, 74, 110, 0.2)',
    minHeight: 80,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'center',
  },
  glassNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -0.5,
    marginBottom: 1,
    textAlign: 'center',
    lineHeight: 26,
  },
  glassUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0c4a6e',
    opacity: 0.7,
  },
  glassQuality: {
  },
  qualityPowder: {
    color: '#38bdf8',
  },
  qualityPacked: {
    color: '#94a3b8',
  },
  qualityWet: {
    color: '#f97316',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  dailyForecastSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dailyCardWrapper: {
    marginBottom: 12,
  },
  dailyCardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  chartsSection: {
    marginBottom: 20,
  },
  
  // Last 5 Days History Section
  historySection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  historyTable: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  historyDateColumn: {
    flex: 1,
  },
  historyDayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  historySnowColumn: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  historySnowValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -1,
  },
  historySnowUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  
  // Wind Explanation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  windModalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  windModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  currentWindBox: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  currentWindHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  currentWindLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 0.5,
  },
  currentWindData: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  currentWindItem: {
    alignItems: 'center',
    flex: 1,
  },
  currentWindValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -1,
  },
  currentWindUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    marginTop: 2,
  },
  currentWindDirection: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 0.5,
  },
  currentWindDegrees: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    marginTop: 2,
  },
  currentWindDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#bae6fd',
  },
  windModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  windModalScroll: {
    paddingHorizontal: 20,
  },
  windModalDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 20,
  },
  windDetailsSection: {
    gap: 12,
    marginBottom: 20,
  },
  windDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  windDetailText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    flex: 1,
  },
  windImpactBox: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  windImpactLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  windImpactText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c4a6e',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  forecastHeader: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 1,
    marginBottom: 8,
  },
  forecastUnderline: {
    height: 3,
    width: 60,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyUnderline: {
    height: 3,
    width: 60,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
  },
  historyEmpty: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  historyEmptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  // Adjustment Modal Styles
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a365d',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  adjustmentModalScroll: {
    paddingHorizontal: 20,
  },
  adjustmentModalDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  adjustmentFactorsSection: {
    gap: 16,
  },
  adjustmentFactor: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adjustmentFactorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  adjustmentFactorIcon: {
    fontSize: 24,
  },
  factorIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentFactorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  adjustmentFactorText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  adjustmentFactorDetails: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  adjustmentDetailItem: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  adjustmentSummaryBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  adjustmentSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  adjustmentSummaryText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
