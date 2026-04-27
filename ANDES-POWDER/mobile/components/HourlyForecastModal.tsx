import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { getWindDirectionLabel } from '../utils/wind-narrative';

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
              const hasPrecip = hour.precipitation >= 0.1 || hour.snowfall >= 0.1;
              
              // DEBUG: Log first few hours to see what data we get
              if (index < 5) {
                console.log(`Hour ${index}:`, {
                  time: hour.time,
                  precipitation: hour.precipitation,
                  snowfall: hour.snowfall,
                  phase: hour.phase,
                  hasPrecip
                });
              }

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
                    <Text style={styles.windDirection}>{getWindDirectionLabel(hour.windDirection || 0)}</Text>
                    <Text style={styles.windSpeed}>{Math.round(hour.windSpeed)} km/h</Text>
                    {hasGust && (
                      <Text style={styles.gustSpeed}>⚠ {Math.round(hour.windGust!)} km/h</Text>
                    )}
                  </View>
                  
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailLabel}>Freezing Level</Text>
                    <Text style={styles.detailValue}>{hour.freezingLevel}m</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hourTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  phaseIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  temperature: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  precipSection: {
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    width: '100%',
    minHeight: 42,
  },
  precipAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 1,
  },
  precipLabel: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  noPrecipText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  windSection: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    gap: 2,
  },
  windDirection: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  windSpeed: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
  },
  gustSpeed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 2,
  },
  detailsSection: {
    width: '100%',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
});
