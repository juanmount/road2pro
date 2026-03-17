/**
 * Wind Narrative System
 * Generates contextual descriptions of wind conditions based on direction and patterns
 * Inspired by local Patagonian meteorology knowledge (@greenguru.bariloche)
 */

export interface WindNarrative {
  context: string;
  impact: string;
  color: string;
}

/**
 * Ski season periods for Southern Hemisphere (Argentina/Chile)
 */
export type SkiSeason = 'pre-season' | 'early-season' | 'peak-season' | 'late-season' | 'off-season';

/**
 * Detect current ski season based on month
 * @param date Current date
 * @returns Season classification
 */
export function getSkiSeason(date: Date = new Date()): SkiSeason {
  const month = date.getMonth() + 1; // 1-12
  
  // Pre-season: March-May (Autumn - snow building up)
  if (month >= 3 && month <= 5) return 'pre-season';
  
  // Early season: June (Winter start)
  if (month === 6) return 'early-season';
  
  // Peak season: July-August (Mid-winter)
  if (month >= 7 && month <= 8) return 'peak-season';
  
  // Late season: September-October (Spring)
  if (month >= 9 && month <= 10) return 'late-season';
  
  // Off-season: November-February (Summer/Early Autumn)
  return 'off-season';
}

/**
 * Get seasonal context suffix for narratives
 * @param season Current ski season
 * @returns Context string to append
 */
export function getSeasonalContext(season: SkiSeason): string {
  switch (season) {
    case 'pre-season':
      return ' (pre-temporada - acumulando base)';
    case 'early-season':
      return ' (inicio de temporada)';
    case 'peak-season':
      return '';
    case 'late-season':
      return ' (fin de temporada)';
    case 'off-season':
      return ' (fuera de temporada)';
  }
}

/**
 * Get wind narrative based on direction and speed
 * @param direction Wind direction in degrees (0-360)
 * @param speed Wind speed in km/h
 * @param precipitation Current precipitation (mm)
 * @returns Contextual wind narrative
 */
export function getWindNarrative(
  direction: number,
  speed: number,
  precipitation: number = 0
): WindNarrative {
  const dir = ((direction % 360) + 360) % 360;
  const season = getSkiSeason();
  const isPreSeason = season === 'pre-season';
  const isOffSeason = season === 'off-season';
  
  // W/WNW/NW (260-325°) - Pacific moisture, optimal for snow
  if (dir >= 260 && dir <= 325) {
    if (precipitation > 0.5) {
      return {
        context: isPreSeason ? 'Viento del Pacífico activo' : 'Viento del Pacífico activo',
        impact: isPreSeason ? 'Sistema húmedo - acumulando base' : 'Sistema húmedo cruzando los Andes',
        color: '#3b82f6', // blue
      };
    } else if (speed > 30) {
      return {
        context: 'Viento W/NW fuerte',
        impact: isPreSeason ? 'Redistribuyendo nieve en altura' : 'Post-tormenta, redistribuyendo nieve',
        color: '#f59e0b', // amber
      };
    } else {
      return {
        context: 'Viento del oeste',
        impact: isPreSeason ? 'Patrón favorable - construyendo base' : 'Condiciones favorables para nieve',
        color: '#10b981', // green
      };
    }
  }
  
  // WSW to NNW (230-260 or 325-350°) - Good but not optimal
  if ((dir >= 230 && dir < 260) || (dir > 325 && dir <= 350)) {
    if (speed > 40) {
      return {
        context: 'Viento fuerte del oeste',
        impact: 'Barrido intenso, nieve redistribuyéndose',
        color: '#ef4444', // red
      };
    } else {
      return {
        context: 'Viento oeste moderado',
        impact: 'Buenas condiciones generales',
        color: '#10b981', // green
      };
    }
  }
  
  // SW (210-230°) - Post-frontal, drier air
  if (dir >= 210 && dir < 230) {
    return {
      context: 'Viento del suroeste',
      impact: 'Masa de aire más seca, post-frontal',
      color: '#6b7280', // gray
    };
  }
  
  // S to SSW (180-210°) - Cold but dry
  if (dir >= 180 && dir < 210) {
    return {
      context: 'Viento del sur',
      impact: 'Aire frío y seco desde el interior',
      color: '#6b7280', // gray
    };
  }
  
  // E/SE/NE (10-170°) - Blocked, unfavorable
  if ((dir >= 10 && dir < 180)) {
    return {
      context: 'Viento del este',
      impact: 'Sistema bloqueado, baja probabilidad de nieve',
      color: '#ef4444', // red
    };
  }
  
  // N (350-10°) - Variable
  return {
    context: 'Viento del norte',
    impact: 'Condiciones variables',
    color: '#6b7280', // gray
  };
}

