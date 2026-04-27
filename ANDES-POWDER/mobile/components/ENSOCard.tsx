import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';

interface ENSOData {
  oni: number;
  phase: 'strong_nino' | 'moderate_nino' | 'weak_nino' | 'neutral' | 'weak_nina' | 'moderate_nina' | 'strong_nina';
  intensity: string;
  seasonOutlook: string;
  consumerMessage: string;
  stormMultiplier: number;
  freezingLevelAdjustment: number;
}

interface ENSOCardProps {
  onPress: () => void;
}

const getPhaseLabel = (phase: string, intensity: string): string => {
  if (phase === 'neutral') return 'Neutral';
  if (phase.includes('nino')) return `El Niño ${intensity}`;
  if (phase.includes('nina')) return `La Niña ${intensity}`;
  return 'Neutral';
};

const getPhaseColor = (phase: string): string => {
  if (phase.includes('nino')) return '#f97316';
  if (phase.includes('nina')) return '#3b82f6';
  return '#64748b';
};

export default function ENSOCard({ onPress }: ENSOCardProps) {
  const [ensoData, setEnsoData] = useState<ENSOData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchENSOData();
  }, []);

  const fetchENSOData = async () => {
    try {
      const response = await fetch('https://road2pro-784570271418.southamerica-west1.run.app/api/enso/current');
      const data = await response.json();
      setEnsoData(data);
    } catch (error) {
      console.error('Error fetching ENSO data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#38bdf8" />
      </View>
    );
  }

  if (!ensoData) return null;

  const phaseColor = getPhaseColor(ensoData.phase);
  const phaseLabel = getPhaseLabel(ensoData.phase, ensoData.intensity);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>🌊 El Niño / La Niña (NOAA)</Text>
          <View style={styles.phaseRow}>
            <Text style={[styles.phase, { color: phaseColor }]}>{phaseLabel}</Text>
            <Text style={styles.oni}>• ONI: {ensoData.oni.toFixed(2)}°C</Text>
          </View>
        </View>
        <View style={[styles.indicator, { backgroundColor: phaseColor }]} />
      </View>
      
      {ensoData.phase !== 'neutral' && ensoData.stormMultiplier !== 1 && (
        <Text style={styles.impact}>
          Ajuste pronósticos: {ensoData.stormMultiplier > 1 ? '+' : ''}{Math.round((ensoData.stormMultiplier - 1) * 100)}% tormentas
        </Text>
      )}
      
      <Text style={styles.tapHint}>Tap para más info →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phase: {
    fontSize: 12,
    fontWeight: '600',
  },
  oni: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  impact: {
    fontSize: 10,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  source: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  tapHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
