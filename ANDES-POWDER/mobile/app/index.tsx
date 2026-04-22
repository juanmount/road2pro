import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resortsService } from '../services/resorts';
import { Resort, CurrentConditions } from '../types';
import { getPowderScoreColor, getPowderScoreLabel } from '../utils/powder-score';
import { getWeatherIcon } from '../utils/weather-icons';
import ENSOCard from '../components/ENSOCard';
import ENSOModal from '../components/ENSOModal';
import Season0Card from '../components/Season0Card';
import OnboardingScreen from '../components/OnboardingScreen';
import Season0Modal from '../components/Season0Modal';
import WeatherStationCard from '../components/WeatherStationCard';

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
  'cerro-catedral': require('../assets/cerro-catedral-bg.jpg'),
  'cerro-castor': require('../assets/cerro-castor-bg.jpg'),
  'cerro-chapelco': require('../assets/cerro-chapelco-bg.jpg'),
  'las-lenas': require('../assets/cerro-lenas-bg.jpg'),
};

const getResortImage = (slug: string) => {
  return resortImages[slug] || resortImages['cerro-catedral']; // Fallback to Catedral
};

export default function HomeScreen() {
  const router = useRouter();
  const [resorts, setResorts] = useState<ResortWithConditions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showSeason0Modal, setShowSeason0Modal] = useState(false);
  const [showENSOModal, setShowENSOModal] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (!checkingOnboarding && !showOnboarding) {
      loadResorts();
    }
  }, [checkingOnboarding, showOnboarding]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(completed !== 'true');
      
      // Don't show Season 0 modal automatically on first load
      // It will be shown after resorts load if needed
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

  const loadResorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resortsService.getAll();
      
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
            const currentConditions = {
              temperature: currentHour.temperature,
              windSpeed: currentHour.windSpeed,
              windDirection: currentHour.windDirection,
              precipitation: currentHour.precipitation,
              phase: currentHour.phase,
              cloudCover: currentHour.cloudCover,
              snowfall24h: hourlyForecast.slice(0, 24).reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0),
            };
            
            // Calculate today's snowfall from hourly data (next 24 hours)
            const todaySnowfall = hourlyForecast.slice(0, 24).reduce((sum: number, h: any) => sum + (h.snowfall || 0), 0);
            
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
      
      setResorts(resortsWithConditions);
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
        onPress={() => router.push(`/resort/${item.slug}`)}
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
                  <Text style={styles.resortCardName}>{item.name}</Text>
                  <Text style={styles.resortCardRegion}>{item.region}, Argentina</Text>
                  <Text style={styles.resortCardStats}>
                    {(() => {
                      const name = item.name.toLowerCase();
                      if (name.includes('catedral')) return '120km • 53 pistas';
                      if (name.includes('chapelco')) return '140km • 35 pistas';
                      if (name.includes('bayo')) return '30km • 24 pistas';
                      if (name.includes('castor')) return '35km • 28 pistas';
                      return '35km • 28 pistas';
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
                  <View style={styles.weatherRight}>
                    <Text style={styles.windValue}>💨 {Math.round(item.currentConditions.windSpeed || 0)} km/h</Text>
                  </View>
                </View>
              )}
              
              {/* Forecast Stats */}
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
                  <Text style={styles.statLabel}>Summit</Text>
                  <Text style={styles.statValue}>{item.summitElevation}m</Text>
                </View>
              </View>
              
              {/* View Details Arrow */}
              <View style={styles.viewDetailsContainer}>
                <Text style={styles.viewDetailsText}>Ver detalles</Text>
                <Text style={styles.viewDetailsArrow}>→</Text>
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
        source={require('../assets/Background_home.jpeg')}
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
        source={require('../assets/Background_home.jpeg')}
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
        source={require('../assets/Background_home.jpeg')}
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
      source={require('../assets/Background_home.jpeg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../assets/Logo_horizontal.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>
      
      <FlatList
        data={resorts}
        renderItem={renderResort}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <WeatherStationCard />
            <View style={styles.cardsRow}>
              <View style={styles.cardHalf}>
                <Season0Card onPress={() => setShowSeason0Modal(true)} />
              </View>
              <View style={styles.cardHalf}>
                <ENSOCard onPress={() => setShowENSOModal(true)} />
              </View>
            </View>
          </View>
        }
      />
      
      {/* Season 0 Modal */}
      <Season0Modal 
        visible={showSeason0Modal}
        onClose={() => setShowSeason0Modal(false)}
      />
      
      {/* ENSO Modal */}
      <ENSOModal 
        visible={showENSOModal}
        onClose={() => setShowENSOModal(false)}
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
    paddingTop: 70,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLogo: {
    width: 300,
    height: 70,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  
  // List
  listContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  
  // Cards Row
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardHalf: {
    flex: 1,
  },
  
  // Resort Card
  resortCard: {
    height: 220,
    borderRadius: 20,
    marginBottom: 16,
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
    padding: 20,
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
  resortCardName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.5,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherIcon: {
    fontSize: 36,
  },
  tempValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  tempLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  weatherRight: {
    alignItems: 'flex-end',
  },
  windValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
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
  
  // View Details
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
    letterSpacing: 0.3,
  },
  viewDetailsArrow: {
    fontSize: 16,
    color: '#38bdf8',
    fontWeight: '700',
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
