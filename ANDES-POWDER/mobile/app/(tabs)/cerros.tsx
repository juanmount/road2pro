import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { resortsService } from '../../services/resorts';
import { Resort, CurrentConditions } from '../../types';
import { getPowderScoreColor, getPowderScoreLabel } from '../../utils/powder-score';
import { getWeatherIcon } from '../../utils/weather-icons';
import OnboardingScreen from '../../components/OnboardingScreen';
import AlertsBanner from '../../components/AlertsBanner';
import alertsService, { Alert } from '../../services/alertsService';

interface OperationalStatus {
  available: boolean;
  liftsOpen: number | null;
  liftsTotal: number | null;
  runsOpenKm: number | null;
  runsTotalKm: number | null;
  resortOpen: boolean;
}

interface ResortWithConditions extends Resort {
  operationalStatus?: OperationalStatus | null;
  currentConditions?: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    phase: string;
    cloudCover: number;
    snowfall24h: number;
  } | null;
  todaySnowfall?: number;
  summitTodaySnowfall?: number;
  bestElevation?: 'base' | 'mid' | 'summit';
}

// Resort background images mapping
const resortImages: Record<string, any> = {
  'cerro-catedral': require('../../assets/cerro-catedral-bg.jpg'),
  'cerro-castor': require('../../assets/cerro-castor-bg.jpg'),
  'cerro-chapelco': require('../../assets/cerro-chapelco-bg.jpg'),
  'las-lenas': require('../../assets/cerro-lenas-bg.jpg'),
  'cerro-bayo': require('../../assets/cerro-bayo-bg.jpeg'),
  'la-hoya': require('../../assets/cerro-lahoya-bg.jpeg'),
  'caviahue': require('../../assets/cerro-caviahue-bg.jpg'),
};

const getResortImage = (slug: string) => {
  return resortImages[slug] || resortImages['cerro-catedral']; // Fallback to Catedral
};

