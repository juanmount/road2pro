import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HourlyForecast {
  time: Date | string;
  temperature: number;
  phase?: string;
  snowfall?: number;
  windSpeed?: number;
  visibility?: number;
}

interface SkiCoachProps {
  hourlyData: HourlyForecast[];
  elevation: 'base' | 'mid' | 'summit';
  baseElevation: number;
  midElevation: number;
  summitElevation: number;
}

interface Recommendation {
  icon: string;
  title: string;
  description: string;
  time?: string;
}

export const SkiCoach: React.FC<SkiCoachProps> = ({ 
  hourlyData, 
  elevation,
  baseElevation,
  midElevation,
  summitElevation
}) => {
  const analyzeConditions = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    
    if (!hourlyData || hourlyData.length === 0) {
      return [{
        icon: '🤷',
        title: 'Sin datos suficientes',
        description: 'No hay pronóstico disponible para analizar.'
      }];
    }

    // Analizar horas de 8am a 5pm
    const skiHours = hourlyData.filter(h => {
      const hour = new Date(h.time).getHours();
      return hour >= 8 && hour <= 17;
    }).slice(0, 10);

    if (skiHours.length === 0) return recommendations;

    // 1. MEJOR HORARIO PARA EMPEZAR
    const morningHours = skiHours.filter(h => new Date(h.time).getHours() <= 11);
    const avgMorningTemp = morningHours.reduce((sum, h) => sum + h.temperature, 0) / morningHours.length;
    const avgMorningSnow = morningHours.reduce((sum, h) => sum + (h.snowfall || 0), 0) / morningHours.length;
    const avgMorningWind = morningHours.reduce((sum, h) => sum + (h.windSpeed || 0), 0) / morningHours.length;

    let bestStartTime = '9:00 AM';
    let startReason = 'condiciones óptimas de temperatura';

    if (avgMorningSnow > 2) {
      bestStartTime = '8:00 AM';
      startReason = 'nieve fresca temprano, antes que se compacte';
    } else if (avgMorningTemp < -5) {
      bestStartTime = '10:00 AM';
      startReason = 'esperar a que suba la temperatura';
    } else if (avgMorningWind > 40) {
      bestStartTime = '10:30 AM';
      startReason = 'viento fuerte temprano, mejor esperar';
    }

    recommendations.push({
      icon: '⏰',
      title: 'Mejor hora para empezar',
      description: `Arranca a las ${bestStartTime} - ${startReason}.`,
      time: bestStartTime
    });

    // 2. ZONA DE LA MONTAÑA RECOMENDADA
    const totalSnowfall = skiHours.reduce((sum, h) => sum + (h.snowfall || 0), 0);
    const avgTemp = skiHours.reduce((sum, h) => sum + h.temperature, 0) / skiHours.length;
    const maxWind = Math.max(...skiHours.map(h => h.windSpeed || 0));

    let recommendedArea = '';
    let areaReason = '';

    if (totalSnowfall > 10) {
      recommendedArea = 'SUMMIT';
      areaReason = `Mucha nieve fresca (${Math.round(totalSnowfall)}cm) - mejor powder arriba`;
    } else if (maxWind > 50) {
      recommendedArea = 'BASE';
      areaReason = `Viento fuerte (${Math.round(maxWind)}km/h) - zonas bajas más protegidas`;
    } else if (avgTemp > 5) {
      recommendedArea = 'SUMMIT';
      areaReason = 'Temperatura alta - nieve mejor conservada en altura';
    } else if (avgTemp < -8) {
      recommendedArea = 'BASE/MID';
      areaReason = 'Muy frío - zonas medias/bajas más cómodas';
    } else {
      recommendedArea = 'MID/SUMMIT';
      areaReason = 'Condiciones balanceadas - aprovecha toda la montaña';
    }

    recommendations.push({
      icon: '🏔️',
      title: 'Zona recomendada',
      description: `${recommendedArea}: ${areaReason}.`
    });

    // 3. ESTRATEGIA DEL DÍA
    const afternoonHours = skiHours.filter(h => new Date(h.time).getHours() >= 13);
    const afternoonSnow = afternoonHours.reduce((sum, h) => sum + (h.snowfall || 0), 0);
    const afternoonTemp = afternoonHours.reduce((sum, h) => sum + h.temperature, 0) / afternoonHours.length;

    let strategy = '';
    
    if (totalSnowfall > 15) {
      strategy = 'Día de powder! Prioriza pistas sin pisar y fuera de pista si tienes experiencia.';
    } else if (afternoonTemp - avgMorningTemp > 5) {
      strategy = 'Temperatura sube en la tarde. Esquía las pistas orientadas al sur temprano, luego norte.';
    } else if (afternoonSnow > morningHours.reduce((sum, h) => sum + (h.snowfall || 0), 0)) {
      strategy = 'Nieve aumenta en la tarde. Guarda energía para las últimas bajadas.';
    } else if (maxWind > 40) {
      strategy = 'Día ventoso. Mantente en zonas protegidas y evita crestas expuestas.';
    } else {
      strategy = 'Condiciones estables. Aprovecha todo el día, ritmo constante.';
    }

    recommendations.push({
      icon: '🎯',
      title: 'Estrategia del día',
      description: strategy
    });

    // 4. ALERTAS Y PRECAUCIONES
    const warnings: string[] = [];
    
    if (maxWind > 60) {
      warnings.push('⚠️ Viento extremo - algunos medios pueden cerrar');
    }
    if (avgTemp < -10) {
      warnings.push('🥶 Mucho frío - lleva capas extra y protege la piel');
    }
    if (totalSnowfall > 20) {
      warnings.push('❄️ Nevada intensa - visibilidad reducida, precaución');
    }
    if (skiHours.some(h => h.phase === 'rain')) {
      warnings.push('🌧️ Posible lluvia - revisa pronóstico actualizado');
    }

    if (warnings.length > 0) {
      recommendations.push({
        icon: '⚠️',
        title: 'Precauciones',
        description: warnings.join(' • ')
      });
    } else {
      recommendations.push({
        icon: '✅',
        title: 'Condiciones favorables',
        description: 'No hay alertas especiales. ¡Disfruta tu día en la montaña!'
      });
    }

    return recommendations;
  };

  const recommendations = analyzeConditions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎿</Text>
        <Text style={styles.headerTitle}>Coach IA</Text>
      </View>
      <Text style={styles.subtitle}>Análisis y recomendaciones para tu día</Text>
      
      <View style={styles.recommendations}>
        {recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <View style={styles.recHeader}>
              <Text style={styles.recIcon}>{rec.icon}</Text>
              <Text style={styles.recTitle}>{rec.title}</Text>
            </View>
            <Text style={styles.recDescription}>{rec.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  recommendations: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  recDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
});
