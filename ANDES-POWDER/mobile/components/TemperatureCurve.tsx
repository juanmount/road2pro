import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TemperatureCurveProps {
  hourlyData: Array<{
    time: Date;
    temperature: number;
  }>;
}

export function TemperatureCurve({ hourlyData }: TemperatureCurveProps) {
  // Take first 24 hours and group by 3-hour intervals
  const chartData = hourlyData.slice(0, 24).filter((_, i) => i % 3 === 0);
  const temps = chartData.map(d => d.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Temperature (Next 24h)</Text>
        <View style={styles.tempRange}>
          <Text style={styles.maxTemp}>{Math.round(maxTemp)}°</Text>
          <Text style={styles.minTemp}>{Math.round(minTemp)}°</Text>
        </View>
      </View>
      
      <View style={styles.tempGrid}>
        {chartData.map((d, i) => {
          const hour = d.time.getHours();
          const temp = Math.round(d.temperature);
          
          return (
            <View key={i} style={styles.tempItem}>
              <Text style={styles.tempValue}>{temp}°</Text>
              <Text style={styles.tempHour}>{hour.toString().padStart(2, '0')}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  tempRange: {
    flexDirection: 'row',
    gap: 8,
  },
  maxTemp: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  minTemp: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  tempGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tempItem: {
    alignItems: 'center',
    width: '12%',
    marginBottom: 12,
  },
  tempValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  tempHour: {
    fontSize: 9,
    color: '#64748b',
  },
});
