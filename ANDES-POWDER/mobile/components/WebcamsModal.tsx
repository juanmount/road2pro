import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

interface WebcamsModalProps {
  visible: boolean;
  onClose: () => void;
  resortName: string;
}

const WEBCAM_LOCATIONS = [
  { name: 'Villa Catedral', location: 'Base', elevation: '1030m', icon: 'home' as const },
  { name: 'Amancay', location: 'Mid Mountain', elevation: '1600m', icon: 'snow' as const },
  { name: 'Nubes', location: 'Mid-High', elevation: '1800m', icon: 'cloud' as const },
  { name: 'Lynch', location: 'Summit Area', elevation: '2000m', icon: 'triangle' as const },
];

export function WebcamsModal({ visible, onClose, resortName }: WebcamsModalProps) {
  const handleOpenWebcams = async () => {
    try {
      console.log('Opening webcams...');
      await WebBrowser.openBrowserAsync('https://catedralaltapatagonia.com/webcams/');
      console.log('WebBrowser opened successfully');
    } catch (error) {
      console.error('Error opening webcams:', error);
      alert('Error al abrir las webcams. Por favor intenta nuevamente.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{resortName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Ionicons name="videocam" size={64} color="#0ea5e9" />
              <Text style={styles.heroTitle}>Webcams en Vivo</Text>
              <Text style={styles.heroSubtitle}>
                Mirá las condiciones actuales de la montaña en tiempo real
              </Text>
            </View>

            {/* Webcam Locations */}
            <View style={styles.locationsSection}>
              <Text style={styles.sectionTitle}>Cámaras Disponibles</Text>
              {WEBCAM_LOCATIONS.map((location, index) => (
                <View key={index} style={styles.locationCard}>
                  <View style={styles.locationIcon}>
                    <Ionicons name={location.icon} size={24} color="#0ea5e9" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationDetails}>
                      {location.location} • {location.elevation}
                    </Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>
                Las cámaras se actualizan cada 10 minutos y están activas durante la temporada de ski (Junio-Octubre).
              </Text>
            </View>
          </ScrollView>

          {/* CTA Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.ctaButton} onPress={handleOpenWebcams}>
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.ctaButtonText}>Ver Webcams en Vivo</Text>
              <Ionicons name="videocam" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0c4a6e',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  locationsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 2,
  },
  locationDetails: {
    fontSize: 13,
    color: '#64748b',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
});
