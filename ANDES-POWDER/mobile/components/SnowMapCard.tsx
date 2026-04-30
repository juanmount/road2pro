import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSnowMapData, getSnowIntensity, SnowMapData } from '../services/snowMap';

interface SnowMapCardProps {
  onPress?: () => void;
}

export default function SnowMapCard({ onPress }: SnowMapCardProps) {
  const [data, setData] = useState<SnowMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '48h' | '7d'>('24h');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const snowData = await getSnowMapData();
      setData(snowData);
    } catch (error) {
      console.error('Error loading snow map:', error);
      setError('No se pudo cargar el mapa de nieve');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Mapa de Nieve</Text>
        <ActivityIndicator size="small" color="#38bdf8" style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>❄️ Mapa de Nieve</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '24h': return 'Próximas 24h';
      case '48h': return 'Próximas 48h';
      case '7d': return 'Próximos 7 días';
    }
  };

  const getSnowfallForPeriod = (point: typeof data.dataPoints[0]) => {
    switch (selectedPeriod) {
      case '24h': return point.snowfall24h;
      case '48h': return point.snowfall48h;
      case '7d': return point.snowfall7d;
    }
  };

  // Group by resort and get summit data
  const resortData = data.dataPoints
    .filter(p => p.elevation === 'summit')
    .sort((a, b) => getSnowfallForPeriod(b) - getSnowfallForPeriod(a));

  const topResort = resortData[0];
  const topSnowfall = topResort ? getSnowfallForPeriod(topResort) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>❄️ Mapa de Nieve</Text>
          <Text style={styles.subtitle}>Acumulación por cerro</Text>
        </View>
        {onPress && (
          <TouchableOpacity onPress={onPress}>
            <Ionicons name="expand" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === '24h' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('24h')}
        >
          <Text style={[styles.periodText, selectedPeriod === '24h' && styles.periodTextActive]}>
            24h
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === '48h' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('48h')}
        >
          <Text style={[styles.periodText, selectedPeriod === '48h' && styles.periodTextActive]}>
            48h
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === '7d' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('7d')}
        >
          <Text style={[styles.periodText, selectedPeriod === '7d' && styles.periodTextActive]}>
            7d
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resort List */}
      <ScrollView style={styles.resortList} showsVerticalScrollIndicator={false}>
        {resortData.map((point) => {
          const snowfall = getSnowfallForPeriod(point);
          const intensity = getSnowIntensity(snowfall);
          
          return (
            <View key={point.resortId} style={styles.resortRow}>
              <View style={styles.resortInfo}>
                <View style={[styles.indicator, { backgroundColor: intensity.color }]} />
                <Text style={styles.resortName}>{point.resortName}</Text>
              </View>
              <View style={styles.snowfallInfo}>
                <Text style={styles.snowfallValue}>{Math.round(snowfall)}cm</Text>
                <Text style={styles.snowfallLabel}>{intensity.label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Summary */}
      {topResort && topSnowfall > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            🏆 Más nieve ({selectedPeriod}): <Text style={styles.summaryBold}>{topResort.resortName}</Text>
            <Text style={styles.summaryBold}> {Math.round(topSnowfall)}cm</Text>
          </Text>
        </View>
      )}

      <Text style={styles.source}>Fuente: Andes Powder forecast ({getPeriodLabel()})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  periodTextActive: {
    color: '#fff',
  },
  resortList: {
    maxHeight: 200,
  },
  resortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 116, 139, 0.2)',
  },
  resortInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resortName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  snowfallInfo: {
    alignItems: 'flex-end',
  },
  snowfallValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  snowfallLabel: {
    fontSize: 9,
    color: '#94a3b8',
  },
  summary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 116, 139, 0.2)',
  },
  summaryText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  summaryBold: {
    fontWeight: '700',
    color: '#fff',
  },
  source: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorText: {
    marginTop: 10,
    color: '#fca5a5',
    fontSize: 12,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  retryButtonText: {
    color: '#bae6fd',
    fontWeight: '600',
    fontSize: 12,
  },
});
