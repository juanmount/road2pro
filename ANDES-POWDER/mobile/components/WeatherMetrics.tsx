import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeatherMetricsProps {
  windSpeed: number;
  humidity: number;
  freezingLevel: number;
}

export function WeatherMetrics({ windSpeed, humidity, freezingLevel }: WeatherMetricsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.label}>Wind speed</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.icon}>💨</Text>
            <Text style={styles.value}>{Math.round(windSpeed)}</Text>
          </View>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.label}>Humidity</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.icon}>💧</Text>
            <Text style={styles.value}>{Math.round(humidity)}%</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.freezingLevel}>
        <Text style={styles.label}>Freezing Level</Text>
        <View style={styles.freezingBar}>
          <View style={styles.freezingIndicator} />
          <Text style={styles.freezingValue}>{freezingLevel} m</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metric: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  freezingLevel: {
    marginTop: 8,
  },
  freezingBar: {
    height: 32,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  freezingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: '#3b82f6',
    opacity: 0.2,
  },
  freezingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginLeft: 'auto',
  },
});
