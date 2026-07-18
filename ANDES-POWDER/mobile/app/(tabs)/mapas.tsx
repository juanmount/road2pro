import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trackScreenView, trackEarlyAccessEvent, AnalyticsEvents } from '../../services/analytics';
import { checkFounderAccess } from '../../services/iap';

export default function MapasScreen() {
  const router = useRouter();
  const [isFounder, setIsFounder] = useState(false);
  useEffect(() => {
    checkFounderAccess().then(setIsFounder);
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

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/Logo_horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.seasonBadge}>
            <Ionicons name="snow" size={12} color="#63b3ed" />
            <Text style={styles.seasonText}>SEASON 0 · GRATIS</Text>
          </View>
        </View>

        {/* Qué es */}
        <Text style={styles.intro}>
          Pronósticos de nieve para los Andes patagónicos. Funciona de junio a octubre.
        </Text>

        {/* Por qué gratis */}
        <View style={styles.freeBlock}>
          <Text style={styles.freeTitle}>¿Por qué es gratis?</Text>
          <Text style={styles.freeText}>
            Season 0 es nuestro primer año. Abrimos el acceso completo sin costo para crecer con la comunidad y validar el producto.
          </Text>
        </View>

        {/* Tecnología */}
        <View style={styles.techBlock}>
          <Text style={styles.techLabel}>LO QUE TENEMOS HOY</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>Storm Crossing Engine</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>Snow Reality Engine</Text></View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>Ajuste por elevación</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>Ciclos ENSO</Text></View>
          </View>

          <Text style={[styles.techLabel, { marginTop: 14 }]}>PLANEADO PARA 2027</Text>
          <View style={styles.pillRow}>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>Mapa de nieve en tiempo real</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>Webcams</Text></View>
          </View>
          <View style={styles.pillRow}>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>Tracking GPS</Text></View>
          </View>
        </View>

        {/* Pase Fundador */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <Ionicons name="ticket-outline" size={20} color="#63b3ed" />
            <Text style={styles.passTitle}>Pase Fundador · Temporada 2027</Text>
          </View>

          <Text style={styles.passDesc}>
            A partir de 2027 la app es paga. Comprando ahora asegurás el acceso de junio a octubre de 2027 al precio más bajo que vamos a ofrecer.
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Precio fundador</Text>
              <Text style={styles.priceValue}>USD 9.99</Text>
              <Text style={styles.priceNote}>Disponible hasta fin de Season 0</Text>
            </View>
            <View style={styles.priceDivider} />
            <View>
              <Text style={styles.priceLabel}>Precio regular 2027</Text>
              <Text style={styles.priceRegular}>~USD 24.99</Text>
              <Text style={styles.priceNote}>Jun – Oct 2027</Text>
            </View>
          </View>

          {isFounder ? (
            <View style={styles.founderConfirmed}>
              <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              <Text style={styles.founderConfirmedText}>¡Ya sos Fundador! Acceso 2027 garantizado.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                trackEarlyAccessEvent(AnalyticsEvents.EARLY_ACCESS_CTA_TAP, {
                  source: 'pro_screen',
                  price: 1200,
                  currency: 'USD',
                });
                router.push('/(tabs)/checkout');
              }}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Comprar Pase Fundador · USD 9.99</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 36,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 179, 237, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.35)',
  },
  seasonText: {
    color: '#63b3ed',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Intro
  intro: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
  },

  // Free block
  freeBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  freeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  freeText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 21,
  },

  // Tech block
  techBlock: {
    marginBottom: 24,
  },
  techLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(99, 179, 237, 0.1)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.25)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#63b3ed',
    textAlign: 'center',
  },
  pillMuted: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pillMutedText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },

  // Pass card
  passCard: {
    backgroundColor: 'rgba(99, 179, 237, 0.07)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 179, 237, 0.2)',
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  passTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  passDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 21,
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#63b3ed',
    textAlign: 'center',
  },
  priceRegular: {
    fontSize: 22,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    textDecorationLine: 'line-through',
  },
  priceNote: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 3,
  },
  priceDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  founderConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12,
    padding: 14,
  },
  founderConfirmedText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
});
