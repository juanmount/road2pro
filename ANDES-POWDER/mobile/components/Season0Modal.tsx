import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Season0ModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function Season0Modal({ visible, onClose }: Season0ModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem('season0_modal_seen', 'true');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>SEASON 0</Text>
              </View>
              <Text style={styles.title}>Bienvenido a la Primera Temporada</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.subtitle}>
                Andes Powder está en su primera temporada abierta de validación.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Pronósticos en Validación</Text>
                <Text style={styles.sectionText}>
                  Nuestros algoritmos científicos (Storm Crossing, Snow Reality, ENSO Integration) 
                  se están calibrando con datos reales de esta temporada.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✅ Funciones Core Disponibles</Text>
                <Text style={styles.sectionText}>
                  • Pronósticos por elevación (Base/Mid/Summit){'\n'}
                  • Viento ajustado por altura{'\n'}
                  • Freezing level en tiempo real{'\n'}
                  • Análisis de condiciones para 4 resorts
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚀 Próxima Temporada: Premium</Text>
                <Text style={styles.sectionText}>
                  Alertas inteligentes, favoritos, historial de precisión y más funciones 
                  llegarán en Season 1 (Junio 2026).
                </Text>
              </View>

              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>
                  💬 Tu feedback es clave para mejorar el producto
                </Text>
              </View>
            </View>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>No volver a mostrar</Text>
            </TouchableOpacity>

            {/* Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Entendido, explorar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: 'rgba(26, 54, 93, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 16,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },
  content: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  feedbackBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginTop: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#38bdf8',
    textAlign: 'center',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  button: {
    backgroundColor: '#38bdf8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
