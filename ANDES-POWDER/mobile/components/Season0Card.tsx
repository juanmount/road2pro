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
      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>SEASON 0</Text>
        </View>
        <Text style={styles.title}>Early Access — Validación en curso</Text>
        <View style={styles.statusDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotCalibrating]} />
          <View style={[styles.dot, styles.dotPending]} />
        </View>
      </View>
      <Text style={styles.tapHint}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  badgeContainer: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  statusDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#22c55e',
  },
  dotCalibrating: {
    backgroundColor: '#f59e0b',
  },
  dotPending: {
    backgroundColor: '#64748b',
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 18,
    fontWeight: '300',
  },
});
