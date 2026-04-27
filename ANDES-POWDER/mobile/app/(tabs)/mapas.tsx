import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trackScreenView, trackEarlyAccessEvent, AnalyticsEvents } from '../../services/analytics';

export default function MapasScreen() {
  const router = useRouter();
  // Track screen view on mount
  useEffect(() => {
    trackScreenView('PRO_Screen', 'EarlyAccessScreen');
    trackEarlyAccessEvent(AnalyticsEvents.PRO_SCREEN_VIEW, {
      source: 'tab_navigation',
    });
  }, []);
  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Season 0 Badge */}
        <View style={styles.seasonBadge}>
          <Ionicons name="snow" size={16} color="#10b981" />
          <Text style={styles.seasonText}>SEASON 0 • ACCESO COMPLETO GRATIS</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Andes Powder PRO</Text>
          <Text style={styles.subtitle}>
            Esta temporada es gratuita.{'\n'}
            Aprovechá el acceso completo durante el lanzamiento.
          </Text>
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

        {/* Early Access Section */}
        <View style={styles.earlyAccessSection}>
          <View style={styles.earlyAccessHeader}>
            <Ionicons name="rocket" size={24} color="#10b981" />
            <Text style={styles.earlyAccessTitle}>Acceso Anticipado</Text>
          </View>
          
          <Text style={styles.earlyAccessDescription}>
            Asegurá tu acceso a la próxima temporada a precio fundador.
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Precio fundador congelado</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Acceso asegurado Season 1</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Distintivo de fundador</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Mejoras futuras incluidas</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => {
              // Track CTA tap
              trackEarlyAccessEvent(AnalyticsEvents.EARLY_ACCESS_CTA_TAP, {
                source: 'pro_screen',
                price: 29900,
                currency: 'ARS',
              });
              // Navigate to checkout
              router.push('/(tabs)/checkout');
            }}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.ctaGradient}
            >
              <Ionicons name="lock-open" size={24} color="#fff" />
              <Text style={styles.ctaText}>Reservar Próxima Temporada</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.priceInfo}>
            Precio fundador: $XX.XXX • Ahorrás XX% vs precio regular
          </Text>
        </View>
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
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 24,
  },
  seasonText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 0.5,
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
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
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
  earlyAccessSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  earlyAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  earlyAccessTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10b981',
  },
  earlyAccessDescription: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#e2e8f0',
    flex: 1,
  },
  priceInfo: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
