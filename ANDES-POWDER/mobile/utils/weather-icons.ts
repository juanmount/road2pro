/**
 * Weather Icon Utilities
 * Returns appropriate weather icons based on time of day and conditions
 */

interface WeatherIconParams {
  hour: number; // 0-23
  phase: string; // 'none', 'snow', 'rain', 'mixed', 'cloudy'
  cloudCover: number; // 0-100
  precipitation: number; // mm
}

export function getWeatherIcon(params: WeatherIconParams): string {
  const { hour, phase, cloudCover, precipitation } = params;
  
  // Determine if it's day or night (sunrise ~6am, sunset ~8pm)
  const isDaytime = hour >= 6 && hour < 20;
  
  // Active precipitation - ALWAYS show weather icons when phase indicates precipitation
  // Phase is calculated based on temperature and precipitation, so trust it
  if (phase === 'snow') {
    return '❄️'; // Snow
  } else if (phase === 'rain') {
    return '🌧️'; // Rain
  } else if (phase === 'mixed') {
    return '🌨️'; // Mixed/Sleet
  }
  
  // No active precipitation - show sun/moon with cloud variations
  if (isDaytime) {
    // Daytime icons
    if (cloudCover < 20) {
      return '☀️'; // Clear/Sunny
    } else if (cloudCover < 50) {
      return '🌤️'; // Partly cloudy
    } else if (cloudCover < 80) {
      return '⛅'; // Mostly cloudy
    } else {
      return '☁️'; // Overcast
    }
  } else {
    // Nighttime icons
    if (cloudCover < 50) {
      return '🌙'; // Clear night - moon alone
    } else {
      return '☁️'; // Cloudy night
    }
  }
}

export function getWeatherDescription(params: WeatherIconParams): string {
  const { hour, phase, cloudCover, precipitation } = params;
  const isDaytime = hour >= 6 && hour < 20;
  
  if (precipitation > 0.1) {
    if (phase === 'snow') return 'Nieve';
    if (phase === 'rain') return 'Lluvia';
    if (phase === 'mixed') return 'Mixto';
  }
  
  const timeOfDay = isDaytime ? 'Día' : 'Noche';
  
  if (cloudCover < 20) return `Despejado (${timeOfDay})`;
  if (cloudCover < 50) return `Parcialmente nublado (${timeOfDay})`;
  if (cloudCover < 80) return `Mayormente nublado (${timeOfDay})`;
  return `Nublado (${timeOfDay})`;
}

// Sunrise/sunset times by month (approximate for Patagonia)
const sunriseSunsetTimes: { [key: number]: { sunrise: number; sunset: number } } = {
  0: { sunrise: 6, sunset: 21 },  // January (summer)
  1: { sunrise: 7, sunset: 20 },  // February
  2: { sunrise: 7, sunset: 19 },  // March
  3: { sunrise: 8, sunset: 18 },  // April
  4: { sunrise: 9, sunset: 17 },  // May
  5: { sunrise: 9, sunset: 17 },  // June (winter)
  6: { sunrise: 9, sunset: 18 },  // July
  7: { sunrise: 8, sunset: 19 },  // August
  8: { sunrise: 7, sunset: 19 },  // September
  9: { sunrise: 7, sunset: 20 },  // October
  10: { sunrise: 6, sunset: 21 }, // November
  11: { sunrise: 6, sunset: 21 }, // December
};

export function isDaytime(date: Date): boolean {
  const month = date.getMonth();
  const hour = date.getHours();
  const { sunrise, sunset } = sunriseSunsetTimes[month];
  
  return hour >= sunrise && hour < sunset;
}

export function getTimeOfDayLabel(date: Date): string {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 12) return 'Mañana';
  if (hour >= 12 && hour < 18) return 'Tarde';
  if (hour >= 18 && hour < 21) return 'Atardecer';
  return 'Noche';
}
