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
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>SEASON 0</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Early Access</Text>
        <View style={styles.statusDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotCalibrating]} />
          <View style={[styles.dot, styles.dotPending]} />
        </View>
      </View>
      <Text style={styles.tapHint}>Tap para más info →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  header: {
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  badgeContainer: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 6,
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
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
