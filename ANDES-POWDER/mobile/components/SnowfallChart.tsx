import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SnowfallChartProps {
  hourlyData: Array<{
    time: Date;
    snowfall: number;
    freezingLevel?: number;
  }>;
  baseElevation?: number;
  midElevation?: number;
  summitElevation?: number;
}

export function SnowfallChart({ hourlyData, baseElevation = 1600, midElevation = 2200, summitElevation = 2800 }: SnowfallChartProps) {
  // Group by day for weekly view with elevation zones
  const dailyData: Array<{ 
    day: string; 
    date: string; 
    snowfall: number;
    avgFreezingLevel: number;
    summitSnow: number;
    midSnow: number;
    baseSnow: number;
    summitIsSnow: boolean;
    midIsSnow: boolean;
    baseIsSnow: boolean;
  }> = [];
  
  for (let i = 0; i < Math.min(168, hourlyData.length); i += 24) {
    const dayData = hourlyData.slice(i, i + 24);
    const totalSnowfall = dayData.reduce((sum, h) => sum + (h.snowfall || 0), 0);
    const avgFreezingLevel = dayData.reduce((sum, h) => sum + (h.freezingLevel || 0), 0) / dayData.length;
    const date = dayData[0]?.time;
    
    if (date) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Calculate snow/rain at different elevations based on freezing level
      // If freezing level is ABOVE elevation -> it's RAIN (not snow)
      // If freezing level is BELOW elevation -> it's SNOW
      const summitIsSnow = avgFreezingLevel < summitElevation;
      const midIsSnow = avgFreezingLevel < midElevation;
      const baseIsSnow = avgFreezingLevel < baseElevation;
      
      const summitSnow = summitIsSnow ? totalSnowfall * 1.3 : 0;
      const midSnow = midIsSnow ? totalSnowfall : 0;
      const baseSnow = baseIsSnow ? totalSnowfall * 0.5 : 0;
      
      const summitRain = !summitIsSnow ? totalSnowfall : 0;
      const midRain = !midIsSnow ? totalSnowfall * 0.7 : 0;
      const baseRain = !baseIsSnow ? totalSnowfall * 0.3 : 0;
      
      dailyData.push({ 
        day: dayName, 
        date: dateStr, 
        snowfall: totalSnowfall,
        avgFreezingLevel: Math.round(avgFreezingLevel),
        summitSnow,
        midSnow,
        baseSnow,
        summitIsSnow,
        midIsSnow,
        baseIsSnow
      });
    }
  }
  
  const actualMaxSnowfall = Math.max(...dailyData.map(d => d.summitSnow || 0), 1);
  
  // Use a better scale that can handle large snowfalls (up to 100cm+)
  // Round up to nearest 25cm increment for cleaner scale
  const maxSnowfall = Math.max(
    Math.ceil(actualMaxSnowfall / 25) * 25,
    25 // Minimum scale of 25cm
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nevadas por Elevación (7 Días)</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Summit ({summitElevation}m)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#60a5fa' }]} />
            <Text style={styles.legendText}>Mid ({midElevation}m)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#93c5fd' }]} />
            <Text style={styles.legendText}>Base ({baseElevation}m)</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{maxSnowfall}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxSnowfall * 0.5)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
        <View style={styles.chartWithGrid}>
          <View style={styles.gridLine} />
          <View style={[styles.gridLine, { bottom: '50%' }]} />
          <View style={[styles.gridLine, { bottom: 0 }]} />
          <View style={styles.barsContainer}>
        {dailyData.map((d, i) => {
          const summitHeight = maxSnowfall > 0 ? (d.summitSnow / maxSnowfall) * 100 : 0;
          const midHeight = maxSnowfall > 0 ? (d.midSnow / maxSnowfall) * 100 : 0;
          const baseHeight = maxSnowfall > 0 ? (d.baseSnow / maxSnowfall) * 100 : 0;
          
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View style={styles.stackedBars}>
                  <View style={styles.barWithLabel}>
                    <View style={[
                      styles.barSegment, 
                      d.summitIsSnow ? styles.summitBar : styles.rainBar, 
                      { height: `${Math.max(summitHeight, 3)}%` }
                    ]} />
                  </View>
                  <View style={styles.barWithLabel}>
                    <View style={[
                      styles.barSegment, 
                      d.midIsSnow ? styles.midBar : styles.rainBar, 
                      { height: `${Math.max(midHeight, 3)}%` }
                    ]} />
                  </View>
                  <View style={styles.barWithLabel}>
                    <View style={[
                      styles.barSegment, 
                      d.baseIsSnow ? styles.baseBar : styles.rainBar, 
                      { height: `${Math.max(baseHeight, 3)}%` }
                    ]} />
                  </View>
                </View>
              </View>
              <View style={styles.barLabels}>
                <Text style={styles.barDay}>{d.day}</Text>
                <Text style={styles.barLabel}>{d.date}</Text>
              </View>
            </View>
          );
        })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#bae6fd',
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0f2fe',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#0c4a6e',
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  yAxis: {
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 12,
    minWidth: 45,
  },
  yAxisLabel: {
    fontSize: 16,
    color: '#0c4a6e',
    fontWeight: '900',
    letterSpacing: 0.3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  chartWithGrid: {
    flex: 1,
    position: 'relative',
    height: 200,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#e0f2fe',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 2,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 1,
    gap: 8,
  },
  barLabels: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    minWidth: 50,
  },
  barWithLabel: {
    position: 'relative',
    width: '28%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barValueInside: {
    position: 'absolute',
    top: 3,
    fontSize: 9,
    fontWeight: '800',
    color: '#1f2937',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stackedBars: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  barSegment: {
    width: '32%',
    borderRadius: 6,
    minHeight: 6,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  summitBar: {
    backgroundColor: '#2563eb',
  },
  midBar: {
    backgroundColor: '#3b82f6',
  },
  baseBar: {
    backgroundColor: '#60a5fa',
  },
  rainBar: {
    backgroundColor: '#94a3b8',
  },
  barDay: {
    fontSize: 13,
    color: '#0c4a6e',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  barLabel: {
    fontSize: 10,
    color: '#0369a1',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
