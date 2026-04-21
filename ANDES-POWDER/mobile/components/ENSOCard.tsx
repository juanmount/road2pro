import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

export default function ENSOCard() {
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.phase}>{phaseLabel}</Text>
          <Text style={styles.oni}>ONI: {ensoData.oni.toFixed(2)}°C</Text>
        </View>
        <View style={[styles.indicator, { backgroundColor: phaseColor }]} />
      </View>
      
      {ensoData.phase !== 'neutral' && ensoData.stormMultiplier !== 1 && (
        <Text style={styles.impact}>
          Ajuste pronósticos: {ensoData.stormMultiplier > 1 ? '+' : ''}{Math.round((ensoData.stormMultiplier - 1) * 100)}% tormentas
        </Text>
      )}
      
      <Text style={styles.source}>Fuente: NOAA Climate Prediction Center</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  phase: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  oni: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  impact: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  source: {
    fontSize: 9,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
