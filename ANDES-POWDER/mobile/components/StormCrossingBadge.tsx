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
      <View style={styles.badgeHeader}>
        <Text style={[styles.icon, { color: text }]}>{icon}</Text>
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      </View>
      <Text style={[styles.score, { color: text }]}>{score}/100</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
