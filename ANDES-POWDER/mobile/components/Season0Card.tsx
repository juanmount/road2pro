import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface Season0CardProps {
  onPress: () => void;
}

export default function Season0Card({ onPress }: Season0CardProps) {
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header with badge */}
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>SEASON 0</Text>
        </View>
        <Text style={styles.tapHint}>Tap para más info</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.title}>Early Access</Text>
        <Text style={styles.subtitle}>Validación científica en curso</Text>
        
        {/* Visual indicators */}
        <View style={styles.indicators}>
          <View style={styles.indicator}>
            <View style={[styles.dot, styles.dotActive]} />
            <Text style={styles.indicatorText}>Algoritmos activos</Text>
          </View>
          <View style={styles.indicator}>
            <View style={[styles.dot, styles.dotCalibrating]} />
            <Text style={styles.indicatorText}>Calibrando con datos reales</Text>
          </View>
          <View style={styles.indicator}>
            <View style={[styles.dot, styles.dotPending]} />
            <Text style={styles.indicatorText}>Features premium próximamente</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tu feedback es clave para el desarrollo
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  indicators: {
    gap: 10,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  dotCalibrating: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  dotPending: {
    backgroundColor: '#64748b',
  },
  indicatorText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.2)',
  },
  footerText: {
    fontSize: 11,
    color: '#38bdf8',
    textAlign: 'center',
    fontWeight: '500',
  },
});
