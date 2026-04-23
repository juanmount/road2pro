import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { resortsService } from '../../../services/resorts';
import { DailyForecast, ElevationBand } from '../../../types';
import { 
  getPowderScoreColor, 
  getPowderScoreLabel,
  formatTemperature, 
  formatSnowfall,
  formatWind,
  getFreezeQualityLabel
} from '../../../utils/powder-score';

export default function DailyForecastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [forecasts, setForecasts] = useState<DailyForecast[]>([]);
  const [selectedElevation, setSelectedElevation] = useState<ElevationBand>('mid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyForecast();
  }, [id, selectedElevation]);

  const loadDailyForecast = async () => {
    try {
      setLoading(true);
      const data = await resortsService.getDailyForecast(id, selectedElevation, 15);
      setForecasts(data);
    } catch (err) {
      console.error('Error loading daily forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
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
        {forecasts.map((forecast) => {
          const scoreColor = getPowderScoreColor(forecast.powderScoreMax);
          
          return (
            <View key={forecast.id} style={styles.dailyCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{formatDate(forecast.date)}</Text>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                  <Text style={styles.scoreText}>
                    {forecast.powderScoreMax.toFixed(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.dataRow}>
                  <Text style={styles.label}>Temperature</Text>
                  <Text style={styles.value}>
                    {formatTemperature(forecast.tempMin)} - {formatTemperature(forecast.tempMax)}
                  </Text>
                </View>

                {forecast.snowfallTotal > 0 && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Snowfall</Text>
                    <Text style={[styles.value, styles.snowValue]}>
                      {formatSnowfall(forecast.snowfallTotal)}
                    </Text>
                  </View>
                )}

                <View style={styles.dataRow}>
                  <Text style={styles.label}>Wind</Text>
                  <Text style={styles.value}>
                    Max {formatWind(forecast.windMax)}
                  </Text>
                </View>

                {forecast.freezeQuality && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Freeze</Text>
                    <Text style={styles.value}>
                      {getFreezeQualityLabel(forecast.freezeQuality)}
                    </Text>
                  </View>
                )}

                {forecast.bestWindowStart && (
                  <View style={styles.bestWindowSection}>
                    <Text style={styles.bestWindowLabel}>Best Window</Text>
                    <Text style={styles.bestWindowTime}>
                      {forecast.bestWindowStart} - {forecast.bestWindowEnd}
                    </Text>
                    {forecast.bestWindowReason && (
                      <Text style={styles.bestWindowReason}>
                        {forecast.bestWindowReason}
                      </Text>
                    )}
                  </View>
                )}

                {forecast.conditionsSummary && (
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryText}>
                      {forecast.conditionsSummary}
                    </Text>
                  </View>
                )}
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
  dailyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  scoreBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cardBody: {
    padding: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#718096',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  snowValue: {
    color: '#63b3ed',
  },
  bestWindowSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
  },
  bestWindowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 4,
  },
  bestWindowTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 4,
  },
  bestWindowReason: {
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 18,
  },
  summarySection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
