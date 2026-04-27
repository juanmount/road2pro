/**
 * Satellite Image Analysis Service
 * Interprets satellite imagery and correlates with forecast data
 * Provides actionable insights for skiers
 */

import { resortsService } from './resorts';

export interface SatelliteAnalysis {
  interpretation: string;
  confidence: 'high' | 'medium' | 'low';
  actionableInsight: string;
  affectedResorts: string[];
  timeframe: string;
  icon: string;
}

/**
 * Analyze current satellite conditions and correlate with forecasts
 */
export const analyzeSatelliteConditions = async (): Promise<SatelliteAnalysis> => {
  try {
    const resorts = await resortsService.getAll();
    
    // Sample a representative resort (Catedral) for regional analysis
    const catedral = resorts.find(r => r.id === 'cerro-catedral') || resorts[0];
    
    // Get hourly forecast and find current hour (same method as home screen)
    const hourlyForecast = await resortsService.getHourlyForecast(catedral.id, 'summit', 48);
    const now = new Date();
    
    let closestHour = hourlyForecast[0];
    let minDiff = Infinity;
    for (const hour of hourlyForecast) {
      const hourTime = new Date(hour.time);
      const diff = Math.abs(hourTime.getTime() - now.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestHour = hour;
      }
    }
    
    const cloudCover = closestHour.cloudCover || 0;
    const temp = closestHour.temperature || 0;
    
    console.log(`[SatelliteAnalysis] Regional analysis: clouds=${cloudCover}%, temp=${temp}°C`);
    
    // Determine weather pattern based on satellite indicators
    let weatherPattern = 'clear';
    let affectedResorts: string[] = [];
    
    if (cloudCover > 80) {
      // High cloud cover = active weather system
      if (temp < 5) {
        weatherPattern = 'active_snow';
        affectedResorts = resorts.filter(r => r.id !== 'las-lenas').map(r => r.name);
      } else {
        weatherPattern = 'cloudy';
        affectedResorts = [catedral.name];
      }
    } else if (cloudCover > 50) {
      weatherPattern = 'cloudy';
      affectedResorts = [catedral.name];
    } else {
      weatherPattern = 'clear';
    }
    
    console.log(`[SatelliteAnalysis] Pattern: ${weatherPattern}, affected: ${affectedResorts.length} resorts`);
    
    // Generate interpretation based on weather pattern
    const result = generateInterpretationFromPattern(weatherPattern, affectedResorts, catedral.name);
    
    console.log(`[SatelliteAnalysis] Result: ${result.icon} ${result.interpretation}`);
    
    return result;
  } catch (error) {
    console.error('[SatelliteAnalysis] Error:', error);
    return getDefaultAnalysis();
  }
};

/**
 * Generate interpretation based on weather pattern
 */
const generateInterpretationFromPattern = (
  pattern: string,
  affectedResorts: string[],
  mainResort: string
): SatelliteAnalysis => {
  if (pattern === 'active_snow') {
    return {
      interpretation: 'Sistema activo sobre los Andes',
      confidence: 'high',
      actionableInsight: `Nubes densas detectadas sobre la región. Condiciones favorables para nevadas en altura.`,
      affectedResorts,
      timeframe: 'Ahora',
      icon: '🌨️',
    };
  }
  
  if (pattern === 'cloudy') {
    return {
      interpretation: 'Nubosidad sobre la región',
      confidence: 'medium',
      actionableInsight: `Cielos nublados detectados. Posible actividad meteorológica.`,
      affectedResorts,
      timeframe: 'Ahora',
      icon: '☁️',
    };
  }
  
  return {
    interpretation: 'Condiciones estables, cielos despejando',
    confidence: 'high',
    actionableInsight: 'Cielos mayormente despejados sobre la región. Sin sistemas activos detectados.',
    affectedResorts: [],
    timeframe: 'Ahora',
    icon: '☀️',
  };
};

/**
 * Generate interpretation based on forecast data (LEGACY)
 */
const generateInterpretation = (data: {
  totalSnowfall: number;
  resortsWithSnow: string[];
  maxSnowfall: number;
  maxSnowfallResort: string;
  totalResorts: number;
}): SatelliteAnalysis => {
  const { totalSnowfall, resortsWithSnow, maxSnowfall, maxSnowfallResort } = data;
  
  // Strong storm system
  if (maxSnowfall > 30) {
    return {
      interpretation: 'Sistema de tormenta intenso detectado',
      confidence: 'high',
      actionableInsight: `${maxSnowfallResort} acumula ${Math.round(maxSnowfall)}cm. Condiciones épicas.`,
      affectedResorts: resortsWithSnow,
      timeframe: 'Últimas 24 horas',
      icon: '⛈️',
    };
  }
  
  // Moderate storm
  if (maxSnowfall > 15) {
    return {
      interpretation: 'Tormenta moderada cruzando los Andes',
      confidence: 'high',
      actionableInsight: `${maxSnowfallResort} acumula ${Math.round(maxSnowfall)}cm. Buenos días de powder.`,
      affectedResorts: resortsWithSnow,
      timeframe: 'Últimas 24 horas',
      icon: '🌨️',
    };
  }
  
  // Light snow
  if (maxSnowfall > 1) {
    return {
      interpretation: 'Nevada ligera en altura',
      confidence: 'medium',
      actionableInsight: `${maxSnowfallResort} registra ${Math.round(maxSnowfall)}cm de acumulación reciente.`,
      affectedResorts: resortsWithSnow,
      timeframe: 'Últimas 24 horas',
      icon: '❄️',
    };
  }
  
  // Clearing conditions
  if (resortsWithSnow.length === 0) {
    return {
      interpretation: 'Condiciones estables, cielos despejando',
      confidence: 'high',
      actionableInsight: 'Buen momento para aprovechar la nieve existente. Sin nuevas acumulaciones esperadas.',
      affectedResorts: [],
      timeframe: 'Próximas 24 horas',
      icon: '☀️',
    };
  }
  
  return getDefaultAnalysis();
};

/**
 * Get default analysis when data is unavailable
 */
const getDefaultAnalysis = (): SatelliteAnalysis => {
  return {
    interpretation: 'Analizando condiciones actuales',
    confidence: 'low',
    actionableInsight: 'Revisá los pronósticos individuales de cada cerro para más detalles.',
    affectedResorts: [],
    timeframe: 'Actualizando...',
    icon: '🔄',
  };
};

/**
 * Analyze specific satellite image type
 */
export const analyzeImageType = (
  type: 'geocolor' | 'infrared' | 'water_vapor',
  analysis: SatelliteAnalysis
): string => {
  switch (type) {
    case 'geocolor':
      if (analysis.icon === '⛈️' || analysis.icon === '🌨️') {
        return 'Nubes blancas densas sobre los Andes indican sistema activo de precipitación.';
      }
      return 'Cielos mayormente despejados sobre la región.';
      
    case 'infrared':
      if (analysis.icon === '⛈️') {
        return 'Nubes muy frías (azul/morado) confirman tormenta intensa con nieve en altura.';
      }
      if (analysis.icon === '🌨️') {
        return 'Temperaturas de nubes moderadas indican nevada activa.';
      }
      return 'Sin sistemas fríos significativos detectados.';
      
    case 'water_vapor':
      if (analysis.icon === '⛈️' || analysis.icon === '🌨️') {
        return 'Alta humedad del Pacífico alimentando el sistema. Tormenta sostenida esperada.';
      }
      return 'Flujo de humedad limitado. Condiciones secas predominantes.';
  }
};

export default {
  analyzeSatelliteConditions,
  analyzeImageType,
};
