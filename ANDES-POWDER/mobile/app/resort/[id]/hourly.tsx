import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { resortsService } from '../../../services/resorts';
import { HourlyForecast, ElevationBand } from '../../../types';
import { 
  getPowderScoreColor, 
  formatTemperature, 
  formatSnowfall,
  formatWind 
} from '../../../utils/powder-score';
import { getWindDirectionLabel } from '../../../utils/wind-narrative';

// Helper function to get wind direction arrow
const getWindDirectionArrow = (degrees: number): string => {
  const directions = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
};

export default function HourlyForecastScreen() {
  const params = useLocalSearchParams<{ id: string; elevation?: string }>();
  const { id } = params;
  const initialElevation = (params.elevation as ElevationBand) || 'mid';
  const navigation = useNavigation();
  
  const [forecasts, setForecasts] = useState<HourlyForecast[]>([]);
  const [selectedElevation, setSelectedElevation] = useState<ElevationBand>(initialElevation);
  const [loading, setLoading] = useState(true);
  const [resort, setResort] = useState<any>(null);

  useEffect(() => {
    loadResortAndForecast();
  }, [id, selectedElevation]);
  
  // Reload when screen comes into focus to get fresh cached data
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[HOURLY SCREEN] Screen focused, reloading data');
      loadResortAndForecast();
    });
    return unsubscribe;
  }, [selectedElevation]);

  const loadResortAndForecast = async () => {
    try {
      setLoading(true);
      const resortData = await resortsService.getById(id);
      setResort(resortData);
      
      // ONLY load from AsyncStorage - never make API call
      // This ensures we always use the same data as the LIVE card
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const cachedKey = `hourly-forecast-${id}-${selectedElevation}`;
      const cachedData = await AsyncStorage.getItem(cachedKey);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        console.log('[HOURLY SCREEN] ✅ Using CACHED data from AsyncStorage:', data.length, 'hours');
        console.log('[HOURLY SCREEN] First hour:', {
          time: data[0]?.time,
          temp: data[0]?.temperature,
          wind: data[0]?.windSpeed,
          freezing: data[0]?.freezingLevel
        });
        setForecasts(data);
      } else {
        console.error('[HOURLY SCREEN] ❌ No cached data found! Go back to main screen first.');
        setForecasts([]);
      }
    } catch (err) {
      console.error('Error loading hourly forecast:', err);
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  // Don't adjust wind - just display what comes from DB
  // The LIVE card applies 1.25x correction, but hourly forecast should show raw values
  const getAdjustedWindSpeed = (windSpeed: number): number => {
    return windSpeed;
  };

  const formatHour = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#63b3ed" />
      </View>
    );
  }

  let currentDate = '';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.elevationSelector}>
        {(['base', 'mid', 'summit'] as ElevationBand[]).map((elevation) => (
          <View
            key={elevation}
            style={[
              styles.elevationButton,
              selectedElevation === elevation && styles.elevationButtonActive,
            ]}
            onTouchEnd={() => setSelectedElevation(elevation)}
          >
            <Text
              style={[
                styles.elevationButtonText,
                selectedElevation === elevation && styles.elevationButtonTextActive,
              ]}
            >
              {elevation.charAt(0).toUpperCase() + elevation.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.forecastList}>
        {forecasts.map((forecast, index) => {
          const forecastDate = formatDate(forecast.timestamp);
          const showDateHeader = forecastDate !== currentDate;
          currentDate = forecastDate;

          return (
            <View key={forecast.id}>
              {showDateHeader && (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{forecastDate}</Text>
                </View>
              )}
              <View style={styles.hourlyCard}>
                <View style={styles.timeColumn}>
                  <Text style={styles.hourText}>{formatHour(forecast.timestamp)}</Text>
                </View>
                
                <View style={styles.scoreColumn}>
                  <View 
                    style={[
                      styles.scoreBadge, 
                      { backgroundColor: getPowderScoreColor(forecast.powderScore) }
                    ]}
                  >
                    <Text style={styles.scoreText}>
                      {forecast.powderScore.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.dataColumn}>
                  <Text style={styles.tempText}>
                    {formatTemperature(forecast.temperature)}
                  </Text>
                  <Text style={styles.detailText}>
                    Feels {formatTemperature(forecast.feelsLike)}
                  </Text>
                </View>

                <View style={styles.dataColumn}>
                  {forecast.precipitation > 0 ? (
                    <>
                      <Text style={styles.snowText}>
                        {formatSnowfall(forecast.precipitation)}
                      </Text>
                      <Text style={styles.detailText}>
                        {forecast.precipitationType}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.detailText}>No precip</Text>
                  )}
                </View>

                <View style={styles.dataColumn}>
                  <Text style={styles.windText}>
                    {formatWind(getAdjustedWindSpeed(forecast.windSpeed))}
                  </Text>
                  {forecast.windDirection !== undefined && (
                    <Text style={styles.detailText}>
                      {getWindDirectionArrow(forecast.windDirection)} {getWindDirectionLabel(forecast.windDirection)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
  elevationSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  elevationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  elevationButtonActive: {
    backgroundColor: '#1a365d',
    borderColor: '#1a365d',
  },
  elevationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  elevationButtonTextActive: {
    color: '#fff',
  },
  forecastList: {
    padding: 16,
  },
  dateHeader: {
    paddingVertical: 12,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  hourlyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeColumn: {
    width: 60,
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  scoreColumn: {
    width: 50,
    alignItems: 'center',
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  dataColumn: {
    flex: 1,
    alignItems: 'center',
  },
  tempText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  snowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#63b3ed',
  },
  windText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  detailText: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 2,
  },
});