/**
 * Get simplified wind direction label
 * @param direction Wind direction in degrees
 * @returns Direction label (N, NE, E, SE, S, SW, W, NW)
 */
export function getWindDirectionLabel(direction: number): string {
  const dir = ((direction % 360) + 360) % 360;
  
  if (dir >= 337.5 || dir < 22.5) return 'N';
  if (dir >= 22.5 && dir < 67.5) return 'NE';
  if (dir >= 67.5 && dir < 112.5) return 'E';
  if (dir >= 112.5 && dir < 157.5) return 'SE';
  if (dir >= 157.5 && dir < 202.5) return 'S';
  if (dir >= 202.5 && dir < 247.5) return 'SW';
  if (dir >= 247.5 && dir < 292.5) return 'W';
  if (dir >= 292.5 && dir < 337.5) return 'NW';
  
  return 'N';
}

/**
 * Get wind arrow rotation for UI display
 * @param direction Wind direction in degrees
 * @returns Rotation angle for arrow pointing in wind direction
 */
export function getWindArrowRotation(direction: number): number {
  // Wind direction is "from" direction, arrow should point "to" direction
  return (direction + 180) % 360;
}

/**
 * Get wind rotation trend from current and future directions
 * @param currentDir Current wind direction in degrees
 * @param futureDir Future wind direction (6-12h ahead) in degrees
 * @returns Trend information
 */
export function getWindTrend(currentDir: number, futureDir: number) {
  const current = ((currentDir % 360) + 360) % 360;
  const future = ((futureDir % 360) + 360) % 360;
  
  // Calculate shortest rotation direction
  let diff = future - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  const currentLabel = getWindDirectionLabel(current);
  const futureLabel = getWindDirectionLabel(future);
  
  // Determine if significant rotation (>15°)
  if (Math.abs(diff) < 15) {
    return {
      rotating: false,
      direction: 'stable',
      currentLabel,
      futureLabel,
      description: 'Estable',
      arrow: '→'
    };
  }
  
  // Clockwise (veering) or counterclockwise (backing)
  const isClockwise = diff > 0;
  
  return {
    rotating: true,
    direction: isClockwise ? 'clockwise' : 'counterclockwise',
    currentLabel,
    futureLabel,
    description: `Rotando hacia ${futureLabel}`,
    arrow: isClockwise ? '↻' : '↺',
    degrees: Math.abs(Math.round(diff))
  };
}

/**
 * Get rotation pattern explanation
 * @param currentDir Current direction
 * @param futureDir Future direction
 * @returns Rotation explanation
 */
