import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trackScreenView, trackEarlyAccessEvent, AnalyticsEvents, trackPurchase } from '../../services/analytics';
import { useUserEngagement } from '../../hooks/useUserEngagement';
import * as IAP from '../../services/iap';

// Pricing configuration
const FOUNDER_PRICE = 29900; // ARS (will be overridden by IAP product price)
const REGULAR_PRICE = 49900; // ARS
const DISCOUNT_PERCENTAGE = 40;

export default function CheckoutScreen() {
  const router = useRouter();
  const { engagement, getEngagementLevel } = useUserEngagement();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackScreenView('Checkout_Screen', 'CheckoutScreen');
    trackEarlyAccessEvent(AnalyticsEvents.CHECKOUT_SCREEN_VIEW, {
      source: 'pro_screen',
      price: FOUNDER_PRICE,
      currency: 'ARS',
    });
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    
    try {
      // Track purchase initiation
      await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_INITIATED, {
        price: FOUNDER_PRICE,
        currency: 'ARS',
      });

      // Initialize IAP connection
      await IAP.initIAP();

      // Purchase through App Store/Play Store
      const purchase = await IAP.purchaseFounderAccess();

      // Verify purchase with backend
      const isValid = await IAP.verifyPurchaseWithBackend(purchase);

      if (isValid) {
        // Track successful purchase
        await trackPurchase({
          transactionId: purchase.transactionId,
          value: FOUNDER_PRICE,
          currency: 'ARS',
          items: [{
            item_id: IAP.PRODUCT_IDS.FOUNDER_ACCESS,
            item_name: 'Andes Powder - Acceso Fundador Season 1',
            price: FOUNDER_PRICE,
          }],
        });

        await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_COMPLETED, {
          price: FOUNDER_PRICE,
          currency: 'ARS',
        });

        // Finish transaction
        await IAP.finishPurchase(purchase);

        setLoading(false);

        Alert.alert(
          '¡Bienvenido, Fundador! 🎉',
          'Tu acceso a Season 1 está asegurado. Recibirás un email de confirmación.',
          [
            {
              text: 'Continuar',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error('Purchase verification failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      
      await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_FAILED, {
        price: FOUNDER_PRICE,
        currency: 'ARS',
      });

      setLoading(false);

      Alert.alert(
        'Error en la compra',
        'No se pudo completar la compra. Por favor intentá de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.founderBadge}>
            <Ionicons name="star" size={20} color="#f59e0b" />
            <Text style={styles.founderBadgeText}>PRECIO FUNDADOR</Text>
          </View>
          <Text style={styles.title}>Acceso Anticipado</Text>
          <Text style={styles.subtitle}>
            Asegurá tu lugar en Season 1 y convertite en fundador de Andes Powder
          </Text>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>Precio Fundador</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${(FOUNDER_PRICE / 100).toLocaleString('es-AR')}</Text>
                <Text style={styles.currency}>ARS</Text>
              </View>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Ahorrás {DISCOUNT_PERCENTAGE}%</Text>
            </View>
          </View>
          
          <View style={styles.regularPrice}>
            <Text style={styles.regularPriceLabel}>Precio regular: </Text>
            <Text style={styles.regularPriceValue}>
              ${(REGULAR_PRICE / 100).toLocaleString('es-AR')}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.includesTitle}>Incluye:</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                Acceso completo a Season 1 (2026)
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                Precio congelado para siempre
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                Badge exclusivo de Fundador
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                Todas las mejoras futuras incluidas
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                Soporte prioritario
              </Text>
            </View>
          </View>
        </View>

        {/* What You Get */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Qué incluye Andes Powder PRO</Text>
          
          <View style={styles.featureCard}>
            <Ionicons name="snow" size={28} color="#63b3ed" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Pronósticos Avanzados</Text>
              <Text style={styles.featureDescription}>
                Storm Crossing Probability, Snow Reality Engine, Powder Windows
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="map" size={28} color="#63b3ed" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Mapas Interactivos</Text>
              <Text style={styles.featureDescription}>
                Cobertura de nieve en tiempo real, capas meteorológicas
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="videocam" size={28} color="#63b3ed" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Webcams Integradas</Text>
              <Text style={styles.featureDescription}>
                Acceso directo a todas las webcams de los cerros
              </Text>
            </View>
          </View>
        </View>

        {/* Engagement Stats (if available) */}
        {engagement && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tu actividad en Season 0</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{engagement.daysActive}</Text>
                <Text style={styles.statLabel}>días activo</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{engagement.resortsViewed}</Text>
                <Text style={styles.statLabel}>cerros vistos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{engagement.forecastsChecked}</Text>
                <Text style={styles.statLabel}>pronósticos</Text>
              </View>
            </View>
            <Text style={styles.statsMessage}>
              ¡Ya sos parte de Andes Powder! Asegurá tu acceso futuro.
            </Text>
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={handlePurchase}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#64748b', '#475569'] : ['#10b981', '#059669']}
            style={styles.ctaGradient}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass" size={24} color="#fff" />
                <Text style={styles.ctaText}>Procesando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-open" size={24} color="#fff" />
                <Text style={styles.ctaText}>Asegurar Acceso Fundador</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Pago único. Sin suscripciones. Precio fundador válido solo durante Season 0.
        </Text>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  founderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#f59e0b',
    marginBottom: 16,
    gap: 6,
  },
  founderBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  pricingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
  },
  currency: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  regularPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  regularPriceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  regularPriceValue: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  includesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  benefitsList: {
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
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  statsCard: {
    backgroundColor: 'rgba(99, 179, 237, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.3)',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#63b3ed',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsMessage: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
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
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
