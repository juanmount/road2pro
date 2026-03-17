import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeatherDetailCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  subtitle?: string;
}

export function WeatherDetailCard({ title, value, unit, icon, subtitle }: WeatherDetailCardProps) {
  return (
    <View style={styles.card}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
  },
  unit: {
    fontSize: 14,
    color: '#718096',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 4,
  },
});
