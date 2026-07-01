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
import { SAMData } from '../services/climate';

interface Props {
  data: SAMData;
}

function trendIcon(trend: SAMData['trend']): string {
  if (trend === 'improving') return '↓';
  if (trend === 'worsening') return '↑';
  return '→';
}

function trendColor(trend: SAMData['trend']): string {
  if (trend === 'improving') return '#22c55e';
  if (trend === 'worsening') return '#ef4444';
  return '#94a3b8';
}

export default function SAMCard({ data }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const tc = trendColor(data.trend);

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: data.status.color }]} />

        <Text style={[styles.statusText, { color: data.status.color }]}>
          {data.status.label}
        </Text>

        <View style={styles.trendContainer}>
          <Text style={[styles.trendArrow, { color: tc }]}>{trendIcon(data.trend)}</Text>
          <Text style={[styles.trendLabel, { color: tc }]}>{data.trendLabel}</Text>
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
              <Text style={styles.modalTitle}>Circulación del Oeste</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.statusBadge, { backgroundColor: data.status.color + '20', borderColor: data.status.color + '40' }]}>
                <View style={[styles.dot, { backgroundColor: data.status.color }]} />
                <Text style={[styles.badgeLabel, { color: data.status.color }]}>
                  {data.status.label}
                </Text>
              </View>

              <Text style={styles.bodyText}>
                {data.status.description}{'\n'}{data.status.impactOnSnow}
              </Text>

              <View style={[styles.trendBox, { borderColor: trendColor(data.trend) + '40', marginTop: 12 }]}>
                <Text style={[styles.trendIcon, { color: trendColor(data.trend) }]}>
                  {trendIcon(data.trend)}
                </Text>
                <Text style={styles.bodyText}>
                  {data.trendLabel}.{' '}
                  {data.trend === 'improving'
                    ? 'El flujo del oeste se recupera — señal positiva para la llegada de frentes.'
                    : data.trend === 'worsening'
                    ? 'El bloqueo se intensifica. Menor probabilidad de frentes en los próximos días.'
                    : 'Sin cambios significativos en el patrón esta semana.'}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Escala</Text>
              {[
                { color: '#ef4444', label: 'Circulación bloqueada', note: 'Frentes casi imposibles' },
                { color: '#f97316', label: 'Frentes limitados', note: 'Frentes débiles' },
                { color: '#eab308', label: 'Condición normal', note: 'Cruce moderado' },
                { color: '#22c55e', label: 'Frentes favorables', note: 'Buenos frentes' },
                { color: '#3b82f6', label: 'Alta actividad frontal', note: 'Tormentas intensas' },
              ].map((item) => (
                <View key={item.label} style={styles.scaleRow}>
                  <View style={[styles.scaleDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.scaleLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={styles.scaleNote}>{item.note}</Text>
                </View>
              ))}

              <Text style={styles.sourceText}>
                Calculado en tiempo real desde datos GFS · Open-Meteo
              </Text>
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
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(100,116,139,0.2)',
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
    maxHeight: '90%',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
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
  trendBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  trendIcon: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 1,
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
    flexShrink: 0,
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  scaleNote: {
    fontSize: 11,
    color: '#64748b',
    width: 130,
    textAlign: 'right',
  },
  sourceText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
});
