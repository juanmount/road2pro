export function getPowderScoreColor(score: number): string {
  if (score >= 8) return '#48bb78';
  if (score >= 6) return '#63b3ed';
  if (score >= 4) return '#ed8936';
  return '#cbd5e0';
}

export function getPowderScoreLabel(score: number): string {
  if (score >= 9) return 'Epic';
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Fair';
  if (score >= 2) return 'Poor';
  return 'Very Poor';
}

export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

export function formatSnowfall(cm: number): string {
  if (cm === 0) return '0 cm';
  if (cm < 1) return '< 1 cm';
  return `${Math.round(cm)} cm`;
}

export function formatWind(speed: number): string {
  return `${Math.round(speed)} km/h`;
}

export function getFreezeQualityLabel(quality: string | null): string {
  if (!quality) return 'Unknown';
  
  const labels: Record<string, string> = {
    excellent: 'Excellent freeze',
    good: 'Good freeze',
    fair: 'Fair freeze',
    poor: 'Poor freeze',
    none: 'No freeze',
  };
  
  return labels[quality] || quality;
}