function getRotationExplanation(currentDir: number, futureDir: number): string | null {
  const current = ((currentDir % 360) + 360) % 360;
  const future = ((futureDir % 360) + 360) % 360;
  
  // NW → W/SW (most common post-frontal rotation)
  if (current >= 280 && current <= 325 && future >= 230 && future < 280) {
    return '🔄 **Rotación Post-Frontal:** El viento está rotando de NW hacia W/SW, indicando que el sistema frontal está pasando. Esta rotación trae aire más seco y frío desde el sur, típico después de tormentas del Pacífico. Esperá mejora de visibilidad y redistribución de nieve reciente.';
  }
  
  // W → SW (continued post-frontal)
  if (current >= 260 && current < 290 && future >= 210 && future < 260) {
    return '🔄 **Consolidación Post-Frontal:** El viento continúa rotando hacia SW, consolidando la masa de aire seca. Esto confirma que el sistema húmedo ya pasó completamente. Buenas condiciones para ski con nieve existente, pero baja probabilidad de nueva precipitación.';
  }
  
  // SW → S (cold outbreak)
  if (current >= 210 && current < 260 && future >= 170 && future < 210) {
    return '🔄 **Entrada de Aire Polar:** El viento está rotando hacia el sur, trayendo aire muy frío desde el interior de Patagonia. Temperaturas en descenso, cielos despejados, y excelente conservación de nieve. No se esperan nevadas pero las condiciones serán frías y estables.';
  }
  
  // E → NE/N (blocking breaking)
  if (current >= 45 && current < 170 && future >= 350 || future < 45) {
    return '🔄 **Rompimiento de Bloqueo:** El viento está rotando desde el este hacia el norte, indicando que el sistema de alta presión bloqueante se está debilitando. Esto puede preceder la llegada de nuevos sistemas desde el Pacífico en las próximas 24-48 horas.';
  }
  
  // N/NE → NW (new system approaching)
  if ((current >= 350 || current < 45) && future >= 280 && future <= 325) {
    return '🔄 **Nuevo Sistema Aproximándose:** El viento está rotando hacia NW, señal clásica de que un nuevo sistema del Pacífico se está acercando. Aumenta la probabilidad de precipitación en las próximas horas. Monitoreá el pronóstico para posibles nevadas.';
  }
  
  // S → SE/E (unfavorable shift)
  if (current >= 170 && current < 210 && future >= 100 && future < 170) {
    return '🔄 **Cambio Desfavorable:** El viento está rotando hacia el este, indicando desarrollo de un sistema de alta presión bloqueante. Esto reduce significativamente la probabilidad de precipitación. Esperá condiciones estables pero secas.';
  }
  
  return null;
}

/**
 * Get detailed wind explanation for modal/tooltip
 * @param direction Wind direction in degrees
 * @param speed Wind speed in km/h
 * @param futureDirection Optional future direction for rotation analysis
 * @returns Detailed explanation object
 */
