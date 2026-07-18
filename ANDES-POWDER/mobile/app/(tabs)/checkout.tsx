import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trackScreenView, trackEarlyAccessEvent, AnalyticsEvents, trackPurchase } from '../../services/analytics';
import { useUserEngagement } from '../../hooks/useUserEngagement';
import * as IAP from '../../services/iap';
import { logEvent, logPurchase } from '../../services/meta';

// Pricing configuration
const FOUNDER_PRICE_USD = 9.99;
const REGULAR_PRICE_USD = 24.99;
const DISCOUNT_PERCENTAGE = 60;

export default function CheckoutScreen() {
  const router = useRouter();
  const { engagement, getEngagementLevel } = useUserEngagement();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    IAP.checkFounderAccess().then(status => {
      setIsFounder(status);
      setCheckingStatus(false);
    });
    trackScreenView('Checkout_Screen', 'CheckoutScreen');
    trackEarlyAccessEvent(AnalyticsEvents.CHECKOUT_SCREEN_VIEW, {
      source: 'pro_screen',
      price: FOUNDER_PRICE_USD,
      currency: 'USD',
    });
    // Meta App Events: view founder offer
    logEvent('view_founder_offer', { price: FOUNDER_PRICE_USD, currency: 'USD' });
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    
    try {
      // Track purchase initiation
      await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_INITIATED, {
        price: FOUNDER_PRICE_USD,
        currency: 'USD',
      });
      // Meta App Events: purchase initiated
      logEvent('purchase_initiated', { value: FOUNDER_PRICE_USD, currency: 'USD' });

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
          value: FOUNDER_PRICE_USD,
          currency: 'USD',
          items: [{
            item_id: IAP.PRODUCT_IDS.FOUNDER_ACCESS,
            item_name: 'Andes Powder - Pase Fundador Temporada 2027',
            price: FOUNDER_PRICE_USD,
          }],
        });

        await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_COMPLETED, {
          price: FOUNDER_PRICE_USD,
          currency: 'USD',
        });
        // Meta App Events: purchase success (value + currency)
        logPurchase(FOUNDER_PRICE_USD, 'USD', {
          transaction_id: purchase.transactionId,
          item_id: IAP.PRODUCT_IDS.FOUNDER_ACCESS,
        });

        // Finish transaction
        await IAP.finishPurchase(purchase);

        setIsFounder(true);
        setLoading(false);

        Alert.alert(
          '¡Bienvenido, Fundador! 🎉',
          'Tu pase para la temporada 2027 está confirmado. ¡Nos vemos en junio!',
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
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (!error?.userCancelled) {
        await trackEarlyAccessEvent(AnalyticsEvents.PURCHASE_FAILED, {
          price: FOUNDER_PRICE_USD,
          currency: 'USD',
        });
        // Meta App Events: purchase_failed
        logEvent('purchase_failed', { code: error?.code || error?.errorCode });
      }

      setLoading(false);

      if (error?.userCancelled) {
        // Meta App Events: purchase_cancel
        logEvent('purchase_cancel');
        return;
      }

      const isNotConfigured =
        error?.message?.includes('No products or offerings') ||
        error?.code === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE' ||
        error?.errorCode === 7;

      Alert.alert(
        'Error en la compra',
        isNotConfigured
          ? 'El producto no está disponible en la tienda todavía. Estamos terminando la configuración — pronto podrás comprar el Pase Fundador.'
          : 'No se pudo completar la compra. Por favor intentá de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await IAP.initIAP();
      const restored = await IAP.restorePurchases();
      if (restored) {
        setIsFounder(true);
        Alert.alert('Compras restauradas', 'Tu compra fue restaurada correctamente.');
      } else {
        Alert.alert('No hay compras para restaurar', 'No encontramos compras activas asociadas a tu cuenta. Asegurate de usar el mismo Apple ID.');
      }
    } catch (e) {
      Alert.alert('Error al restaurar', 'No se pudo restaurar la compra. Por favor, intentá nuevamente.');
    } finally {
      setRestoring(false);
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
            <Text style={styles.founderBadgeText}>PASE FUNDADOR 2027</Text>
          </View>
          <Text style={styles.title}>Pase Fundador 2027</Text>
          <Text style={styles.subtitle}>
            Apoyá el desarrollo de la única tecnología de nieve diseñada exclusivamente para la Cordillera de los Andes. Asegurá tu acceso permanente para el invierno 2027 al precio más bajo posible.
          </Text>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>Precio Fundador (Único Pago)</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>USD {FOUNDER_PRICE_USD}</Text>
              </View>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Ahorrás {DISCOUNT_PERCENTAGE}%</Text>
            </View>
          </View>
          
          <View style={styles.regularPrice}>
            <Text style={styles.regularPriceLabel}>Precio regular temporada 2027: </Text>
            <Text style={styles.regularPriceValue}>USD {REGULAR_PRICE_USD}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.includesTitle}>¿Por qué un Pase Fundador?</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                <Text style={{fontWeight: 'bold', color: '#fff'}}>Temporada 0 Gratis:</Text> Todo el invierno actual es 100% libre. Queremos que calibres nuestros modelos con tus propias bajadas y ganes confianza.
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="hardware-chip" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                <Text style={{fontWeight: 'bold', color: '#fff'}}>Sensores en la Montaña:</Text> Tu aporte financia la instalación de estaciones meteorológicas propias en sectores clave fuera de pista.
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="analytics" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                <Text style={{fontWeight: 'bold', color: '#fff'}}>Física, No Milagros:</Text> No garantizamos precisión mágica porque el clima patagónico es salvaje. Pero te aseguramos los algoritmos físicos más honestos del mercado.
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.benefitText}>
                <Text style={{fontWeight: 'bold', color: '#fff'}}>Pase Completo 2027:</Text> Acceso total e ilimitado de Junio a Octubre de 2027 con todas las mejoras de radar y alertas en tiempo real.
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
        {isFounder ? (
          <View style={styles.founderConfirmed}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <Text style={styles.founderConfirmedTitle}>¡Ya sos Fundador!</Text>
            <Text style={styles.founderConfirmedDesc}>Tu pase para Temporada 2027 está confirmado. Acceso garantizado de junio a octubre de 2027.</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handlePurchase}
              disabled={loading || restoring || checkingStatus}
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
                    <Text style={styles.ctaText}>Comprar Pase Fundador · USD 9.99</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Pago único por temporada. El pase da acceso de junio a octubre de 2027. Precio fundador válido hasta fin de Season 0.
            </Text>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading || restoring || checkingStatus}
            >
              <Ionicons name="refresh" size={18} color={loading || restoring || checkingStatus ? '#94a3b8' : '#63b3ed'} />
              <Text style={[styles.restoreText, (loading || restoring || checkingStatus) && { color: '#94a3b8' }]}>
                Restaurar compras
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#63b3ed',
  },
  founderConfirmed: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 28,
    marginTop: 8,
    gap: 10,
  },
  founderConfirmedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
  },
  founderConfirmedDesc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
