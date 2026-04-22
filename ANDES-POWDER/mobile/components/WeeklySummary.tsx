import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DayData {
  date: string;
  dayName: string;
  snowfall: number;
  temperature: number;
  windSpeed: number;
  powderScore?: number;
}

interface WeeklySummaryProps {
  days: DayData[];
  elevation: string;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ days, elevation }) => {
  // Calculate total snowfall
  const totalSnowfall = days.reduce((sum, day) => sum + (day.snowfall || 0), 0);
  
  // Find best day to ski (most snow + good conditions)
  const bestDay = days.reduce((best, day, index) => {
    if (index === 0) return { day, index }; // Skip today
    
    const score = (day.snowfall || 0) * 2 - (day.windSpeed || 0) * 0.1;
    const bestScore = (best.day.snowfall || 0) * 2 - (best.day.windSpeed || 0) * 0.1;
    
    return score > bestScore ? { day, index } : best;
  }, { day: days[1] || days[0], index: 1 });
  
  // Get max snowfall for scaling bars
  const maxSnowfall = Math.max(...days.map(d => d.snowfall || 0), 1);
  
  // Determine best day reason
  const getBestDayReason = () => {
    if (bestDay.day.snowfall > 10) return 'Nieve fresca abundante';
    if (bestDay.day.snowfall > 5) return 'Buena nevada';
    if (bestDay.day.windSpeed < 15) return 'Viento calmo';
    return 'Mejores condiciones';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PRÓXIMOS 7 DÍAS</Text>
      </View>

      {/* Total and Chart Combined */}
      <View style={styles.mainSection}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Acumulado</Text>
            <View style={styles.totalValueRow}>
              <Text style={styles.totalValue}>{Math.round(totalSnowfall)}</Text>
              <Text style={styles.totalUnit}>cm</Text>
            </View>
          </View>
          <View style={styles.elevationBadge}>
            <Text style={styles.elevationText}>{elevation.toUpperCase()}</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          {days.map((day, index) => {
            const barHeight = maxSnowfall > 0 ? (day.snowfall / maxSnowfall) * 70 : 0;
            const isBestDay = index === bestDay.index;
            
            return (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  {day.snowfall > 0 && (
                    <Text style={[styles.barValue, isBestDay && styles.barValueBest]}>
                      {Math.round(day.snowfall)}
                    </Text>
                  )}
                  <View 
                    style={[
                      styles.bar, 
                      { height: Math.max(barHeight, 3) },
                      isBestDay && styles.barBest,
                      day.snowfall === 0 && styles.barEmpty
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, isBestDay && styles.barLabelBest]}>
                  {day.dayName.substring(0, 3).toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Best Day - Minimalist */}
        {bestDay.day.snowfall > 0 && (
          <View style={styles.bestDayRow}>
            <View style={styles.bestDayIndicator} />
            <Text style={styles.bestDayText}>
              Mejor día: <Text style={styles.bestDayHighlight}>{bestDay.day.dayName.toUpperCase()}</Text>
            </Text>
            <Text style={styles.bestDayReason}>{getBestDayReason()}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  mainSection: {
    gap: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  elevationBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  elevationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  barValueBest: {
    color: '#0f172a',
  },
  bar: {
    width: 24,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    minHeight: 3,
  },
  barBest: {
    backgroundColor: '#0ea5e9',
  },
  barEmpty: {
    backgroundColor: '#f1f5f9',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  barLabelBest: {
    color: '#0f172a',
    fontWeight: '700',
  },
  bestDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  bestDayIndicator: {
    width: 3,
    height: 20,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
  },
  bestDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  bestDayHighlight: {
    color: '#0f172a',
    fontWeight: '700',
  },
  bestDayReason: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
