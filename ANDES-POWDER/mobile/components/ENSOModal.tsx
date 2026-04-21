import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface ENSOModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ENSOModal({ visible, onClose }: ENSOModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View 
          style={styles.modalContainer}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>ENSO — El Niño Southern Oscillation</Text>
              <Text style={styles.subtitle}>
                Ciclo climático del Pacífico que afecta patrones de tormentas
              </Text>
            </View>

            <View style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>¿Qué es ENSO?</Text>
                <Text style={styles.sectionText}>
                  El Niño-Oscilación del Sur es un fenómeno climático que alterna entre 
                  fases cálidas (El Niño), frías (La Niña) y neutrales en el Océano Pacífico.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Impacto en Patagonia</Text>
                <Text style={styles.sectionText}>
                  Las fases de ENSO modifican la frecuencia e intensidad de tormentas que 
                  cruzan los Andes, afectando directamente las nevadas en los centros de esquí.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ONI (Oceanic Niño Index)</Text>
                <Text style={styles.sectionText}>
                  Índice que mide la temperatura del Pacífico. Valores positivos indican 
                  El Niño, negativos indican La Niña.
                </Text>
              </View>

              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>
                  Andes Powder integra datos ENSO en tiempo real para ajustar pronósticos
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Entendido</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
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
    backgroundColor: '#1e3a5f',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#38bdf8',
    overflow: 'hidden',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  content: {
    marginBottom: 24,
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
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
  },
  feedbackBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
    marginTop: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: '#38bdf8',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#38bdf8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
});
