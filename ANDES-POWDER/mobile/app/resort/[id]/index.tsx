import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resortsService } from '../../../services/resorts';
import { Resort, CurrentConditions, ElevationBand } from '../../../types';
import { DailyForecastCard } from '../../../components/DailyForecastCard';
import { SnowfallChart } from '../../../components/SnowfallChart';
import { TemperatureCurve } from '../../../components/TemperatureCurve';
import { WebcamsModal } from '../../../components/WebcamsModal';
import { getWeatherIcon } from '../../../utils/weather-icons';
import { getWindNarrative, getWindDirectionLabel, getWindExplanation, getWindTrend, getSkiSeason } from '../../../utils/wind-narrative';

export default function ResortDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [resort, setResort] = useState<Resort | null>(null);
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [selectedElevation, setSelectedElevation] = useState<ElevationBand>('mid');
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [yesterdaySnowfall, setYesterdaySnowfall] = useState<number>(0);
  const [last5DaysSnowfall, setLast5DaysSnowfall] = useState<any[]>([]);
  const [dailyForecast, setDailyForecast] = useState<any[]>([]);
  const [stormCrossingData, setStormCrossingData] = useState<any>(null);
  const [snowRealityData, setSnowRealityData] = useState<any>(null);
  const [windImpactData, setWindImpactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [webcamsVisible, setWebcamsVisible] = useState(false);
  const [windExplanationVisible, setWindExplanationVisible] = useState(false);

  useEffect(() => {
    loadResortData();
  }, [id, selectedElevation]);

  const loadResortData = async () => {
    try {
      setLoading(true);
      console.log('Loading resort data for:', id, 'elevation:', selectedElevation);
      
      const resortData = await resortsService.getById(id);
      console.log('Resort data loaded:', resortData?.name);
      setResort(resortData);
      
      try {
        const conditionsData = await resortsService.getCurrentConditions(id);
        console.log('Conditions loaded');
        setConditions(conditionsData);
      } catch (error) {
        console.warn('Failed to load conditions:', error);
        setConditions(null);
      }
      
      let hourlyForecast: any[] = [];
      try {
        hourlyForecast = await resortsService.getHourlyForecast(id, selectedElevation, 168);
        console.log('Hourly forecast loaded:', hourlyForecast?.length, 'hours');
      } catch (error) {
        console.warn('Failed to load hourly forecast:', error);
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
      
      // Calculate yesterday's total snowfall (complete day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayHours = hourlyForecast.filter((h: any) => {
        const date = new Date(h.time);
        return date.getDate() === yesterday.getDate() && 
               date.getMonth() === yesterday.getMonth() &&
               date.getFullYear() === yesterday.getFullYear();
      });
      const yesterdayTotal = yesterdayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
      setYesterdaySnowfall(yesterdayTotal);
      console.log(`[YESTERDAY] Total snowfall: ${yesterdayTotal.toFixed(2)} cm from ${yesterdayHours.length} hours`);
      
      // Calculate last 5 days snowfall history
      const last5Days = [];
      for (let i = 1; i <= 5; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        const dayHours = hourlyForecast.filter((h: any) => {
          const date = new Date(h.time);
          return date.getDate() === targetDate.getDate() && 
                 date.getMonth() === targetDate.getMonth() &&
                 date.getFullYear() === targetDate.getFullYear();
        });
        const dayTotal = dayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
        last5Days.push({
          date: targetDate,
          snowfall: dayTotal,
          dayName: targetDate.toLocaleDateString('es-AR', { weekday: 'short' }),
          dayNumber: targetDate.getDate(),
          month: targetDate.toLocaleDateString('es-AR', { month: 'short' })
        });
      }
      setLast5DaysSnowfall(last5Days.reverse()); // Reverse to show oldest first
      console.log('[LAST 5 DAYS] Snowfall history:', last5Days);
      
      setHourlyData(hourlyForecast);
      
      // Use hourly forecast to build daily forecast (more reliable than backend endpoint)
      // Group hourly data by day
      const dailyMap = new Map<string, any[]>();
      hourlyForecast.forEach((h: any) => {
        const date = new Date(h.time);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, []);
        }
        dailyMap.get(dateKey)!.push(h);
      });
      
      // Build daily forecast from hourly data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyFromHourly = Array.from(dailyMap.entries())
        .filter(([dateKey, hours]) => {
          const date = new Date(dateKey);
          return date >= today;
        })
        .slice(0, 7)
        .map(([dateKey, hours]) => {
          const temps = hours.map(h => h.temperature);
          const maxTemp = Math.max(...temps);
          const minTemp = Math.min(...temps);
          const snowfall = hours.reduce((sum, h) => sum + (h.snowfall || 0), 0);
          const precipitation = hours.reduce((sum, h) => sum + (h.precipitation || 0), 0);
          const maxWindSpeed = Math.max(...hours.map(h => h.windSpeed || 0));
          const avgCloudCover = hours.reduce((sum, h) => sum + (h.cloudCover || 0), 0) / hours.length;
          
          const hourlyDetails = hours.map((h: any) => ({
            time: new Date(h.time),
            temperature: h.temperature,
            precipitation: h.precipitation,
            snowfall: h.snowfall || 0,
            windSpeed: h.windSpeed,
            windDirection: h.windDirection,
            humidity: h.humidity || 70,
            freezingLevel: h.freezingLevel || 2000,
            phase: h.phase || 'unknown',
            icon: h.snowfall > 2 ? '🌨️' : h.snowfall > 0 ? '❄️' : h.precipitation > 0 ? '🌧️' : '☀️'
          }));
          
          return {
            date: dateKey,
            maxTemp,
            minTemp,
            snowfall,
            precipitation,
            maxWindSpeed,
            cloudCover: avgCloudCover,
            hourlyDetails
          };
        });
      
      setDailyForecast(dailyFromHourly);
      console.log('[DAILY FORECAST] Built from hourly data:', dailyFromHourly.length, 'days');
      
      // NOTE: Storm Crossing, Snow Reality, and Wind Impact engines are active
      // in the backend forecast processor but not yet exposed via API endpoints.
      // The adjustments are already applied to the snowfall values in hourly forecasts.
      
      // TODO: Implement API endpoints for these engines if we want to show detailed breakdowns
      // For now, the effects are already included in the snowfall calculations
      
      setStormCrossingData(null);
      setSnowRealityData(null);
      setWindImpactData(null);
      
    } catch (err) {
      console.error('Error loading resort data:', err);
      alert('Error loading data: ' + (err as Error).message);
    } finally {
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
      const elevationWindMultiplier = selectedElevation === 'summit' ? 1.8 : 
                                      selectedElevation === 'mid' ? 1.3 : 1.0;
      
      let realSnowfall = 0;
      let debugInfo: any[] = [];
      let totalWindLoss = 0;
      let totalRainLoss = 0;
      let totalSolarLoss = 0;
      let totalSeasonalLoss = 0;
      
      hours.forEach(h => {
        const hourSnow = h.snowfall || 0;
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
            
            const adjusted = hourSnow * Math.max(0, finalAdjustment);
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
        }
      });
      
      const snowfall = Math.max(realSnowfall, 0);
      
      const afternoonHour = hours.find(h => new Date(h.time).getHours() === 15) || hours[Math.floor(hours.length / 2)];
      const icon = getWeatherIcon({
        hour: new Date(afternoonHour.time).getHours(),
        phase: afternoonHour.phase,
        cloudCover: afternoonHour.cloudCover,
        precipitation: afternoonHour.precipitation,
      });
      
      // Helper function to calculate wind impact for hourly data
      const calculateHourlyWindImpact = (windSpeed: number, temp: number) => {
        if (!resort) return { adjustedWind: windSpeed, category: 'CALM' as const };
        
        // Adjust wind for elevation (simplified)
        const elevationMeters = selectedElevation === 'base' ? resort.baseElevation : 
                                selectedElevation === 'mid' ? resort.midElevation : 
                                resort.summitElevation;
        const BASE_ELEVATION = 840;
        const WIND_INCREASE_RATE = 0.0004;
        const elevationDiff = elevationMeters - BASE_ELEVATION;
        const multiplier = 1 + (elevationDiff * WIND_INCREASE_RATE);
        const adjustedWind = Math.round(windSpeed * multiplier);
        
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
          return {
            time: new Date(h.time),
            temperature: h.temperature,
            precipitation: h.precipitation || 0,
            snowfall: h.snowfall || 0,
            windSpeed: h.windSpeed || 0,
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
    
    return days.slice(0, 7);
  };

  if (loading || !resort || !conditions) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const dailyForecasts = getDailyForecasts();

  // Get current wind impact for selected elevation
  const getCurrentWindImpact = () => {
    if (!windImpactData?.forecasts) return null;
    
    // Find today's forecast for selected elevation
    const today = new Date().toISOString().split('T')[0];
    const windForecast = windImpactData.forecasts.find((f: any) => 
      f.validTime.startsWith(today) && f.elevation === selectedElevation
    );
    
    return windForecast?.analysis || null;
  };

  const currentWindImpact = getCurrentWindImpact();

  return (
    <ImageBackground
      source={require('../../../assets/cerro-catedral-bg.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.overlay} />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.push('/')}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Resort Header Card */}
      <View style={styles.headerCard}>
        <ImageBackground
          source={require('../../../assets/Background_home.jpeg')}
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
                          <Ionicons name="snow-outline" size={12} color="#f59e0b" />
                          <Text style={styles.seasonBadgeText}>PRE-TEMPORADA · Acumulando Base</Text>
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
                  <Text style={styles.headerStatsText}>120km esquiables • 53 pistas</Text>
                </View>
                <View style={styles.headerRightInfo}>
                  <Image 
                    source={require('../../../assets/Logo_horizontal.png')} 
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
                {elevation === 'base' ? resort.baseElevation : elevation === 'mid' ? resort.midElevation : resort.summitElevation}
              </Text>
              <Text style={[styles.elevationButtonUnit, selectedElevation === elevation && styles.elevationButtonUnitActive]}>
                METERS
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {conditions?.byElevation[selectedElevation] && (
        <View style={styles.liveCard}>
          <ImageBackground
            source={require('../../../assets/nieve-catedral-live.jpg')}
            style={styles.liveCardBackground}
            imageStyle={styles.liveCardBackgroundImage}
          >
            <View style={[
              styles.liveCardOverlay,
              conditions.byElevation[selectedElevation].phase === 'snow' && styles.liveCardSnow,
              conditions.byElevation[selectedElevation].phase === 'rain' && styles.liveCardRain,
              (!conditions.byElevation[selectedElevation].phase || conditions.byElevation[selectedElevation].phase === 'none') && styles.liveCardClear,
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
                {selectedElevation === 'base' ? 'BASE' : selectedElevation === 'mid' ? 'MID' : 'SUMMIT'} • {selectedElevation === 'base' ? resort.baseElevation : selectedElevation === 'mid' ? resort.midElevation : resort.summitElevation}m
              </Text>
              <Text style={styles.freezingLevel}>
                Frz {Math.round(conditions.current.freezingLevel || hourlyData[0]?.freezingLevel || 0)}m
              </Text>
            </View>
          </View>
          
          <View style={styles.mainDisplay}>
            <View style={styles.tempSection}>
              <Text style={styles.weatherIcon}>
                {getWeatherIcon({
                  hour: new Date().getHours(),
                  phase: conditions.byElevation[selectedElevation].phase || 'none',
                  cloudCover: conditions.byElevation[selectedElevation].cloudCover || 0,
                  precipitation: hourlyData[0]?.precipitation || 0
                })}
              </Text>
              <Text style={styles.bigTemp}>{Math.round(conditions.byElevation[selectedElevation].temperature)}°</Text>
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
                  ]}>{Math.round(currentWindImpact?.adjustedWindKmh || conditions.byElevation[selectedElevation].windSpeed || 0)}</Text>
                  <Text style={styles.quickUnit}>km/h</Text>
                </View>
              </View>
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickLabel}>HUMIDITY</Text>
                <View style={styles.quickValueRow}>
                  <Text style={styles.quickValue}>{Math.round(conditions.byElevation[selectedElevation].humidity || 0)}</Text>
                  <Text style={styles.quickUnit}>%</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Wind Narrative - Separate compact section */}
          {(() => {
            const windDir = hourlyData[0]?.windDirection || 270;
            const windSpeed = currentWindImpact?.adjustedWindKmh || conditions.byElevation[selectedElevation].windSpeed || 0;
            const precip = hourlyData[0]?.precipitation || 0;
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
          
          {/* Snow Analysis Section */}
          <View style={styles.snowAnalysisSection}>
            <Text style={styles.snowAnalysisTitle}>ANÁLISIS DE NIEVE</Text>
          </View>
          
          <View style={styles.glassMetrics}>
            <View style={styles.glassBox}>
              <Text style={styles.metricLabel}>FORECAST</Text>
              <Text style={styles.glassNumber}>{Math.round((conditions.byElevation[selectedElevation].snowfall24h || 0) / 0.75)}</Text>
              <Text style={styles.glassUnit}>cm</Text>
            </View>
            <View style={styles.glassBox}>
              <Text style={styles.metricLabel}>REAL</Text>
              <Text style={styles.glassNumber}>{Math.round(conditions.byElevation[selectedElevation].snowfall24h || 0)}</Text>
              <Text style={styles.glassUnit}>cm</Text>
            </View>
            <View style={styles.glassBox}>
              <Text style={styles.metricLabel}>POWDER</Text>
              <Text style={styles.glassNumber}>{Math.round(conditions.byElevation[selectedElevation].powderScore || 0)}/10</Text>
            </View>
            <View style={styles.glassBox}>
              <Text style={styles.metricLabel}>TIPO</Text>
              <Text style={styles.glassNumber}>
                {conditions.byElevation[selectedElevation].temperature < -5 ? 'PWD' :
                 conditions.byElevation[selectedElevation].temperature >= -5 && conditions.byElevation[selectedElevation].temperature < 0 ? 'PCK' :
                 conditions.byElevation[selectedElevation].temperature >= 0 && conditions.byElevation[selectedElevation].temperature < 2 ? 'DNS' : 'WET'}
              </Text>
            </View>
          </View>
          </View>
          </ImageBackground>
        </View>
      )}

      {/* Weekly Forecast */}
      {dailyForecast.length > 0 && (
        <View style={styles.dailyForecastSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyCardsContainer}
          >
            {dailyForecast.map((day, index) => {
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
              const dateStr = date.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
              
              return (
                <DailyForecastCard
                  key={index}
                  day={dayName}
                  date={dateStr}
                  snowfall={day.snowfall}
                  tempHigh={day.maxTemp}
                  tempLow={day.minTemp}
                  icon={day.snowfall > 5 ? '🌨️' : day.snowfall > 0 ? '❄️' : '☀️'}
                  hourlyDetails={day.hourlyDetails || []}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Last 5 Days Snowfall History */}
      {last5DaysSnowfall.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Últimos 5 Días - Nevadas Pronosticadas</Text>
          <View style={styles.historyTable}>
            {last5DaysSnowfall.map((day, index) => (
              <View key={index} style={styles.historyRow}>
                <View style={styles.historyDateColumn}>
                  <Text style={styles.historyDayName}>{day.dayName.toUpperCase()}</Text>
                  <Text style={styles.historyDate}>{day.dayNumber} {day.month}</Text>
                </View>
                <View style={styles.historySnowColumn}>
                  <Text style={styles.historySnowValue}>{Math.round(day.snowfall)}</Text>
                  <Text style={styles.historySnowUnit}>cm</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {hourlyData.length > 0 && (
        <View style={styles.chartsSection}>
          <TemperatureCurve 
            hourlyData={hourlyData.slice(0, 24).map((h: any) => ({
              time: new Date(h.time),
              temperature: h.temperature,
            }))}
          />
        </View>
      )}
      </ScrollView>

      {/* Webcams Modal */}
      <WebcamsModal
        visible={webcamsVisible}
        onClose={() => setWebcamsVisible(false)}
        resortName={resort?.name || 'Cerro Catedral'}
      />

      {/* Wind Explanation Modal */}
      {(() => {
        const windDir = hourlyData[0]?.windDirection || 270;
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
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  seasonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.5,
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
  freezingLevel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
    letterSpacing: 0.3,
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
    gap: 10,
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
    marginTop: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(12, 74, 110, 0.2)',
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  glassNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: -0.5,
    marginBottom: 1,
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
  
  dailyForecastSection: {
    marginBottom: 16,
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
    marginBottom: 20,
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
    fontSize: 14,
    lineHeight: 20,
    color: '#0c4a6e',
  },
});
