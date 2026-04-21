import axios from 'axios';

export type ENSOPhase = 'strong_nino' | 'moderate_nino' | 'weak_nino' | 'neutral' | 'weak_nina' | 'moderate_nina' | 'strong_nina';

export interface ENSOData {
  oni: number;
  phase: ENSOPhase;
  intensity: string;
  seasonOutlook: string;
  consumerMessage: string;
  stormMultiplier: number;
  freezingLevelAdjustment: number;
  lastUpdated: Date;
}

export class ENSOService {
  private static readonly NOAA_ONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt';

  async fetchCurrentONI(): Promise<number> {
    try {
      const response = await axios.get(ENSOService.NOAA_ONI_URL);
      const lines = response.data.split('\n');
      
      // Parse last complete 3-month period
      // Format: YEAR SEASON ONI
      const dataLines = lines.filter((line: string) => line.trim() && !line.startsWith('Year'));
      const lastLine = dataLines[dataLines.length - 1];
      const parts = lastLine.trim().split(/\s+/);
      
      return parseFloat(parts[2]);
    } catch (error) {
      console.error('Error fetching ONI data:', error);
      throw new Error('Failed to fetch ENSO data');
    }
  }

  calculatePhase(oni: number): ENSOPhase {
    if (oni >= 1.5) return 'strong_nino';
    if (oni >= 1.0) return 'moderate_nino';
    if (oni >= 0.5) return 'weak_nino';
    if (oni <= -1.5) return 'strong_nina';
    if (oni <= -1.0) return 'moderate_nina';
    if (oni <= -0.5) return 'weak_nina';
    return 'neutral';
  }

  getConsumerMessage(phase: ENSOPhase): string {
    const messages = {
      strong_nino: 'Temporada excepcional esperada - Muchas tormentas del Pacífico',
      moderate_nino: 'Temporada muy activa - Más tormentas que lo normal',
      weak_nino: 'Temporada activa - Ligeramente más tormentas',
      neutral: 'Temporada normal - Patrón estándar de nevadas',
      weak_nina: 'Temporada tranquila - Menos tormentas que lo normal',
      moderate_nina: 'Temporada seca - Pocas tormentas del Pacífico',
      strong_nina: 'Temporada muy seca - Escasas nevadas esperadas'
    };
    return messages[phase];
  }

  getIntensityLabel(phase: ENSOPhase): string {
    if (phase.includes('strong')) return 'Fuerte';
    if (phase.includes('moderate')) return 'Moderado';
    if (phase.includes('weak')) return 'Débil';
    return 'Neutral';
  }

  getStormMultiplier(phase: ENSOPhase): number {
    const multipliers = {
      strong_nino: 1.5,
      moderate_nino: 1.3,
      weak_nino: 1.1,
      neutral: 1.0,
      weak_nina: 0.85,
      moderate_nina: 0.7,
      strong_nina: 0.6
    };
    return multipliers[phase];
  }

  getFreezingLevelAdjustment(phase: ENSOPhase): number {
    const adjustments = {
      strong_nino: 300,
      moderate_nino: 200,
      weak_nino: 100,
      neutral: 0,
      weak_nina: -100,
      moderate_nina: -200,
      strong_nina: -300
    };
    return adjustments[phase];
  }

  getSeasonOutlook(phase: ENSOPhase): string {
    if (phase.includes('nino')) {
      return 'Más tormentas pero isoterma más alta. Lluvia en base, nieve pesada en altura.';
    } else if (phase.includes('nina')) {
      return 'Menos tormentas pero isoterma más baja. Mejor calidad de nieve cuando nieva.';
    }
    return 'Condiciones normales para la temporada.';
  }

  async getCurrentENSOData(): Promise<ENSOData> {
    const oni = await this.fetchCurrentONI();
    const phase = this.calculatePhase(oni);
    
    return {
      oni,
      phase,
      intensity: this.getIntensityLabel(phase),
      seasonOutlook: this.getSeasonOutlook(phase),
      consumerMessage: this.getConsumerMessage(phase),
      stormMultiplier: this.getStormMultiplier(phase),
      freezingLevelAdjustment: this.getFreezingLevelAdjustment(phase),
      lastUpdated: new Date()
    };
  }
}
