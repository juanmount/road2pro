import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserEngagement } from '../hooks/useUserEngagement';

export const EngagementDashboard = () => {
  const { engagement, getEngagementLevel, isReadyForConversion } = useUserEngagement();

  if (!engagement) return null;

  const engagementLevel = getEngagementLevel();
  const readyForConversion = isReadyForConversion();

  const getLevelColor = () => {
    switch (engagementLevel) {
      case 'power_user': return '#10b981';
      case 'active': return '#f59e0b';
      case 'casual': return '#64748b';
    }
  };

  const getLevelLabel = () => {
    switch (engagementLevel) {
      case 'power_user': return 'Usuario Power';
      case 'active': return 'Usuario Activo';
      case 'casual': return 'Usuario Casual';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={20} color="#63b3ed" />
        <Text style={styles.title}>Tu Actividad</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#63b3ed" />
          <Text style={styles.statValue}>{engagement.daysActive}</Text>
          <Text style={styles.statLabel}>Días activo</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="snow" size={24} color="#63b3ed" />
          <Text style={styles.statValue}>{engagement.resortsViewed}</Text>
          <Text style={styles.statLabel}>Cerros vistos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cloud" size={24} color="#63b3ed" />
          <Text style={styles.statValue}>{engagement.forecastsChecked}</Text>
          <Text style={styles.statLabel}>Pronósticos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#63b3ed" />
          <Text style={styles.statValue}>{engagement.sessionCount}</Text>
          <Text style={styles.statLabel}>Sesiones</Text>
        </View>
      </View>

      <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor()}20` }]}>
        <View style={[styles.levelDot, { backgroundColor: getLevelColor() }]} />
        <Text style={[styles.levelText, { color: getLevelColor() }]}>
          {getLevelLabel()}
        </Text>
      </View>

      {readyForConversion && (
        <View style={styles.conversionHint}>
          <Ionicons name="rocket" size={16} color="#10b981" />
          <Text style={styles.conversionText}>
            ¡Estás listo para el acceso anticipado!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(99, 179, 237, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  conversionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  conversionText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
    flex: 1,
  },
});
