import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SatelliteImageCard from '../../components/SatelliteImageCard';
import SnowMapCard from '../../components/SnowMapCard';
import WeatherStationCard from '../../components/WeatherStationCard';
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
        {/* ENSO / NOAA */}
        <ENSOCard onPress={() => setShowENSOModal(true)} />

        {/* Satellite Image */}
        <SatelliteImageCard />

        {/* NOAA Weather Station */}
        <WeatherStationCard />

        {/* Snow Map */}
        <SnowMapCard />
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
    paddingTop: 70,
    paddingBottom: 100,
  },
});
