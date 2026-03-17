import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getWeatherIcon } from '../utils/weather-icons';

interface HourlyData {
  time: Date;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  cloudCover: number;
  phase: string;
  freezingLevel: number | null;
  snowfall: number;
}

interface Forecast48HoursProps {
  hourlyData: HourlyData[];
  elevation: string;
}

interface PeriodSummary {
  label: string;
  hours: HourlyData[];
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  totalSnow: number;
  totalRain: number;
  icon: string;
  freezingLevel: number | null;
  avgHumidity: number;
}

export function Forecast48Hours({ hourlyData, elevation }: Forecast48HoursProps) {
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);

  // Group data by full days
  const groupIntoPeriods = (): PeriodSummary[] => {
    const periods: PeriodSummary[] = [];
    
    // Group hours by date
    const dayGroups = new Map<string, HourlyData[]>();
    
    hourlyData.forEach(hour => {
      const dateKey = `${hour.time.getDate()}/${hour.time.getMonth() + 1}`;
      if (!dayGroups.has(dateKey)) {
        dayGroups.set(dateKey, []);
      }
      dayGroups.get(dateKey)!.push(hour);
    });
    
    // Create period for each day
    dayGroups.forEach((dayHours, dateKey) => {
      const firstHour = dayHours[0].time;
      const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][firstHour.getDay()];
      const label = `${dayName} ${dateKey}`;
      
      // Calculate averages and totals
      const temps = dayHours.map(h => h.temperature);
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);
      
      const totalSnow = dayHours.reduce((sum, h) => sum + (h.phase === 'snow' ? h.snowfall : 0), 0);
      const totalRain = dayHours.reduce((sum, h) => sum + (h.phase === 'rain' ? h.precipitation : 0), 0);
      
      const avgHumidity = dayHours.reduce((sum, h) => sum + h.humidity, 0) / dayHours.length;
      
      // Get representative icon (from afternoon, around 15:00)
      const afternoonHour = dayHours.find(h => h.time.getHours() === 15) || dayHours[Math.floor(dayHours.length / 2)];
      const icon = getWeatherIcon({
        hour: afternoonHour.time.getHours(),
        phase: afternoonHour.phase,
        cloudCover: afternoonHour.cloudCover,
        precipitation: afternoonHour.precipitation,
      });
      
      const freezingLevel = afternoonHour.freezingLevel;
      
      periods.push({
        label,
        hours: dayHours,
        avgTemp,
        maxTemp,
        minTemp,
        totalSnow,
        totalRain,
        icon,
        freezingLevel,
        avgHumidity,
      });
    });
    
    return periods;
  };

  const periods = groupIntoPeriods();

  const togglePeriod = (index: number) => {
    setExpandedPeriod(expandedPeriod === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pronóstico Extendido (7 Días)</Text>
      <Text style={styles.subtitle}>Elevación: {elevation}</Text>
      
      <ScrollView style={styles.periodsContainer}>
        {periods.map((period, index) => (
          <View key={index} style={styles.periodCard}>
            <TouchableOpacity
              style={styles.periodHeader}
              onPress={() => togglePeriod(index)}
            >
              <View style={styles.periodHeaderLeft}>
                <Text style={styles.periodLabel}>{period.label}</Text>
                <Text style={styles.periodIcon}>{period.icon}</Text>
              </View>
              
              <View style={styles.periodHeaderRight}>
                <Text style={styles.periodTemp}>
                  {Math.round(period.maxTemp)}° / {Math.round(period.minTemp)}°
                </Text>
                
                {period.totalSnow > 0 && (
                  <Text style={styles.periodSnow}>❄️ {period.totalSnow.toFixed(1)}cm</Text>
                )}
                {period.totalRain > 0 && (
                  <Text style={styles.periodRain}>🌧️ {period.totalRain.toFixed(1)}mm</Text>
                )}
                
                <Text style={styles.expandIcon}>
                  {expandedPeriod === index ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {expandedPeriod === index && (
              <View style={styles.periodDetails}>
                {/* Summary Stats */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Temp Máx</Text>
                    <Text style={styles.summaryValue}>{Math.round(period.maxTemp)}°C</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Temp Mín</Text>
                    <Text style={styles.summaryValue}>{Math.round(period.minTemp)}°C</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Temp Prom</Text>
                    <Text style={styles.summaryValue}>{Math.round(period.avgTemp)}°C</Text>
                  </View>
                </View>
                
                {/* Hourly Breakdown */}
                <View style={styles.hourlyBreakdown}>
                  <Text style={styles.hourlyTitle}>Detalles por Hora:</Text>
                  <View style={styles.hourlyHeader}>
                    <Text style={styles.headerTime}>Hora</Text>
                    <Text style={styles.headerIcon}>  </Text>
                    <Text style={styles.headerTemp}>Temp</Text>
                    <Text style={styles.headerFreeze}>Congel.</Text>
                    <Text style={styles.headerHumidity}>Hum.</Text>
                    <Text style={styles.headerWind}>Viento</Text>
                  </View>
                  {period.hours.map((hour, hourIndex) => {
                    const hourIcon = getWeatherIcon({
                      hour: hour.time.getHours(),
                      phase: hour.phase,
                      cloudCover: hour.cloudCover,
                      precipitation: hour.precipitation,
                    });
                    
                    return (
                      <View key={hourIndex} style={styles.hourRow}>
                        <Text style={styles.hourTime}>
                          {hour.time.getHours()}:00
                        </Text>
                        <Text style={styles.hourIcon}>{hourIcon}</Text>
                        <Text style={styles.hourTemp}>{Math.round(hour.temperature)}°</Text>
                        <Text style={styles.hourFreeze}>
                          {hour.freezingLevel ? `${Math.round(hour.freezingLevel)}m` : '-'}
                        </Text>
                        <Text style={styles.hourHumidity}>{Math.round(hour.humidity)}%</Text>
                        <Text style={styles.hourWind}>{Math.round(hour.windSpeed)}km/h</Text>
                        {hour.snowfall > 0 && (
                          <Text style={styles.hourSnowBadge}>❄️ {hour.snowfall.toFixed(1)}cm</Text>
                        )}
                        {hour.precipitation > 0 && hour.phase === 'rain' && (
                          <Text style={styles.hourRainBadge}>🌧️ {hour.precipitation.toFixed(1)}mm</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  periodsContainer: {
    maxHeight: 600,
  },
  periodCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f7fafc',
  },
  periodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  periodIcon: {
    fontSize: 24,
  },
  periodHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodTemp: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  periodSnow: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  periodRain: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  periodDetails: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  hourlyBreakdown: {
    marginTop: 8,
  },
  hourlyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  hourlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
    marginBottom: 4,
  },
  headerTime: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    width: 45,
    textTransform: 'uppercase',
  },
  headerIcon: {
    width: 28,
  },
  headerTemp: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    width: 40,
    textTransform: 'uppercase',
  },
  headerFreeze: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    width: 55,
    textTransform: 'uppercase',
  },
  headerHumidity: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    width: 45,
    textTransform: 'uppercase',
  },
  headerWind: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    width: 55,
    textTransform: 'uppercase',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
    flexWrap: 'wrap',
  },
  hourTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3748',
    width: 45,
  },
  hourIcon: {
    fontSize: 18,
    width: 28,
  },
  hourTemp: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3748',
    width: 40,
  },
  hourFreeze: {
    fontSize: 11,
    color: '#3b82f6',
    width: 55,
    fontWeight: '500',
  },
  hourHumidity: {
    fontSize: 11,
    color: '#64748b',
    width: 45,
    fontWeight: '500',
  },
  hourWind: {
    fontSize: 11,
    color: '#64748b',
    width: 55,
    fontWeight: '500',
  },
  hourSnowBadge: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 4,
    width: '100%',
  },
  hourRainBadge: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
    marginTop: 4,
    width: '100%',
  },
});
