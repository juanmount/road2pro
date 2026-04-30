import { useState } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SatelliteImageCard from '../../components/SatelliteImageCard';
import SnowMapCard from '../../components/SnowMapCard';
import ENSOCard from '../../components/ENSOCard';
import ENSOModal from '../../components/ENSOModal';

export default function RadaresScreen() {
  const [showENSOModal, setShowENSOModal] = useState(false);

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Mapa de Nieve Patagonia</Text>
          <Text style={styles.heroSubtitle}>Nieve acumulada actual en mid (~1600m)</Text>
        </View>

        {/* Snow Map (priority) */}
        <SnowMapCard />

        {/* ENSO / NOAA */}
        <ENSOCard onPress={() => setShowENSOModal(true)} />

        {/* Satellite Image */}
        <SatelliteImageCard />
      </ScrollView>

      {/* ENSO Modal */}
      <ENSOModal 
        visible={showENSOModal}
        onClose={() => setShowENSOModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#94a3b8',
  },
});
