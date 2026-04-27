import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type CrossingCategory = 'LOW' | 'MEDIUM' | 'HIGH';

interface StormCrossingBadgeProps {
  category: CrossingCategory;
  score: number;
  compact?: boolean;
}

export function StormCrossingBadge({ category, score, compact = false }: StormCrossingBadgeProps) {
  const config = {
    HIGH: {
      bg: '#10b981',
      text: '#ffffff',
      icon: '✓',
      label: 'High Crossing',
    },
    MEDIUM: {
      bg: '#f59e0b',
      text: '#ffffff',
      icon: '~',
      label: 'Medium Crossing',
    },
    LOW: {
      bg: '#ef4444',
      text: '#ffffff',
      icon: '⚠',
      label: 'Low Crossing',
    },
  };

  const { bg, text, icon, label } = config[category];

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: bg }]}>
        <Text style={[styles.compactIcon, { color: text }]}>{icon}</Text>
        <Text style={[styles.compactText, { color: text }]}>{score}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.icon, { color: text }]}>{icon}</Text>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