export function getWindExplanation(direction: number, speed: number, futureDirection?: number) {
  const dir = ((direction % 360) + 360) % 360;
  const dirLabel = getWindDirectionLabel(direction);
  const season = getSkiSeason();
  const isPreSeason = season === 'pre-season';
  const isOffSeason = season === 'off-season';
  
  // Get rotation explanation if future direction provided
  const rotationExplanation = futureDirection ? getRotationExplanation(direction, futureDirection) : null;
  
  // Add seasonal context header if pre-season or off-season
  const seasonalHeader = isPreSeason 
    ? '📅 **Pre-Temporada (Otoño):** Estamos en marzo-mayo, acumulando nieve base para la apertura de temporada (típicamente junio). Las nevadas actuales construyen la base necesaria para el inicio de la temporada de ski.'
    : isOffSeason 
    ? '📅 **Fuera de Temporada:** La temporada de ski finalizó. Las nevadas actuales no son relevantes para ski hasta la próxima temporada.'
    : null;
  
  // W/WNW/NW (260-325°) - Pacific moisture, optimal for snow
  if (dir >= 260 && dir <= 325) {
    const baseDetails = [
      '🌊 Humedad del Pacífico cruzando los Andes',
      '❄️ Alta probabilidad de precipitación como nieve',
      '🏔️ Sistemas frontales activos',
      speed > 40 ? '💨 Viento fuerte redistribuye la nieve en altura' : '✨ Condiciones favorables para acumulación'
    ];
    
    // Add seasonal context to details
    const detailsWithSeason = seasonalHeader 
      ? [seasonalHeader, '', ...baseDetails]
      : baseDetails;
    
    const finalDetails = rotationExplanation 
      ? [...detailsWithSeason, '', rotationExplanation]
      : detailsWithSeason;
    
    return {
      title: `Viento ${dirLabel} - Óptimo para Nieve`,
      description: 'El viento del oeste/noroeste trae humedad directamente desde el Océano Pacífico. Este es el patrón ideal para nevadas en los Andes patagónicos.',
      details: finalDetails,
      impact: isPreSeason
        ? 'Estas nevadas están construyendo la base de nieve para la temporada. Cada tormenta suma centímetros que permitirán la apertura del centro en junio.'
        : speed > 40 
        ? 'El viento fuerte puede redistribuir la nieve, creando acumulaciones en zonas protegidas y barriendo sectores expuestos.'
        : 'Condiciones ideales para nevadas consistentes y buena acumulación en toda la montaña.'
    };
  }
  
  // WSW to NNW (230-260 or 325-350°) - Good but not optimal
  if ((dir >= 230 && dir < 260) || (dir > 325 && dir <= 350)) {
    const baseDetails = [
      '🌤️ Humedad moderada desde el Pacífico',
      '❄️ Probabilidad de nieve presente',
      speed > 40 ? '💨 Viento fuerte puede afectar visibilidad' : '✅ Condiciones generalmente favorables'
    ];
    
    return {
      title: `Viento ${dirLabel} - Buenas Condiciones`,
      description: 'Viento del oeste con componente sur o norte. Aún trae humedad del Pacífico pero con menor intensidad.',
      details: rotationExplanation ? [...baseDetails, '', rotationExplanation] : baseDetails,
      impact: 'Buenas condiciones para ski, aunque la intensidad de las nevadas puede ser menor que con viento NW puro.'
    };
  }
  
  // SW (210-230°) - Post-frontal, drier air
  if (dir >= 210 && dir < 230) {
    const baseDetails = [
      '🌬️ Masa de aire más seca desde el sur',
      '❄️ Redistribución de nieve reciente',
      '☀️ Mejora de visibilidad típicamente',
      '🧊 Temperaturas más frías'
    ];
    
    return {
      title: `Viento ${dirLabel} - Post-Frontal`,
      description: 'Viento del suroeste indica que un sistema frontal ya pasó. El aire es más seco y frío.',
      details: rotationExplanation ? [...baseDetails, '', rotationExplanation] : baseDetails,
      impact: 'Buenas condiciones para ski después de una nevada. El viento redistribuye la nieve creando "apilamiento" en zonas protegidas.'
    };
  }
  
  // S to SSW (180-210°) - Cold but dry
  if (dir >= 180 && dir < 210) {
    const baseDetails = [
      '🧊 Aire muy frío desde el interior',
      '☀️ Cielos despejados típicamente',
      '❌ Baja probabilidad de precipitación',
      '💎 Buena conservación de nieve existente'
    ];
    
    return {
      title: `Viento ${dirLabel} - Frío y Seco`,
      description: 'Viento del sur trae aire frío desde el interior de Patagonia, pero sin humedad del Pacífico.',
      details: rotationExplanation ? [...baseDetails, '', rotationExplanation] : baseDetails,
      impact: 'Excelente para ski si hay nieve base. Temperaturas frías mantienen la calidad de la nieve pero no se esperan nevadas.'
    };
  }
  
  // E/SE/NE (10-170°) - Blocked, unfavorable
  if ((dir >= 10 && dir < 180)) {
    const baseDetails = [
      '🚫 Sistema bloqueado - sin humedad del Pacífico',
      '☀️ Cielos despejados o parcialmente nublados',
      '❌ Muy baja probabilidad de precipitación',
      '🌡️ Temperaturas pueden ser más cálidas'
    ];
    
    return {
      title: `Viento ${dirLabel} - Sistema Bloqueado`,
      description: 'Viento del este indica un sistema de alta presión bloqueando el flujo del Pacífico. Patrón desfavorable para nieve.',
      details: rotationExplanation ? [...baseDetails, '', rotationExplanation] : baseDetails,
      impact: 'Condiciones estables pero sin nevadas. El viento del este impide que los sistemas húmedos del Pacífico lleguen a la cordillera.'
    };
  }
  
  // N (350-10°) - Variable
  const baseDetails = [
    '🔄 Patrón en transición',
    '🌡️ Puede traer aire más cálido',
    '❓ Condiciones variables'
  ];
  
  return {
    title: `Viento ${dirLabel} - Condiciones Variables`,
    description: 'Viento del norte puede indicar transición entre sistemas o condiciones inestables.',
    details: rotationExplanation ? [...baseDetails, '', rotationExplanation] : baseDetails,
    impact: 'Monitorear evolución. El viento norte puede preceder cambios significativos en el patrón meteorológico.'
  };
}

