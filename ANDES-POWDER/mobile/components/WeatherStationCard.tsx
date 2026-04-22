import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface WeatherStationData {
  temperature: number;
  humidity: number;
  wind_speed?: number;
  wind_direction?: number;
  pressure?: number;
  timestamp: string;
}

export default function WeatherStationCard() {
  const [data, setData] = useState<WeatherStationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWeatherStationData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeatherStationData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeatherStationData = async () => {
    try {
      // Use localhost for development, production URL for release
      const API_URL = __DEV__ 
        ? 'http://localhost:3000/api/weather-station/current'
        : 'https://road2pro-784570271418.southamerica-west1.run.app/api/weather-station/current';
      
      const response = await fetch(API_URL);
      if (response.ok) {
        const json = await response.json();
        setData(json);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching weather station data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#00D9FF" />
      </View>
    );
  }

  if (error || !data) {
    return null; // Don't show card if station is offline
  }

  const getWindDirection = (degrees?: number) => {
    if (!degrees) return '-';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Estación Meteorológica</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>
        <Text style={styles.location}>Cerro Catedral Base • 1030m</Text>
      </View>

      <View style={styles.dataGrid}>
        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>{data.temperature.toFixed(1)}°</Text>
          <Text style={styles.dataLabel}>Temperatura</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>{data.humidity.toFixed(0)}%</Text>
          <Text style={styles.dataLabel}>Humedad</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>
            {data.wind_speed ? `${data.wind_speed.toFixed(0)}` : '0'}
          </Text>
          <Text style={styles.dataLabel}>Viento km/h</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>
            {data.wind_direction !== undefined ? getWindDirection(data.wind_direction) : '-'}
          </Text>
          <Text style={styles.dataLabel}>Dirección</Text>
        </View>

        {data.pressure && (
          <>
            <View style={styles.divider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataValue}>{data.pressure.toFixed(0)}</Text>
              <Text style={styles.dataLabel}>Presión hPa</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.timestamp}>
        Actualizado: {new Date(data.timestamp).toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00D9FF33',
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D9FF22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D9FF',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00D9FF',
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 12,
    color: '#FFFFFF99',
  },
  dataGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dataItem: {
    alignItems: 'center',
    flex: 1,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00D9FF',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 11,
    color: '#FFFFFF99',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#FFFFFF22',
  },
  timestamp: {
    fontSize: 10,
    color: '#FFFFFF66',
    textAlign: 'center',
  },
});
