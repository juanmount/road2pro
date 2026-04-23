import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MapasScreen() {
  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mapas Interactivos</Text>
          <View style={styles.premiumBadge}>
            <Ionicons name="lock-closed" size={16} color="#f59e0b" />
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        </View>

        {/* Premium Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Funcionalidades Premium</Text>
          
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="snow" size={32} color="#63b3ed" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Mapa de Nieve en Tiempo Real</Text>
              <Text style={styles.featureDescription}>
                Visualiza la cobertura de nieve actualizada cada hora
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="videocam" size={32} color="#63b3ed" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Webcams Integradas</Text>
              <Text style={styles.featureDescription}>
                Acceso directo a todas las webcams de los cerros
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="cloud" size={32} color="#63b3ed" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Capas Meteorológicas</Text>
              <Text style={styles.featureDescription}>
                Precipitación, viento, temperatura y más
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="location" size={32} color="#63b3ed" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Tracking GPS</Text>
              <Text style={styles.featureDescription}>
                Registra tus días de esquí y comparte con amigos
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton}>
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.ctaGradient}
          >
            <Ionicons name="star" size={24} color="#fff" />
            <Text style={styles.ctaText}>Desbloquear Premium</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.comingSoon}>Próximamente disponible</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  premiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 179, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  comingSoon: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