export default function HomeScreen() {
  const router = useRouter();
  const [resorts, setResorts] = useState<ResortWithConditions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (!checkingOnboarding && !showOnboarding) {
      loadResorts();
      loadAlerts();
    }
  }, [checkingOnboarding, showOnboarding]);

  const loadAlerts = async () => {
    try {
      const data = await alertsService.getAllAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const getResortAlert = (resortName: string): Alert | undefined => {
    return alerts.find(alert => 
      alert.affectedRegions.some(region => 
        region.toLowerCase().includes(resortName.toLowerCase().split(' ')[1]) // Match "Catedral", "Chapelco", etc
      )
    );
  };

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(!completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const VISIT_KEY = 'resort_visit_counts';
  const CONDITIONS_CACHE_KEY = 'resort-list-conditions-v2';
  const CONDITIONS_CACHE_TTL = 15 * 60 * 1000; // 15 min

  const loadConditionsCache = async (allowStale = false): Promise<{ data: ResortWithConditions[]; ageMs: number } | null> => {
    try {
      const raw = await AsyncStorage.getItem(CONDITIONS_CACHE_KEY);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      const ageMs = Date.now() - timestamp;
      if (!allowStale && ageMs > CONDITIONS_CACHE_TTL) return null;
      return { data: data as ResortWithConditions[], ageMs };
    } catch { return null; }
  };

  const saveConditionsCache = async (data: ResortWithConditions[]) => {
    try {
      await AsyncStorage.setItem(CONDITIONS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  };

  const loadVisitCounts = async (): Promise<Record<string, number>> => {
    try {
      const raw = await AsyncStorage.getItem(VISIT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const registerVisit = async (slug: string) => {
    try {
      const counts = await loadVisitCounts();
      counts[slug] = (counts[slug] || 0) + 1;
      await AsyncStorage.setItem(VISIT_KEY, JSON.stringify(counts));
      setVisitCounts({ ...counts });
    } catch {
      // silent
    }
  };

  const loadResorts = async () => {
    try {
      setError(null);

      // Show cached data immediately, then refresh in background
      const [cached, counts] = await Promise.all([loadConditionsCache(), loadVisitCounts()]);
      setVisitCounts(counts);
      if (cached) {
        const sorted = [...cached.data].sort((a, b) => (counts[b.slug] || 0) - (counts[a.slug] || 0));
        setResorts(sorted);
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Fetch fresh data (always, cache or not)
      const data = await resortsService.getAll();
      
      // Load forecasts for each resort
      const resortsWithConditions = await Promise.all(
        data.map(async (resort) => {
          try {
            const [hourlyForecast, summitForecast, opStatus] = await Promise.all([
              resortsService.getHourlyForecast(resort.id, 'mid', 48),
              resortsService.getHourlyForecast(resort.id, 'summit', 48).catch(() => []),
              resortsService.getOperationalStatus(resort.id).catch(() => null),
            ]);
            
            if (!hourlyForecast || hourlyForecast.length === 0) {
              console.log(`[HOME] No hourly forecast for ${resort.name} - skipping conditions`);
              return resort;
            }
            
            // Find hour closest to current time (same logic as LIVE card)
            const now = new Date();
            let closestHour = hourlyForecast[0];
            let minDiff = Math.abs(new Date(hourlyForecast[0].time).getTime() - now.getTime());
            
            for (const hour of hourlyForecast) {
              const hourTime = new Date(hour.time);
              const diff = Math.abs(hourTime.getTime() - now.getTime());
              if (diff < minDiff) {
                minDiff = diff;
                closestHour = hour;
              }
            }
            
            const currentHour = closestHour;
            const snowHours24 = hourlyForecast.slice(0, 24).filter(
              (h: any) => h.phase === 'snow' || h.phase === 'mixed' || h.phase === 'sleet'
            );
            const snowfall24h = snowHours24.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);

            // HOY = snowfall from now until midnight tonight (remaining hours of today)
            const midnightTonight = new Date();
            midnightTonight.setHours(23, 59, 59, 999);
            const todayHours = hourlyForecast.filter((h: any) => {
              const t = new Date(h.time);
              return t >= now && t <= midnightTonight &&
                (h.phase === 'snow' || h.phase === 'mixed' || h.phase === 'sleet');
            });
            const todaySnowfall = todayHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);

            // Summit: compare using next 48h window (more representative than just rest-of-today)
            const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            const summitNext48hHours = (summitForecast || []).filter((h: any) => {
              const t = new Date(h.time);
              return t >= now && t <= next48h &&
                (h.phase === 'snow' || h.phase === 'mixed' || h.phase === 'sleet');
            });
            const summitSnow48h = summitNext48hHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
            const midNext48hHours = hourlyForecast.filter((h: any) => {
              const t = new Date(h.time);
              return t >= now && t <= next48h &&
                (h.phase === 'snow' || h.phase === 'mixed' || h.phase === 'sleet');
            });
            const midSnow48h = midNext48hHours.reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);

            // summitTodaySnowfall: use 48h window for badge visibility too
            const summitTodaySnowfall = summitSnow48h;

            const currentConditions = {
              temperature: currentHour.temperature,
              windSpeed: currentHour.windSpeed,
              windDirection: currentHour.windDirection,
              precipitation: currentHour.precipitation,
              phase: currentHour.phase,
              cloudCover: currentHour.cloudCover,
              snowfall24h,
            };
            
            console.log(`[HOME] ${resort.name}: Using hour ${new Date(currentHour.time).toISOString()}`);
            console.log(`[HOME] ${resort.name}: temp=${currentConditions.temperature}° wind=${currentConditions.windSpeed}km/h phase=${currentConditions.phase} cloudCover=${currentConditions.cloudCover}% today=${todaySnowfall}cm`);
            
            return { 
              ...resort, 
              currentConditions,
              operationalStatus: opStatus,
              todaySnowfall,
              summitTodaySnowfall: summitSnow48h > 0 ? summitSnow48h : undefined,
              bestElevation: (summitSnow48h > midSnow48h + 3 ? 'summit' : 'mid') as 'base' | 'mid' | 'summit',
            };
          } catch (err) {
            console.log(`[HOME] Failed to load forecast for ${resort.name}:`, err);
            return resort;
          }
        })
      );
      
      const sorted = [...resortsWithConditions].sort((a, b) =>
        (counts[b.slug] || 0) - (counts[a.slug] || 0)
      );
      setResorts(sorted);
      saveConditionsCache(sorted);
    } catch (err) {
      // On network error: fall back to stale cache if available
      const stale = await loadConditionsCache(true);
      if (stale) {
        const counts = await loadVisitCounts();
        const sorted = [...stale.data].sort((a, b) => (counts[b.slug] || 0) - (counts[a.slug] || 0));
        setResorts(sorted);
      } else if (resorts.length === 0) {
        setError('Sin conexión y sin datos guardados');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderResort = ({ item }: { item: ResortWithConditions }) => {
    const currentTemp = item.currentConditions?.temperature;
    const cloudCover = item.currentConditions?.cloudCover || 0;
    const phase = item.currentConditions?.phase || 'none';
    const powderScore = 0;
    
    return (
      <TouchableOpacity
        style={styles.resortCard}
        onPress={() => {
          registerVisit(item.slug);
          const elev = item.bestElevation || 'mid';
          router.push(`/(tabs)/resort/${item.slug}?bestElevation=${elev}`);
        }}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={getResortImage(item.slug)}
          style={styles.resortCardBackground}
          imageStyle={styles.resortCardImage}
        >
          <View style={styles.resortCardGradient}>
            <View style={styles.resortCardContent}>
              {/* Header */}
              <View style={styles.resortCardHeader}>
                <View style={styles.resortCardInfo}>
                  <View style={styles.resortNameRow}>
                    <Text style={styles.resortCardName}>{item.name}</Text>
                    {getResortAlert(item.name) && (
                      <View style={styles.alertBadge}>
                        <Ionicons name="warning" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.resortCardRegion}>{item.region}, Argentina</Text>
                  <Text style={styles.resortCardStats}>
                    {(() => {
                      const name = item.name.toLowerCase();
                      if (name.includes('catedral')) return '120km • 53 pistas';
                      if (name.includes('chapelco')) return '140km • 35 pistas';
                      if (name.includes('bayo')) return '30km • 24 pistas';
                      if (name.includes('castor')) return '35km • 28 pistas';
                      if (name.includes('hoya')) return '22km • 25 pistas';
                      if (name.includes('caviahue')) return '38km • 28 pistas';
                      return '-';
                    })()}
                  </Text>
                </View>
                {item.operationalStatus?.available && (() => {
                  const op = item.operationalStatus!;
                  const liftPct = op.liftsTotal ? (op.liftsOpen ?? 0) / op.liftsTotal : 0;
                  const kmPct   = op.runsTotalKm ? (op.runsOpenKm ?? 0) / op.runsTotalKm : 0;
                  const liftColor = liftPct >= 0.6 ? '#4ade80' : liftPct >= 0.2 ? '#fbbf24' : '#f87171';
                  const kmColor   = kmPct   >= 0.6 ? '#4ade80' : kmPct   >= 0.2 ? '#fbbf24' : '#f87171';
                  return (
                    <View style={styles.opStatusPanel}>
                      <View style={styles.opStatusItem}>
                        <Ionicons name="git-network-outline" size={10} color={liftColor} />
                        <Text style={[styles.opStatusValue, { color: liftColor }]}>
                          {op.liftsOpen ?? '?'}<Text style={styles.opStatusTotal}>/{op.liftsTotal ?? '?'}</Text>
                        </Text>
                        <Text style={styles.opStatusLabel}>medios</Text>
                      </View>
                      <View style={styles.opStatusSep} />
                      <View style={styles.opStatusItem}>
                        <Ionicons name="flag-outline" size={10} color={kmColor} />
                        <Text style={[styles.opStatusValue, { color: kmColor }]}>
                          {op.runsOpenKm ?? '?'}<Text style={styles.opStatusTotal}>/{op.runsTotalKm ?? '?'}km</Text>
                        </Text>
                        <Text style={styles.opStatusLabel}>pistas</Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
              
              {/* Current Conditions */}
              {item.currentConditions && (
                <View style={styles.currentWeather}>
                  <View style={styles.weatherLeft}>
                    <Text style={styles.weatherIcon}>
                      {getWeatherIcon({
                        hour: new Date().getHours(),
                        phase,
                        cloudCover,
                        precipitation: item.currentConditions.precipitation || 0
                      })}
                    </Text>
                    <View>
                      <Text style={styles.tempValue}>{Math.round(currentTemp || 0)}°</Text>
                      <Text style={styles.tempLabel}>Actual</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Forecast Stats + Wind */}
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Hoy</Text>
                  <Text style={styles.statValue}>{Math.round(item.todaySnowfall || 0)}cm</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>24h</Text>
                  <Text style={styles.statValue}>{Math.round(item.currentConditions?.snowfall24h || 0)}cm</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cumbre</Text>
                  <Text style={styles.statValue}>{item.summitElevation}m</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Viento</Text>
                  <Text style={styles.statValue}>{Math.round(item.currentConditions?.windSpeed || 0)} km/h</Text>
                </View>
              </View>

              {/* Tappable indicator */}
              <View style={styles.tapIndicator}>
                <Ionicons name="arrow-forward-circle-outline" size={20} color="rgba(56,189,248,0.85)" />
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (checkingOnboarding) {
    return (
      <ImageBackground
        source={require('../../assets/Background_home.jpeg')}
        style={styles.centerContainer}
        imageStyle={styles.backgroundImage}
      >
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#38bdf8" />
      </ImageBackground>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/Background_home.jpeg')}
        style={styles.centerContainer}
        imageStyle={styles.backgroundImage}
      >
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Cargando cerros...</Text>
      </ImageBackground>
    );
  }

  if (error) {
    return (
      <ImageBackground
        source={require('../../assets/Background_home.jpeg')}
        style={styles.centerContainer}
        imageStyle={styles.backgroundImage}
      >
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadResorts}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/Background_home.jpeg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/Logo_horizontal.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTagline}>La nieve de los Andes, en tu mano</Text>
        </View>
      </View>
      
      {/* Alerts Banner */}
      <AlertsBanner />

      
      <FlatList
        data={resorts}
        renderItem={renderResort}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    opacity: 1.0,
  },
  
  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLogo: {
    width: 200,
    height: 44,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTagline: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  
  // List
  listContainer: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  
  // Resort Card
  resortCard: {
    height: 210,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resortCardBackground: {
    flex: 1,
  },
  resortCardImage: {
    borderRadius: 20,
  },
  resortCardGradient: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  resortCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  
  // Card Header
  resortCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resortCardInfo: {
    flex: 1,
  },
  resortNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resortCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  alertBadge: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  resortCardRegion: {
    fontSize: 14,
    color: '#cbd5e1',
    letterSpacing: 0.3,
  },
  resortCardStats: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  
  // Powder Score Badge
  powderScoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
  },
  powderScoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  powderScoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Current Weather
  currentWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherIcon: {
    fontSize: 24,
  },
  tempValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  tempLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tapIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  
  // Forecast Stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  summitHint: {
    fontSize: 9,
    color: '#7dd3fc',
    marginTop: 1,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  
  // Operational Status Panel (top-right corner of card)
  opStatusPanel: {
    backgroundColor: 'rgba(0, 10, 30, 0.55)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 68,
    gap: 3,
  },
  opStatusItem: {
    alignItems: 'center',
    gap: 0,
  },
  opStatusValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  opStatusTotal: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  opStatusLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  opStatusSep: {
    width: 36,
    height: 1,
    backgroundColor: 'rgba(56,189,248,0.12)',
    marginVertical: 1,
  },

  // Loading & Error States
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
