import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
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
        {/* Logo & Brand Header */}
        <View style={styles.brandHeader}>
          <Image 
            source={require('../../assets/Logo_horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTagline}>Pronósticos científicos para Patagonia</Text>
        </View>

        {/* Season 0 Badge */}
        <View style={styles.seasonBadge}>
          <Ionicons name="snow" size={14} color="#63b3ed" />
          <Text style={styles.seasonText}>SEASON 0 GRATIS</Text>
        </View>

        {/* Why Andes Powder - Compact */}
        <View style={styles.whyCompact}>
          <Text style={styles.whyCompactText}>
            <Text style={styles.whyBold}>Algoritmos únicos</Text> para Patagonia: Storm Crossing, Snow Reality Engine, ajustes por elevación. 
            <Text style={styles.whyBold}> Más precisos que apps genéricas.</Text>
          </Text>
        </View>

        {/* Early Access Section - MOVED TO TOP */}
        <View style={styles.earlyAccessSection}>
          <View style={styles.earlyAccessHeader}>
            <Ionicons name="rocket" size={24} color="#63b3ed" />
            <Text style={styles.earlyAccessTitle}>Acceso Anticipado Season 1</Text>
          </View>
          
          <Text style={styles.earlyAccessDescription}>
            Asegurá tu acceso a la próxima temporada a precio fundador.{'\n'}
            Precio congelado para siempre.
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#63b3ed" />
              <Text style={styles.benefitText}>Precio fundador congelado de por vida</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#63b3ed" />
              <Text style={styles.benefitText}>Acceso garantizado Season 1 (2026)</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#63b3ed" />
              <Text style={styles.benefitText}>Badge exclusivo de Fundador</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#63b3ed" />
              <Text style={styles.benefitText}>Todas las mejoras futuras incluidas</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#63b3ed" />
              <Text style={styles.benefitText}>Soporte prioritario</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => {
              trackEarlyAccessEvent(AnalyticsEvents.EARLY_ACCESS_CTA_TAP, {
                source: 'pro_screen',
                price: 29900,
                currency: 'ARS',
              });
              router.push('/(tabs)/checkout');
            }}
          >
            <LinearGradient
              colors={['#0ea5e9', '#0284c7']}
              style={styles.ctaGradient}
            >
              <Ionicons name="lock-open" size={24} color="#fff" />
              <Text style={styles.ctaText}>Reservar Próxima Temporada</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.priceInfo}>
            Precio fundador: $299 ARS • Ahorrás 40% vs precio regular
          </Text>
        </View>

        {/* Current Features - Compact Grid */}
        <View style={styles.featuresGrid}>
          <Text style={styles.sectionTitle}>Incluido ahora (gratis)</Text>
          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Ionicons name="snow" size={16} color="#63b3ed" />
              <Text style={styles.featurePillText}>Pronósticos 7 días</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="analytics" size={16} color="#63b3ed" />
              <Text style={styles.featurePillText}>Snow Engine</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Ionicons name="thunderstorm" size={16} color="#63b3ed" />
              <Text style={styles.featurePillText}>Storm Crossing</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="notifications" size={16} color="#63b3ed" />
              <Text style={styles.featurePillText}>Alertas inteligentes</Text>
            </View>
          </View>
        </View>

        {/* Future Features - Compact */}
        <View style={styles.futureCompact}>
          <Text style={styles.sectionTitle}>Próximamente (Season 1+)</Text>
          <View style={styles.futureList}>
            <Text style={styles.futureItem}>• Mapa de nieve en tiempo real</Text>
            <Text style={styles.futureItem}>• Webcams integradas</Text>
            <Text style={styles.futureItem}>• Tracking GPS</Text>
            <Text style={styles.futureItem}>• Análisis avanzado</Text>
          </View>
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
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 280,
    height: 60,
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 179, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#63b3ed',
    marginBottom: 16,
  },
  seasonText: {
    color: '#63b3ed',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 0.8,
  },
  whyCompact: {
    backgroundColor: 'rgba(99, 179, 237, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.2)',
  },
  whyCompactText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 14,
  },
  featuresGrid: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  featurePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 179, 237, 0.1)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.3)',
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#63b3ed',
    flex: 1,
  },
  futureCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  futureList: {
    gap: 8,
    marginTop: 8,
  },
  futureItem: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  whyBold: {
    fontWeight: '700',
    color: '#e2e8f0',
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
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
    backgroundColor: 'rgba(99, 179, 237, 0.08)',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
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
    color: '#63b3ed',
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
