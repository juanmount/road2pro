import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';

interface HourlyData {
  time: string;
  temperature: number;
  precipitation: number;
  snowfall: number;
  phase: string;
  windSpeed: number;
  windGust?: number;
  windDirection?: number;
  humidity: number;
  cloudCover: number;
  freezingLevel: number;
  powderScore: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string;
  hours: HourlyData[];
  elevation: string;
}

const getPhaseIcon = (phase: string): string => {
  switch (phase) {
    case 'snow': return '❄️';
    case 'rain': return '🌧️';
    case 'mixed': return '🌨️';
    default: return '☁️';
  }
};

const getPhaseLabel = (phase: string): string => {
  switch (phase) {
    case 'snow': return 'Nieve';
    case 'rain': return 'Lluvia';
    case 'mixed': return 'Mixto';
    default: return '';
  }
};

export default function HourlyForecastModal({ visible, onClose, date, hours, elevation }: Props) {
  // Debug: Log first 3 hours to see data
  if (visible && hours.length > 0) {
    console.log('[HOURLY MODAL] First 3 hours:', hours.slice(0, 3).map(h => ({
      time: h.time,
      temp: h.temperature,
      precip: h.precipitation,
      snow: h.snowfall,
      phase: h.phase
    })));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{date}</Text>
              <Text style={styles.subtitle}>Pronóstico Horario • {elevation}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {hours.map((hour, index) => {
              const date = new Date(hour.time);
              const hourNum = date.getUTCHours() - 3; // Convert to Argentina time
              const displayHour = hourNum < 0 ? hourNum + 24 : hourNum;
              const hasGust = hour.windGust && hour.windGust > hour.windSpeed * 1.3;
              const hasPrecip = hour.precipitation > 0.1 || hour.snowfall > 0.1;

              return (
                <View key={index} style={styles.hourCard}>
                  <Text style={styles.hourTime}>{displayHour.toString().padStart(2, '0')}H</Text>
                  
                  <Text style={styles.phaseIcon}>{getPhaseIcon(hour.phase)}</Text>
                  
                  <Text style={styles.temperature}>{Math.round(hour.temperature)}°</Text>
                  
                  {hasPrecip ? (
                    <View style={styles.precipSection}>
                      <Text style={styles.precipAmount}>
                        {hour.phase === 'snow' 
                          ? `❄️ ${hour.snowfall.toFixed(1)} cm`
                          : `🌧️ ${hour.precipitation.toFixed(1)} mm`
                        }
                      </Text>
                      <Text style={styles.precipLabel}>{getPhaseLabel(hour.phase)}</Text>
                    </View>
                  ) : (
                    <View style={styles.precipSection}>
                      <Text style={styles.noPrecipText}>Sin precipitación</Text>
                    </View>
                  )}
                  
                  <View style={styles.windSection}>
                    <Text style={styles.windIcon}>💨</Text>
                    <Text style={styles.windSpeed}>{Math.round(hour.windSpeed)} km/h</Text>
                    {hasGust && (
                      <View style={styles.gustRow}>
                        <Text style={styles.gustIcon}>⚠️</Text>
                        <Text style={styles.gustSpeed}>{Math.round(hour.windGust!)} km/h</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailLabel}>Nivel de Congelación</Text>
                    <Text style={styles.detailValue}>❄️ {hour.freezingLevel}m</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#6B7280',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  hourCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hourTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  phaseIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  temperature: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  precipSection: {
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    width: '100%',
    minHeight: 50,
  },
  precipAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  precipLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  noPrecipText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  windSection: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  windIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  windSpeed: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  gustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  gustIcon: {
    fontSize: 12,
  },
  gustSpeed: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  detailsSection: {
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
});
