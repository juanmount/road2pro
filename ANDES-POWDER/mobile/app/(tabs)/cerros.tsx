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

interface ResortWithConditions extends Resort {
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
      setLoading(true);
      setError(null);
      const [data, counts] = await Promise.all([resortsService.getAll(), loadVisitCounts()]);
      setVisitCounts(counts);
      
      // Load forecasts for each resort
      const resortsWithConditions = await Promise.all(
        data.map(async (resort) => {
          try {
            const hourlyForecast = await resortsService.getHourlyForecast(resort.id, 'mid', 48);
            
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

            const currentConditions = {
              temperature: currentHour.temperature,
              windSpeed: currentHour.windSpeed,
              windDirection: currentHour.windDirection,
              precipitation: currentHour.precipitation,
              phase: currentHour.phase,
              cloudCover: currentHour.cloudCover,
              snowfall24h,
            };
            
            // Calculate today's snowfall from hourly data (next 24 hours, snow/mixed phases only)
            const todaySnowfall = snowfall24h;
            
            console.log(`[HOME] ${resort.name}: Using hour ${new Date(currentHour.time).toISOString()}`);
            console.log(`[HOME] ${resort.name}: temp=${currentConditions.temperature}° wind=${currentConditions.windSpeed}km/h phase=${currentConditions.phase} cloudCover=${currentConditions.cloudCover}% today=${todaySnowfall}cm`);
            
            return { 
              ...resort, 
              currentConditions,
              todaySnowfall 
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
    } catch (err) {
      setError('Failed to load resorts');
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
          router.push(`/(tabs)/resort/${item.slug}`);
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
                {powderScore > 0 && (
                  <View style={[
                    styles.powderScoreBadge,
                    { backgroundColor: getPowderScoreColor(powderScore) }
                  ]}>
                    <Text style={styles.powderScoreValue}>{powderScore}</Text>
                    <Text style={styles.powderScoreLabel}>{getPowderScoreLabel(powderScore)}</Text>
                  </View>
                )}
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
    height: 192,
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
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
