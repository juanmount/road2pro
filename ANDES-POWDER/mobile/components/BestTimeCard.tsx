import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BestTimeWindow {
  startTime: Date;
  endTime: Date;
  duration: number;
  powderScore: number;
  reasons: string[];
  warnings: string[];
}

interface BestTimeCardProps {
  windows: BestTimeWindow[];
  onPress?: () => void;
}

export default function BestTimeCard({ windows, onPress }: BestTimeCardProps) {
  if (!windows || windows.length === 0) {
    return null;
  }

  const bestWindow = windows[0];

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDay = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'HOY';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'MAÑANA';
    } else {
      return d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#64748b';
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" size={20} color="#63b3ed" />
          <Text style={styles.title}>MEJOR MOMENTO</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(bestWindow.powderScore) }]}>
          <Text style={styles.scoreText}>{bestWindow.powderScore.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.timeSection}>
        <Text style={styles.dayLabel}>{formatDay(bestWindow.startTime)}</Text>
        <Text style={styles.timeRange}>
          {formatTime(bestWindow.startTime)} - {formatTime(bestWindow.endTime)}
        </Text>
      </View>

      {bestWindow.reasons.length > 0 && (
        <View style={styles.reasonsSection}>
          {bestWindow.reasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {bestWindow.warnings.length > 0 && (
        <View style={styles.warningsSection}>
          {bestWindow.warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {windows.length > 1 && (
        <View style={styles.moreWindows}>
          <Text style={styles.moreText}>+{windows.length - 1} ventanas más</Text>
          <Ionicons name="chevron-forward" size={16} color="#64748b" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#63b3ed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  timeSection: {
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  timeRange: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  reasonsSection: {
    gap: 6,
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
  },
  warningsSection: {
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  moreWindows: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  moreText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});
