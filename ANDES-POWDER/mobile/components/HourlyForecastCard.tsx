import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface HourlyData {
  time: string;
  temp: number;
  icon: string;
  precip?: number;
  wind?: number;
}

interface HourlyForecastCardProps {
  hours: HourlyData[];
}

export function HourlyForecastCard({ hours }: HourlyForecastCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximas Horas</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hours.map((hour, index) => (
          <View key={index} style={styles.hourCard}>
            <Text style={styles.time}>{hour.time}</Text>
            <Text style={styles.icon}>{hour.icon}</Text>
            <Text style={styles.temp}>{hour.temp}°</Text>
            {hour.precip !== undefined && hour.precip > 0 && (
              <Text style={styles.precip}>💧 {hour.precip}mm</Text>
            )}
            {hour.wind !== undefined && hour.wind > 0 && (
              <Text style={styles.wind}>💨 {hour.wind}km/h</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 16,
  },
  hourCard: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    minWidth: 70,
  },
  time: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  temp: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  precip: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 4,
  },
  wind: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
