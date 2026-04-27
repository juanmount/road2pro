import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getGeoColorImage, getInfraredImage, getWaterVaporImage, SatelliteImage } from '../services/satellite';
import { analyzeSatelliteConditions, analyzeImageType, SatelliteAnalysis } from '../services/satelliteAnalysis';

interface SatelliteImageCardProps {
  onPress?: () => void;
}

export default function SatelliteImageCard({ onPress }: SatelliteImageCardProps) {
  const [image, setImage] = useState<SatelliteImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageType, setImageType] = useState<'geocolor' | 'infrared' | 'water_vapor'>('geocolor');
  const [imageError, setImageError] = useState(false);
  const [analysis, setAnalysis] = useState<SatelliteAnalysis | null>(null);

  useEffect(() => {
    loadImage();
    loadAnalysis();
  }, [imageType]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setImageError(false);
      
      let satelliteImage: SatelliteImage;
      switch (imageType) {
        case 'infrared':
          satelliteImage = await getInfraredImage();
          break;
        case 'water_vapor':
          satelliteImage = await getWaterVaporImage();
          break;
        default:
          satelliteImage = await getGeoColorImage();
      }
      
      setImage(satelliteImage);
    } catch (error) {
      console.error('Error loading satellite image:', error);
      setImageError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    try {
      const satelliteAnalysis = await analyzeSatelliteConditions();
      setAnalysis(satelliteAnalysis);
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const getTypeLabel = () => {
    switch (imageType) {
      case 'geocolor': return 'Color Real';
      case 'infrared': return 'Infrarrojo';
      case 'water_vapor': return 'Vapor de Agua';
    }
  };

  const getTypeDescription = () => {
    switch (imageType) {
      case 'geocolor': return 'Vista real. Nubes blancas = tormenta activa';
      case 'infrared': return 'Nubes frías (azul/morado) = nieve intensa';
      case 'water_vapor': return 'Humedad del Pacífico = tormenta en camino';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🛰️ Satélite GOES-16</Text>
          <Text style={styles.subtitle}>Sudamérica en tiempo real</Text>
        </View>
        {onPress && (
          <TouchableOpacity onPress={onPress}>
            <Ionicons name="expand" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, imageType === 'geocolor' && styles.typeButtonActive]}
          onPress={() => setImageType('geocolor')}
        >
          <Text style={[styles.typeText, imageType === 'geocolor' && styles.typeTextActive]}>
            Color
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, imageType === 'infrared' && styles.typeButtonActive]}
          onPress={() => setImageType('infrared')}
        >
          <Text style={[styles.typeText, imageType === 'infrared' && styles.typeTextActive]}>
            IR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, imageType === 'water_vapor' && styles.typeButtonActive]}
          onPress={() => setImageType('water_vapor')}
        >
          <Text style={[styles.typeText, imageType === 'water_vapor' && styles.typeTextActive]}>
            Vapor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descriptionBox}>
        <Ionicons name="information-circle" size={14} color="#60a5fa" />
        <Text style={styles.descriptionText}>{getTypeDescription()}</Text>
      </View>

      {/* Satellite Image */}
      <View style={styles.imageContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Cargando imagen...</Text>
          </View>
        ) : imageError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline" size={32} color="#64748b" />
            <Text style={styles.errorText}>Error al cargar imagen</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadImage}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : image ? (
          <>
            <Image
              source={{ uri: image.url }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            <View style={styles.imageOverlay}>
              {/* Visual Legend */}
              {imageType === 'geocolor' && (
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#fff' }]} />
                    <Text style={styles.legendLabel}>Nubes</Text>
                  </View>
                </View>
              )}
              
              {imageType === 'infrared' && (
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                    <Text style={styles.legendLabel}>Frío = Nieve</Text>
                  </View>
                </View>
              )}
              
              {imageType === 'water_vapor' && (
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#60a5fa' }]} />
                    <Text style={styles.legendLabel}>Humedad</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : null}
      </View>

      {/* AI Analysis */}
      {analysis && (
        <View style={styles.analysisBox}>
          <View style={styles.analysisHeader}>
            <Text style={styles.analysisIcon}>{analysis.icon}</Text>
            <View style={styles.analysisContent}>
              <Text style={styles.analysisTitle}>{analysis.interpretation}</Text>
              <Text style={styles.analysisInsight}>{analysis.actionableInsight}</Text>
              {analysis.affectedResorts.length > 0 && (
                <Text style={styles.analysisResorts}>
                  Afecta: {analysis.affectedResorts.join(', ')}
                </Text>
              )}
            </View>
          </View>
          {analysis.confidence && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {analysis.confidence === 'high' ? '✓ Alta confianza' : 
                 analysis.confidence === 'medium' ? '~ Media confianza' : 
                 '? Baja confianza'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Image-specific interpretation */}
      {analysis && (
        <View style={styles.imageInterpretation}>
          <Ionicons name="analytics-outline" size={12} color="#64748b" />
          <Text style={styles.imageInterpretationText}>
            {analyzeImageType(imageType, analysis)}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={12} color="#94a3b8" />
          <Text style={styles.infoText}>
            Actualizado: {image ? new Date(image.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
        </View>
        <TouchableOpacity onPress={loadImage}>
          <Ionicons name="refresh" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Text style={styles.source}>Análisis: Andes Powder AI • Imagen: NOAA GOES-16</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typeTextActive: {
    color: '#fff',
  },
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(148, 163, 184, 0.3)',
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  descriptionText: {
    flex: 1,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
  },
  imageContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  locationMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 116, 139, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  source: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  analysisBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    padding: 12,
    marginTop: 12,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  analysisIcon: {
    fontSize: 20,
  },
  analysisContent: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analysisInsight: {
    fontSize: 12,
    color: '#f1f5f9',
    lineHeight: 18,
    marginBottom: 6,
  },
  analysisResorts: {
    fontSize: 10,
    color: '#64748b',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  imageInterpretation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    paddingTop: 10,
    marginTop: 10,
  },
  imageInterpretationText: {
    flex: 1,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 15,
  },
});
