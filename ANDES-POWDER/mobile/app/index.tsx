import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { resortsService } from '../services/resorts';
import { Resort, CurrentConditions } from '../types';
import { getPowderScoreColor, getPowderScoreLabel } from '../utils/powder-score';
import { getWeatherIcon } from '../utils/weather-icons';

interface ResortWithConditions extends Resort {
  conditions?: CurrentConditions;
  currentPrecipitation?: number;
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

  useEffect(() => {
    loadResorts();
  }, []);

  const loadResorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resortsService.getAll();
      
      // Load current conditions and hourly forecast for each resort
      const resortsWithConditions = await Promise.all(
        data.map(async (resort) => {
          try {
            const conditions = await resortsService.getCurrentConditions(resort.id);
            // Get first hour of hourly forecast for current precipitation
            const hourlyForecast = await resortsService.getHourlyForecast(resort.id, 'mid', 24);
            const currentPrecipitation = hourlyForecast[0]?.precipitation || 0;
            return { ...resort, conditions, currentPrecipitation };
          } catch (err) {
            console.warn(`Failed to load conditions for ${resort.name}:`, err);
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
    const currentTemp = item.conditions?.byElevation.mid?.temperature;
    const cloudCover = item.conditions?.byElevation.mid?.cloudCover || 0;
    const phase = item.conditions?.byElevation.mid?.phase || 'none';
    const powderScore = item.conditions?.current?.powderScore || 0;
    
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
              {item.conditions && (
                <View style={styles.currentConditions}>
                  <View style={styles.tempDisplay}>
                    <Text style={styles.weatherIcon}>
                      {getWeatherIcon({
                        hour: new Date().getHours(),
                        phase,
                        cloudCover,
                        precipitation: item.currentPrecipitation || 0
                      })}
                    </Text>
                    <Text style={styles.tempValue}>{Math.round(currentTemp || 0)}°</Text>
                  </View>
                  <View style={styles.quickStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Base</Text>
                      <Text style={styles.statValue}>{item.baseElevation}m</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Summit</Text>
                      <Text style={styles.statValue}>{item.summitElevation}m</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Snow 24h</Text>
                      <Text style={styles.statValue}>{Math.round(item.conditions.byElevation.mid?.snowfall24h || 0)}cm</Text>
                    </View>
                  </View>
                </View>
              )}
              
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
  
  // Current Conditions
  currentConditions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tempDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherIcon: {
    fontSize: 32,
  },
  tempValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
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
