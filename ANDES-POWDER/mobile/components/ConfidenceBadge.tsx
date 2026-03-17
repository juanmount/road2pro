import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConfidenceBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function ConfidenceBadge({ score, size = 'medium' }: ConfidenceBadgeProps) {
  const getConfidenceColor = (score: number): string => {
    if (score >= 8) return '#48bb78'; // Green - High confidence
    if (score >= 6) return '#63b3ed'; // Blue - Good confidence
    if (score >= 4) return '#ed8936'; // Orange - Moderate confidence
    return '#fc8181'; // Red - Low confidence
  };

  const getConfidenceLabel = (score: number): string => {
    if (score >= 8) return 'High';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Moderate';
    return 'Low';
  };

  const color = getConfidenceColor(score);
  const label = getConfidenceLabel(score);
  
  const sizeStyles = {
    small: { fontSize: 10, padding: 4 },
    medium: { fontSize: 12, padding: 6 },
    large: { fontSize: 14, padding: 8 },
  };

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }, sizeStyles[size]]}>
      <Text style={[styles.scoreText, { color }, sizeStyles[size]]}>
        {score.toFixed(1)}/10
      </Text>
      <Text style={[styles.labelText, { color }, sizeStyles[size]]}>
        {label} Confidence
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '700',
  },
  labelText: {
    fontWeight: '500',
    marginTop: 2,
  },
});
