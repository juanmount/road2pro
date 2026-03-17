import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PhaseBadgeProps {
  phase: string;
  size?: 'small' | 'medium';
}

export function PhaseBadge({ phase, size = 'small' }: PhaseBadgeProps) {
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'snow':
        return { icon: '❄️', label: 'Snow', color: '#3b82f6' };
      case 'rain':
        return { icon: '🌧️', label: 'Rain', color: '#1e40af' };
      case 'mixed':
        return { icon: '🌨️', label: 'Mixed', color: '#f97316' };
      case 'sleet':
        return { icon: '🌨️', label: 'Sleet', color: '#fb923c' };
      case 'none':
        return { icon: '☀️', label: 'Clear', color: '#eab308' };
      default:
        return { icon: '☀️', label: 'Clear', color: '#eab308' };
    }
  };

  const info = getPhaseInfo(phase);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: info.color + '20', borderColor: info.color }]}>
      <Text style={[styles.icon, isSmall && styles.iconSmall]}>{info.icon}</Text>
      <Text style={[styles.label, { color: info.color }, isSmall && styles.labelSmall]}>
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  iconSmall: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
  },
});
