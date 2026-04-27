import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager, ImageBackground, Modal } from 'react-native';
import { StormCrossingBadge } from './StormCrossingBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { getWindDirectionLabel } from '../utils/wind-narrative';
import HourlyForecastModal from './HourlyForecastModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HourlyDetail {
  time: Date;
  temperature: number;
  precipitation: number;
  snowfall: number;
  windSpeed: number;
  windGust?: number;
  windDirection?: number;
  adjustedWindSpeed?: number;
  windCategory?: 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME';
  humidity: number;
  freezingLevel: number;
  phase: string;
  icon: string;
}

interface StormCrossing {
  score: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
}

interface SnowReality {
  forecastSnowfall: number;
  realAccumulation: number;
  adjustments: {
    windLoss: number;
    rainContamination: number;
    densityAdjustment: number;
    solarMelt: number;
    sublimation: number;
  };
  snowQuality: 'POWDER' | 'PACKED' | 'DENSE' | 'WET';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

interface WindImpact {
  category: 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME';
  adjustedWindKmh: number;
  windChill: number;
  liftRisk: 'OPEN' | 'CAUTION' | 'HIGH_RISK' | 'CLOSED';
  skiability: number;
  warnings: string[];
}

interface TrendingData {
  change: number;
  changePercent: number;
  trend: 'increase' | 'decrease' | 'stable';
}

interface DailyForecastCardProps {
  day: string;
  date: string;
  snowfall: number;
  tempHigh: number;
  tempLow: number;
  icon: string;
  isHighlighted?: boolean;
  hourlyDetails?: HourlyDetail[];
  stormCrossing?: StormCrossing;
  snowReality?: SnowReality;
  windImpact?: WindImpact;
  confidenceScore?: number;
  confidenceReason?: string;
  trending?: TrendingData;
  onExpandChange?: (expanded: boolean) => void;
}

export function DailyForecastCard({
  day,
  date,
  snowfall,
  tempHigh,
  tempLow,
  icon,
  isHighlighted = false,
  hourlyDetails = [],
  stormCrossing,
  snowReality,
  windImpact,
  confidenceScore,
  confidenceReason,
  trending,
  onExpandChange
}: DailyForecastCardProps) {
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState<HourlyDetail | null>(null);
  const [showSnowRealityModal, setShowSnowRealityModal] = useState(false);

  // Calculate daily averages from hourly data
  const avgHumidity = hourlyDetails.length > 0 
    ? Math.round(hourlyDetails.reduce((sum, h) => sum + h.humidity, 0) / hourlyDetails.length)
    : 0;
  
  const avgWind = hourlyDetails.length > 0
    ? Math.round(hourlyDetails.reduce((sum, h) => sum + h.windSpeed, 0) / hourlyDetails.length)
    : 0;
  
  const avgFreezingLevel = hourlyDetails.length > 0
    ? Math.round(hourlyDetails.reduce((sum, h) => sum + h.freezingLevel, 0) / hourlyDetails.length)
    : 0;
  
  const totalPrecip = hourlyDetails.reduce((sum, h) => sum + (h.precipitation || 0) + (h.snowfall || 0), 0);
  
  // Check for high gusts during the day
  const maxGust = hourlyDetails.length > 0
    ? Math.max(...hourlyDetails.map(h => h.windGust || 0))
    : 0;
  const hasHighGusts = maxGust >= 40;
  
  // Gust severity colors
  const getGustColor = () => {
    if (maxGust >= 60) return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }; // Red - extreme
    if (maxGust >= 40) return { bg: '#fed7aa', border: '#f97316', text: '#9a3412' }; // Orange - strong
    return { bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' }; // Blue - default
  };

  // Determine background color based on weather
  const getBackgroundColor = () => {
    if (icon.includes('🌨') || icon.includes('❄️')) {
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Snowy purple-blue
    } else if (icon.includes('☀️') || icon.includes('🌤')) {
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // Sunny pink-red
    } else if (icon.includes('☁️')) {
      return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'; // Cloudy blue
    }
    return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'; // Default green-cyan
  };

  return (
    <>
    <TouchableOpacity
      onPress={() => setShowDayModal(true)}
      activeOpacity={0.8}
      style={[
        styles.card,
        styles.normalBackground
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.dayLabel}>{day}</Text>
        <Text style={styles.dateLabel}>{date}</Text>
      </View>
      
      {/* Weather Icon */}
      <View style={styles.iconSection}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>
      
      {/* Wind Badge */}
      <View style={styles.windSection}>
        <Text style={[
          styles.windValue,
          windImpact?.category === 'EXTREME' && styles.windExtreme,
          windImpact?.category === 'STRONG' && styles.windStrong,
          windImpact?.category === 'MODERATE' && styles.windModerate,
        ]}>{windImpact?.adjustedWindKmh || avgWind}</Text>
        <Text style={styles.windUnit}>km/h</Text>
        {hasHighGusts && (
          <View style={[
            styles.gustBadge,
            { 
              backgroundColor: getGustColor().bg,
              borderColor: getGustColor().border
            }
          ]}>
            <Text style={[styles.gustBadgeText, { color: getGustColor().text }]}>
              {Math.round(maxGust)}
            </Text>
          </View>
        )}
      </View>
      
      {/* Temperature */}
      <Text style={styles.tempRange}>
        {Math.round(tempHigh)}°/{Math.round(tempLow)}°
      </Text>
      
      {/* Snow Metric */}
      <View style={styles.snowMetricContainer}>
        <Text style={styles.snowMetricLabel}>
          {snowReality ? 'REAL SNOW' : 'SNOWFALL'}
        </Text>
        <Text style={styles.snowMetricValue}>
          {Math.round(snowfall)}
        </Text>
        <Text style={styles.snowMetricUnit}>cm</Text>
        
        {/* Trending Badge */}
        {trending && trending.trend !== 'stable' && Math.abs(trending.change) >= 1 && (
          <View style={[
            styles.trendingBadge,
            trending.trend === 'increase' ? styles.trendingIncrease : styles.trendingDecrease
          ]}>
            <Text style={[
              styles.trendingText,
              { color: trending.trend === 'increase' ? '#16a34a' : '#ea580c' }
            ]}>
              {trending.trend === 'increase' ? '↑' : '↓'} {Math.abs(trending.change).toFixed(1)}cm
            </Text>
          </View>
        )}
      </View>
      
      {/* Confidence Badge */}
      {confidenceScore !== undefined && totalPrecip > 0 && (
        <View style={styles.confidenceBadgeContainer}>
          <ConfidenceBadge score={confidenceScore} compact={true} />
        </View>
      )}
      
      {/* Info Row */}
      {(snowReality || stormCrossing) && totalPrecip > 0 && (
        <View style={styles.infoRow}>
          {snowReality && (
            <TouchableOpacity 
              onPress={() => setShowSnowRealityModal(true)}
              style={styles.infoItem}
            >
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={[
                styles.infoValue,
                snowReality.snowQuality === 'POWDER' && styles.qualityColorPowder,
                snowReality.snowQuality === 'PACKED' && styles.qualityColorPacked,
                snowReality.snowQuality === 'DENSE' && styles.qualityColorDense,
                snowReality.snowQuality === 'WET' && styles.qualityColorWet,
              ]}>{snowReality.snowQuality}</Text>
            </TouchableOpacity>
          )}
          
          {snowReality && stormCrossing && (
            <View style={styles.infoSeparator} />
          )}
          
          {stormCrossing && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Prob. Tormenta</Text>
              <Text style={[
                styles.infoValue,
                stormCrossing.category === 'HIGH' && styles.stormColorHigh,
                stormCrossing.category === 'MEDIUM' && styles.stormColorMedium,
                stormCrossing.category === 'LOW' && styles.stormColorLow,
              ]}>
                {stormCrossing.category === 'HIGH' ? 'ALTA' : 
                 stormCrossing.category === 'MEDIUM' ? 'MODERADA' : 
                 'BAJA'}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>

      <Modal
        visible={false}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.dayModalOverlay}>
          <View style={styles.dayModalContent}>
            <View style={styles.dayModalHeader}>
              <View>
                <Text style={styles.dayModalTitle}>{day}</Text>
                <Text style={styles.dayModalDate}>{date}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDayModal(false)} style={styles.dayModalClose}>
                <Text style={styles.dayModalCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dayModalBody}>
              {stormCrossing && snowfall > 0 && (
                <ImageBackground
                  source={require('../assets/nieve-catedral-live.jpg')}
                  style={styles.unifiedForecastSection}
                  imageStyle={styles.forecastBackgroundImage}
                >
                  <View style={styles.forecastOverlay}>
                    <View style={styles.singleBadgeContainer}>
                      <StormCrossingBadge 
                        category={stormCrossing.category}
                        score={stormCrossing.score}
                      />
                      <Text style={styles.badgeScore}>{Math.round(stormCrossing.score)}/100</Text>
                    </View>
                    
                    {stormCrossing.explanation && (
                      <Text style={styles.forecastExplanation}>
                        {stormCrossing.explanation}
                      </Text>
                    )}
                  </View>
                </ImageBackground>
              )}
              
              <Text style={styles.hourlyTitle}>Hourly Forecast</Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyScrollContent}
              >
                {hourlyDetails.map((hour, index) => {
                  // Backend returns UTC time, convert to Argentina (UTC-3)
                  const date = new Date(hour.time);
                  let hourTime = date.getUTCHours() - 3;
                  if (hourTime < 0) hourTime += 24; // Handle negative hours
                  const displayTime = hourTime.toString().padStart(2, '0') + 'H';
                  
                  return (
                    <TouchableOpacity key={index} onPress={() => setSelectedHour(hour)} activeOpacity={0.7}>
                      <View style={styles.hourCard}>
                        <Text style={styles.hourTime}>{displayTime}</Text>
                        <Text style={styles.hourIcon}>{hour.icon}</Text>
                        <Text style={styles.hourTemp}>{Math.round(hour.temperature)}°</Text>
                        
                        <View style={styles.hourDivider} />
                        
                        {hour.snowfall > 0 && (
                          <Text style={styles.hourSnowfall}>❄️ {hour.snowfall.toFixed(1)}cm</Text>
                        )}
                        
                        <View style={styles.hourMetrics}>
                          <View>
                            <Text style={[
                              styles.hourMetricText,
                              hour.windCategory === 'EXTREME' && styles.windExtreme,
                              hour.windCategory === 'STRONG' && styles.windStrong,
                              hour.windCategory === 'MODERATE' && styles.windModerate,
                            ]}>{Math.round(hour.adjustedWindSpeed || hour.windSpeed)} km/h</Text>
                            {hour.windGust && hour.windGust > (hour.windSpeed * 1.3) && (
                              <Text style={[styles.hourWindGust, hour.windGust >= 70 && styles.windExtreme]}>⚠ {Math.round(hour.windGust)} km/h</Text>
                            )}
                            {hour.windDirection !== undefined && (
                              <Text style={styles.hourWindDir}>{getWindDirectionLabel(hour.windDirection)}</Text>
                            )}
                          </View>
                          <Text style={styles.hourMetricText}>{Math.round(hour.humidity)}%</Text>
                          <Text style={styles.hourMetricText}>{hour.freezingLevel}m</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedHour !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedHour(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedHour(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {selectedHour && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {new Date(selectedHour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedHour(null)} style={styles.modalClose}>
                      <Text style={styles.modalCloseText}>\u00d7</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalBody}>
                    <View style={styles.modalMainInfo}>
                      <Text style={styles.modalIcon}>{selectedHour.icon}</Text>
                      <Text style={styles.modalTemp}>{Math.round(selectedHour.temperature)}\u00b0C</Text>
                    </View>
                    
                    <View style={styles.modalMetrics}>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>SNOWFALL</Text>
                        <Text style={styles.modalMetricValue}>{selectedHour.snowfall.toFixed(1)} cm</Text>
                      </View>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>FREEZING LEVEL</Text>
                        <Text style={styles.modalMetricValue}>{selectedHour.freezingLevel} m</Text>
                      </View>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>WIND</Text>
                        <Text style={styles.modalMetricValue}>{Math.round(selectedHour.windSpeed)} km/h</Text>
                      </View>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>HUMIDITY</Text>
                        <Text style={styles.modalMetricValue}>{Math.round(selectedHour.humidity)}%</Text>
                      </View>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>PRECIPITATION</Text>
                        <Text style={styles.modalMetricValue}>{selectedHour.precipitation.toFixed(1)} mm</Text>
                      </View>
                      <View style={styles.modalMetric}>
                        <Text style={styles.modalMetricLabel}>SNOW QUALITY</Text>
                        <Text style={styles.modalMetricValue}>{selectedHour.phase === 'snow' ? 'Powder' : selectedHour.phase === 'rain' ? 'Wet' : 'Mixed'}</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Snow Reality Analysis Modal */}
      <Modal
        visible={showSnowRealityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSnowRealityModal(false)}
      >
        <View style={styles.dayModalOverlay}>
          <View style={styles.dayModalContent}>
            <View style={styles.dayModalHeader}>
              <Text style={styles.dayModalTitle}>Snow Reality Analysis</Text>
              <TouchableOpacity onPress={() => setShowSnowRealityModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {snowReality && (
              <ScrollView style={styles.dayModalBody}>
                {/* Quality Badge */}
                <View style={styles.realitySection}>
                  <View style={styles.realityQualityBadge}>
                    <Text style={[
                      styles.realityQualityText,
                      snowReality.snowQuality === 'POWDER' && styles.qualityColorPowder,
                      snowReality.snowQuality === 'PACKED' && styles.qualityColorPacked,
                      snowReality.snowQuality === 'DENSE' && styles.qualityColorDense,
                      snowReality.snowQuality === 'WET' && styles.qualityColorWet,
                    ]}>{snowReality.snowQuality}</Text>
                    <Text style={styles.realityConfidenceText}>Confidence: {snowReality.confidence}</Text>
                  </View>
                </View>

                {/* Forecast vs Reality */}
                <View style={styles.realitySection}>
                  <Text style={styles.realitySectionTitle}>Accumulation</Text>
                  <View style={styles.realityComparisonRow}>
                    <View style={styles.realityComparisonItem}>
                      <Text style={styles.realityLabel}>Forecast</Text>
                      <Text style={styles.realityValue}>{Math.round(snowReality.forecastSnowfall)} cm</Text>
                    </View>
                    <Text style={styles.realityArrow}>→</Text>
                    <View style={styles.realityComparisonItem}>
                      <Text style={styles.realityLabel}>Real</Text>
                      <Text style={[styles.realityValue, styles.realityValueHighlight]}>
                        {Math.round(snowReality.realAccumulation)} cm
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.realityDifference}>
                    {Math.round(((snowReality.realAccumulation - snowReality.forecastSnowfall) / snowReality.forecastSnowfall) * 100)}% adjustment
                  </Text>
                </View>

                {/* Adjustments Breakdown */}
                <View style={styles.realitySection}>
                  <Text style={styles.realitySectionTitle}>Adjustment Factors</Text>
                  
                  {snowReality.adjustments.windLoss > 0 && (
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentIcon}>🌬️</Text>
                      <Text style={styles.adjustmentLabel}>Wind Redistribution</Text>
                      <Text style={styles.adjustmentValue}>-{snowReality.adjustments.windLoss}%</Text>
                    </View>
                  )}
                  
                  {snowReality.adjustments.rainContamination > 0 && (
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentIcon}>🌧️</Text>
                      <Text style={styles.adjustmentLabel}>Rain Contamination</Text>
                      <Text style={styles.adjustmentValue}>-{snowReality.adjustments.rainContamination}%</Text>
                    </View>
                  )}
                  
                  {snowReality.adjustments.densityAdjustment !== 0 && (
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentIcon}>❄️</Text>
                      <Text style={styles.adjustmentLabel}>Snow Density</Text>
                      <Text style={styles.adjustmentValue}>
                        {snowReality.adjustments.densityAdjustment > 0 ? '+' : ''}{snowReality.adjustments.densityAdjustment}%
                      </Text>
                    </View>
                  )}
                  
                  {snowReality.adjustments.solarMelt > 0 && (
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentIcon}>☀️</Text>
                      <Text style={styles.adjustmentLabel}>Solar Melt</Text>
                      <Text style={styles.adjustmentValue}>-{snowReality.adjustments.solarMelt}%</Text>
                    </View>
                  )}
                  
                  {snowReality.adjustments.sublimation > 0 && (
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentIcon}>🍂</Text>
                      <Text style={styles.adjustmentLabel}>Seasonal Loss</Text>
                      <Text style={styles.adjustmentValue}>-{snowReality.adjustments.sublimation}%</Text>
                    </View>
                  )}
                </View>

                {/* Explanation */}
                <View style={styles.realitySection}>
                  <Text style={styles.realitySectionTitle}>Analysis</Text>
                  <Text style={styles.realityExplanation}>{snowReality.explanation}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* New Clean Hourly Forecast Modal */}
      <HourlyForecastModal
        visible={showDayModal}
        onClose={() => setShowDayModal(false)}
        date={`${day} ${date}`}
        hours={(() => {
          // DEBUG: Log what hourlyDetails actually contains
          console.log('DEBUG hourlyDetails ALL:', hourlyDetails.map(h => ({
            time: h.time,
            precipitation: h.precipitation,
            snowfall: h.snowfall,
            phase: h.phase
          })));
          
          return hourlyDetails.map(h => ({
          time: h.time.toISOString(),
          temperature: h.temperature,
          precipitation: h.precipitation,
          snowfall: h.snowfall,
          phase: h.phase,
          windSpeed: h.windSpeed,
          windGust: h.windGust,
          windDirection: h.windDirection,
          humidity: h.humidity,
          cloudCover: 0,
          freezingLevel: h.freezingLevel,
          powderScore: 0
        }));
        })()}
        elevation={`MID`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    minHeight: 200,
    padding: 14,
    borderRadius: 18,
    marginHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(186, 230, 253, 0.6)',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dayModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dayModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#475569',
  },
  dayModalDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  dayModalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
  },
  dayModalCloseText: {
    fontSize: 28,
    color: '#64748b',
    fontWeight: '300',
  },
  dayModalBody: {
    paddingHorizontal: 20,
  },
  hourlyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    marginTop: 8,
  },
  daySummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7dd3fc',
  },
  daySummaryText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 12,
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#64748b',
    lineHeight: 20,
  },
  normalBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  highlightedBackground: {
    backgroundColor: '#7dd3fc',
  },
  highlightedCard: {
    borderColor: '#7dd3fc',
  },
  highlightedText: {
    color: '#334155',
  },
  cardHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(186, 230, 253, 0.4)',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0c4a6e',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 1,
  },
  dateLabel: {
    fontSize: 9,
    color: '#0284c7',
    textAlign: 'center',
    fontWeight: '600',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 34,
  },
  windSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 2,
  },
  windValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 0.3,
  },
  windUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284c7',
  },
  windCategoryBadge: {
    fontSize: 12,
    marginLeft: 2,
  },
  windExtreme: {
    color: '#ef4444',
  },
  windStrong: {
    color: '#fb923c',
  },
  windModerate: {
    color: '#3b82f6',
  },
  gustBadge: {
    marginLeft: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  gustBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0369a1',
  },
  tempRange: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0c4a6e',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  snowMetricContainer: {
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(224, 242, 254, 0.5)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(186, 230, 253, 0.7)',
  },
  snowMetricLabel: {
    fontSize: 7,
    color: '#0369a1',
    fontWeight: '800',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  snowMetricValue: {
    fontSize: 24,
    color: '#1e293b',
    fontWeight: '900',
    lineHeight: 24,
  },
  snowMetricUnit: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  trendingBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendingIncrease: {
    backgroundColor: '#dcfce7',
  },
  trendingDecrease: {
    backgroundColor: '#fed7aa',
  },
  trendingText: {
    fontSize: 8,
    fontWeight: '700',
  },
  compactMetrics: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginTop: 2,
  },
  compactMetric: {
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 2,
  },
  compactValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  precipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  precipIcon: {
    fontSize: 10,
  },
  precipAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7dd3fc',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '300',
    color: '#64748b',
    lineHeight: 22,
  },
  summaryUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    marginBottom: 12,
  },
  hourlyScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  hourCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    minWidth: 75,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  hourTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  hourIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  hourTemp: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  hourDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  hourSnowfall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
    marginBottom: 4,
  },
  hourMetrics: {
    width: '100%',
    gap: 3,
    alignItems: 'center',
  },
  hourMetricText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
  },
  hourWindDir: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  hourWindGust: {
    fontSize: 9,
    color: '#f97316',
    fontWeight: '700',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: 300,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalBody: {
    padding: 16,
  },
  modalMainInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  modalTemp: {
    fontSize: 32,
    fontWeight: '700',
    color: '#475569',
  },
  modalMetrics: {
    gap: 12,
  },
  modalMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  modalMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  stormCrossingSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  stormExplanation: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 7,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  qualityColorPowder: {
    color: '#22c55e',
  },
  qualityColorPacked: {
    color: '#3b82f6',
  },
  qualityColorDense: {
    color: '#fb923c',
  },
  qualityColorWet: {
    color: '#ef4444',
  },
  stormColorHigh: {
    color: '#22c55e',
  },
  stormColorMedium: {
    color: '#fb923c',
  },
  stormColorLow: {
    color: '#ef4444',
  },
  realitySection: {
    marginBottom: 20,
  },
  realitySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  realityQualityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  realityQualityText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  realityConfidenceText: {
    fontSize: 12,
    color: '#64748b',
  },
  realityComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  realityComparisonItem: {
    alignItems: 'center',
  },
  realityLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  realityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  realityValueHighlight: {
    color: '#3b82f6',
  },
  realityArrow: {
    fontSize: 24,
    color: '#cbd5e1',
  },
  realityDifference: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  adjustmentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  adjustmentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  adjustmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  confidenceBadgeContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  confidenceSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  realityExplanation: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  unifiedForecastSection: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  forecastBackgroundImage: {
    borderRadius: 12,
    opacity: 1.0,
  },
  forecastOverlay: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  singleBadgeContainer: {
    alignItems: 'center',
    gap: 8,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  forecastExplanation: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});
