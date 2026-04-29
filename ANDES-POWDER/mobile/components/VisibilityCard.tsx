import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VisibilityData {
  visibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'whiteout';
  visibilityMeters: number;
  inCloud: boolean;
  cloudBaseMeters?: number;
}

interface VisibilityCardProps {
  baseVisibility: VisibilityData;
  midVisibility: VisibilityData;
  summitVisibility: VisibilityData;
  seaOfClouds?: boolean;
}

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'excellent': return '☀️';
    case 'good': return '🌤️';
    case 'moderate': return '⛅';
    case 'poor': return '☁️';
    case 'whiteout': return '🌫️';
    default: return '☁️';
  }
};

const getVisibilityColor = (visibility: string) => {
  switch (visibility) {
    case 'excellent': return '#10b981'; // green
    case 'good': return '#3b82f6'; // blue
    case 'moderate': return '#f59e0b'; // amber
    case 'poor': return '#ef4444'; // red
    case 'whiteout': return '#991b1b'; // dark red
    default: return '#6b7280';
  }
};

const getVisibilityLabel = (visibility: string) => {
  switch (visibility) {
    case 'excellent': return 'Excelente';
    case 'good': return 'Buena';
    case 'moderate': return 'Moderada';
    case 'poor': return 'Limitada';
    case 'whiteout': return 'WHITEOUT';
    default: return 'N/A';
  }
};

export function VisibilityCard({ baseVisibility, midVisibility, summitVisibility, seaOfClouds }: VisibilityCardProps) {
  const elevations = [
    { name: 'BASE', data: baseVisibility },
    { name: 'MID', data: midVisibility },
    { name: 'SUMMIT', data: summitVisibility },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>☁️ Visibilidad en Montaña</Text>
        {seaOfClouds && (
          <View style={styles.seaOfCloudsBadge}>
            <Text style={styles.seaOfCloudsText}>🌊 Mar de Nubes</Text>
          </View>
        )}
      </View>

      <View style={styles.elevationsContainer}>
        {elevations.map((elev, index) => (
          <View key={index} style={styles.elevationBox}>
            <Text style={styles.elevationName}>{elev.name}</Text>
            
            <View style={styles.visibilityRow}>
              <Text style={styles.visibilityIcon}>
                {getVisibilityIcon(elev.data.visibility)}
              </Text>
              <View style={styles.visibilityInfo}>
                <Text style={[
                  styles.visibilityLabel,
                  { color: getVisibilityColor(elev.data.visibility) }
                ]}>
                  {getVisibilityLabel(elev.data.visibility)}
                </Text>
                <Text style={styles.visibilityMeters}>
                  {elev.data.visibilityMeters >= 1000 
                    ? `${(elev.data.visibilityMeters / 1000).toFixed(1)}km`
                    : `${elev.data.visibilityMeters}m`
                  }
                </Text>
              </View>
            </View>

            {elev.data.inCloud && (
              <View style={styles.inCloudBadge}>
                <Ionicons name="cloud" size={12} color="#fff" />
                <Text style={styles.inCloudText}>En nube</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {seaOfClouds && (
        <View style={styles.seaOfCloudsInfo}>
          <Ionicons name="arrow-up-circle" size={16} color="#10b981" />
          <Text style={styles.seaOfCloudsDescription}>
            Summit despejado, base/mid en nubes - ¡Condiciones épicas arriba!
          </Text>
        </View>
      )}

      {summitVisibility.visibility === 'whiteout' && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={styles.warningText}>
            ⚠️ Condiciones de whiteout en summit - extrema precaución
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  seaOfCloudsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seaOfCloudsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  elevationsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  elevationBox: {
    flex: 1,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  elevationName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  visibilityRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  visibilityIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  visibilityInfo: {
    alignItems: 'center',
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  visibilityMeters: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  inCloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  inCloudText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  seaOfCloudsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    gap: 8,
  },
  seaOfCloudsDescription: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    lineHeight: 16,
  },
});
