import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ConfidenceBadgeProps {
  score: number;
  reason?: string;
  compact?: boolean;
}

export function ConfidenceBadge({ score, reason, compact = false }: ConfidenceBadgeProps) {
  const getConfidenceLevel = (score: number): ConfidenceLevel => {
    if (score >= 7.5) return 'HIGH';
    if (score >= 5.0) return 'MEDIUM';
    return 'LOW';
  };

  const getConfidenceColor = (level: ConfidenceLevel): string => {
    if (level === 'HIGH') return '#10b981'; // Emerald green
    if (level === 'MEDIUM') return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getConfidenceLabel = (level: ConfidenceLevel): string => {
    if (level === 'HIGH') return 'Alta';
    if (level === 'MEDIUM') return 'Moderada';
    return 'Baja';
  };

  const getConfidenceIcon = (level: ConfidenceLevel): string => {
    if (level === 'HIGH') return '●';
    if (level === 'MEDIUM') return '●';
    return '●';
  };

  const level = getConfidenceLevel(score);
  const color = getConfidenceColor(level);
  const label = getConfidenceLabel(level);
  const icon = getConfidenceIcon(level);

  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.compactText}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <View style={styles.badgeHeader}>
        <View style={[styles.largeDot, { backgroundColor: color }]} />
        <Text style={styles.labelText}>Confianza {label}</Text>
      </View>
      {reason && (
        <Text style={styles.reasonText}>{reason}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    alignItems: 'center',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'center',
    gap: 5,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  largeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  reasonText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 2,
  },
});
