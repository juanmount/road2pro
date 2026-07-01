import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AAOData } from '../services/climate';

interface Props {
  data: AAOData;
}

function trendIcon(trend: AAOData['trend']): string {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
}

function trendLabel(trend: AAOData['trend'], delta: number): string {
  if (trend === 'rising') return `Subiendo +${Math.abs(delta).toFixed(1)}`;
  if (trend === 'falling') return `Bajando -${Math.abs(delta).toFixed(1)}`;
  return 'Estable';
}

function trendColor(trend: AAOData['trend']): string {
  if (trend === 'rising') return '#ef4444';
  if (trend === 'falling') return '#22c55e';
  return '#94a3b8';
}

export default function AAOCard({ data }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const sign = data.current >= 0 ? '+' : '';
  const tc = trendColor(data.trend);

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: data.status.color }]} />

        <View style={styles.mainContent}>
          <Text style={styles.indexLabel}>
            AAO <Text style={[styles.indexValue, { color: data.status.color }]}>{sign}{data.current.toFixed(1)}</Text>
          </Text>
          <Text style={styles.statusText}>{data.status.label}</Text>
        </View>

        <View style={styles.trendContainer}>
          <Text style={[styles.trendArrow, { color: tc }]}>{trendIcon(data.trend)}</Text>
          <Text style={[styles.trendLabel, { color: tc }]}>{trendLabel(data.trend, data.trendDelta)}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Oscilación Antártica (AAO)</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.statusBadge, { backgroundColor: data.status.color + '20', borderColor: data.status.color + '40' }]}>
                <View style={[styles.dot, { backgroundColor: data.status.color }]} />
                <Text style={[styles.badgeLabel, { color: data.status.color }]}>
                  {data.status.label}  —  AAO {sign}{data.current.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>¿Qué es la AAO?</Text>
              <Text style={styles.bodyText}>
                La Oscilación Antártica (AAO) o Modo Anular del Sur (SAM) describe el movimiento norte-sur del cinturón de vientos del oeste que rodea la Antártida.{'\n\n'}
                Es uno de los factores más determinantes para la llegada de tormentas y nevadas a la Cordillera Patagónica.
              </Text>

              <Text style={styles.sectionTitle}>Estado actual</Text>
              <Text style={styles.bodyText}>{data.status.description}</Text>

              <Text style={styles.sectionTitle}>Impacto en nieve</Text>
              <View style={styles.impactBox}>
                <Text style={styles.impactText}>{data.status.impactOnSnow}</Text>
              </View>

              <Text style={styles.sectionTitle}>Tendencia</Text>
              <Text style={styles.bodyText}>
                El índice{' '}
                {data.trend === 'rising' ? 'está subiendo' : data.trend === 'falling' ? 'está bajando' : 'se mantiene estable'}{' '}
                respecto al promedio de los últimos 7 días ({data.trendDelta >= 0 ? '+' : ''}{data.trendDelta.toFixed(2)}).
                {data.trend === 'falling' ? ' Una AAO en descenso es señal positiva para la llegada de frentes.' : ''}
                {data.trend === 'rising' ? ' Una AAO en ascenso implica mayor bloqueo atmosférico.' : ''}
              </Text>

              <Text style={styles.sectionTitle}>Escala de referencia</Text>
              {[
                { range: '> +2.0', color: '#ef4444', label: 'Muy bloqueado', note: 'Frentes casi imposibles' },
                { range: '+1.0 a +2.0', color: '#f97316', label: 'Bloqueado', note: 'Frentes débiles' },
                { range: '0 a +1.0', color: '#eab308', label: 'Neutro +', note: 'Condiciones normales' },
                { range: '-1.0 a 0', color: '#22c55e', label: 'Activo', note: 'Buenos frentes' },
                { range: '< -1.0', color: '#3b82f6', label: 'Muy activo', note: 'Tormentas intensas' },
              ].map((item) => (
                <View key={item.range} style={styles.scaleRow}>
                  <View style={[styles.scaleDot, { backgroundColor: item.color }]} />
                  <Text style={styles.scaleRange}>{item.range}</Text>
                  <Text style={[styles.scaleLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={styles.scaleNote}>{item.note}</Text>
                </View>
              ))}

              <Text style={styles.sourceText}>Fuente: NOAA Climate Prediction Center (CPC) · Actualización diaria</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0c4a6e',
    letterSpacing: 0.3,
  },
  indexValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(100,116,139,0.2)',
    marginLeft: 4,
  },
  trendArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 21,
  },
  impactBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
  },
  impactText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 21,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  scaleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scaleRange: {
    fontSize: 12,
    color: '#94a3b8',
    width: 90,
    fontVariant: ['tabular-nums'],
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 90,
  },
  scaleNote: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  sourceText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
});
