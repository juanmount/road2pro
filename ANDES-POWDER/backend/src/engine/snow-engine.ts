/**
 * Snow Engine Core
 * Converts raw meteorological data into ski-relevant intelligence
 */

import { Resort, ProcessedForecast, NormalizedForecast, ModelAgreement, ElevationForecast } from '../domain/models';
import { ForecastProvider } from '../providers/interfaces';
import { PhaseClassifier } from './phase-classifier';
import { SnowAccumulationCalculator } from './snow-accumulation';
import { ScoreCalculator } from './score-calculator';
import { BestWindowIdentifier } from './best-window';
import { ConfidenceService } from './confidence-service';
import { ResortCorrectionService } from './resort-correction-service';
import { MultiModelFetcher } from '../providers/open-meteo/multi-model-fetcher';
import { StormCrossingEngine } from './storm-crossing-engine';
import { SnowRealityEngine } from './snow-reality-engine';
import { WindImpactEngine } from './wind-impact-engine';
import { observationProvider } from '../services/observation-provider';

export class SnowEngine {
  private phaseClassifier: PhaseClassifier;
  private snowCalculator: SnowAccumulationCalculator;
  private scoreCalculator: ScoreCalculator;
  private windowIdentifier: BestWindowIdentifier;
  private confidenceService: ConfidenceService;
  private correctionService: ResortCorrectionService;
  private multiModelFetcher: MultiModelFetcher;
  private stormCrossingEngine: StormCrossingEngine;
  private snowRealityEngine: SnowRealityEngine;
  private windImpactEngine: WindImpactEngine;
  
  constructor(
    private providers: ForecastProvider[]
  ) {
    this.phaseClassifier = new PhaseClassifier();
    this.snowCalculator = new SnowAccumulationCalculator();
    this.scoreCalculator = new ScoreCalculator();
    this.windowIdentifier = new BestWindowIdentifier();
    this.confidenceService = new ConfidenceService();
    this.correctionService = new ResortCorrectionService();
    this.multiModelFetcher = new MultiModelFetcher();
    this.stormCrossingEngine = new StormCrossingEngine();
    this.snowRealityEngine = new SnowRealityEngine();
    this.windImpactEngine = new WindImpactEngine();
  }
  
  async processResortForecast(resort: Resort): Promise<ProcessedForecast> {
    console.log(`Processing forecast for ${resort.name}...`);
    
    // 0. Get real observed conditions for calibration
    const observed = await observationProvider.getLatestTemperatures(resort.id);
    if (observed) {
      console.log('  ✓ Using real observed temperatures for calibration:');
      if (observed.temperature.base) console.log(`    Base: ${observed.temperature.base.toFixed(1)}°C`);
      if (observed.temperature.mid) console.log(`    Mid: ${observed.temperature.mid.toFixed(1)}°C`);
      if (observed.temperature.summit) console.log(`    Summit: ${observed.temperature.summit.toFixed(1)}°C`);
      
      // Calculate observed freezing level
      const observedFreezingLevel = observationProvider.calculateFreezingLevel(observed, {
        base: resort.baseElevation,
        mid: resort.midElevation,
        summit: resort.summitElevation
      });
      
      if (observedFreezingLevel) {
        console.log(`    Observed freezing level: ${observedFreezingLevel}m`);
      }
    } else {
      console.log('  ⚠ No recent observations available - using forecast data only');
    }
    
    // 1. Fetch all models in parallel (ECMWF, GFS, GEFS)
    console.log('  → Fetching ECMWF, GFS, and GEFS models...');
    const multiModel = await this.multiModelFetcher.fetchAllModels(resort);
    
    if (multiModel.errors.length > 0) {
      console.warn(`  ⚠ Some models failed:`, multiModel.errors);
    }
    
    // 2. Calculate model agreements and confidence scores
    console.log('  → Calculating model agreement and confidence...');
    const modelAgreements = this.calculateModelAgreements(
      resort.id,
      multiModel.ecmwf,
      multiModel.gfs,
      multiModel.gefs
    );
    
    // 3. Hybrid model approach: Use ECMWF for precision, fill gaps with GFS/GEFS
    console.log('  → Building hybrid forecast (ECMWF + GFS/GEFS)...');
    const primaryForecast = this.buildHybridForecast(multiModel);
    
    if (!primaryForecast) {
      throw new Error('No forecast data available from any model');
    }
    
    console.log(`  → Hybrid forecast built: ${primaryForecast.mid.length} hours`);
    
    console.log('  → Processing forecast data...');
    
    // 4. Process elevation forecasts with phase classification and corrections
    console.log('  → Applying phase classification and corrections...');
    const elevationForecasts = await this.processElevationForecasts(
      resort,
      primaryForecast,
      modelAgreements
    );
    
    // 5. Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(modelAgreements);
    
    // 6. Calculate accumulation totals
    const totals = this.calculateAccumulationTotals(elevationForecasts.mid);
    
    // 7. Compute storm crossing probabilities (with Chilean data)
    console.log('  → Computing storm crossing probabilities...');
    const stormCrossingProbabilities = await this.stormCrossingEngine.computeBatchCrossingProbabilities(
      resort,
      multiModel.ecmwf,
      multiModel.gfs,
      multiModel.gefs,
      modelAgreements
    );
    
    // 7. Compute Snow Reality adjustments
    console.log('  → Computing snow reality adjustments...');
    const snowRealityForecasts = this.computeSnowReality(
      elevationForecasts,
      resort
    );
    
    // 8. Compute Wind Impact analysis
    console.log('  → Computing wind impact analysis...');
    const windImpactForecasts = this.computeWindImpact(
      elevationForecasts,
      resort
    );
    
    // 9. Build processed forecast
    const processed: ProcessedForecast = {
      resort,
      issuedAt: primaryForecast.issuedAt,
      base: elevationForecasts.base,
      mid: elevationForecasts.mid,
      summit: elevationForecasts.summit,
      totalSnow24h: totals.snow24h,
      totalSnow72h: totals.snow72h,
      totalSnow7d: totals.snow7d,
      overallConfidence,
      modelAgreement: modelAgreements,
      stormCrossingProbabilities,
      snowRealityForecasts,
      windImpactForecasts
    };
    
    console.log(`  ✓ Forecast processed (confidence: ${overallConfidence.toFixed(1)}/10, 24h snow: ${totals.snow24h.toFixed(1)}cm)`);
    if (stormCrossingProbabilities.length > 0) {
      const nextCrossing = stormCrossingProbabilities[0];
      console.log(`  ✓ Storm crossing: ${nextCrossing.category} (${nextCrossing.score}/100)`);
    }
    if (snowRealityForecasts && snowRealityForecasts.length > 0) {
      console.log(`  ✓ Snow reality: ${snowRealityForecasts.length} forecasts computed`);
    }
    if (windImpactForecasts && windImpactForecasts.length > 0) {
      const extremeWinds = windImpactForecasts.filter(w => w.analysis.category === 'EXTREME' || w.analysis.category === 'STRONG');
      if (extremeWinds.length > 0) {
        console.log(`  ⚠️  Wind alerts: ${extremeWinds.length} periods with strong/extreme winds`);
      }
      console.log(`  ✓ Wind impact: ${windImpactForecasts.length} forecasts computed`);
    }
    
    return processed;
  }
  
  /**
   * Calculate model agreements for all time points
   */
  private calculateModelAgreements(
    resortId: string,
    ecmwf: NormalizedForecast | undefined,
    gfs: NormalizedForecast | undefined,
    gefs: NormalizedForecast | undefined
  ): ModelAgreement[] {
    const agreements: ModelAgreement[] = [];
    
    // Only calculate if we have at least ECMWF or GFS
    if (!ecmwf && !gfs) return agreements;
    
    const primaryModel = ecmwf || gfs!;
    const timePoints = primaryModel.mid.length;
    
    // Sample every 6 hours to avoid too many records (0, 6, 12, 18, 24...)
    for (let i = 0; i < Math.min(timePoints, 120); i += 6) {
      const validTime = primaryModel.mid[i].time;
      
      // Calculate for mid elevation (most representative)
      const agreement = this.confidenceService.createModelAgreement(
        resortId,
        validTime,
        'mid',
        ecmwf,
        gfs,
        gefs,
        i
      );
      
      agreements.push(agreement);
    }
    
    return agreements;
  }
  
  /**
   * Calculate overall confidence from model agreements
   */
  private calculateOverallConfidence(agreements: ModelAgreement[]): number {
    if (agreements.length === 0) return 5;
    
    // Average confidence over next 72 hours (first 12 samples at 6h intervals)
    const next72h = agreements.slice(0, 12);
    const avgConfidence = next72h.reduce((sum, a) => sum + a.confidenceScore, 0) / next72h.length;
    
    return avgConfidence;
  }
  
  /**
   * Process elevation forecasts with phase classification and corrections
   */
  private async processElevationForecasts(
    resort: Resort,
    forecast: NormalizedForecast,
    modelAgreements: ModelAgreement[]
  ): Promise<{
    base: ElevationForecast[];
    mid: ElevationForecast[];
    summit: ElevationForecast[];
  }> {
    const base: ElevationForecast[] = [];
    const mid: ElevationForecast[] = [];
    const summit: ElevationForecast[] = [];
    
    // Process each elevation band - up to 168 hours (7 days)
    const hoursToProcess = Math.min(forecast.base.length, 168);
    console.log(`  Processing ${hoursToProcess} hours of forecast data...`);
    
    for (let i = 0; i < hoursToProcess; i++) {
      // Base elevation
      const basePoint = await this.processTimePoint(
        resort,
        'base',
        resort.baseElevation,
        forecast.base[i],
        i,
        modelAgreements
      );
      base.push(basePoint);
      
      // Mid elevation
      const midPoint = await this.processTimePoint(
        resort,
        'mid',
        resort.midElevation,
        forecast.mid[i],
        i,
        modelAgreements
      );
      mid.push(midPoint);
      
      // Summit elevation
      const summitPoint = await this.processTimePoint(
        resort,
        'summit',
        resort.summitElevation,
        forecast.summit[i],
        i,
        modelAgreements
      );
      summit.push(summitPoint);
    }
    
    return { base, mid, summit };
  }
  
  /**
   * Process a single time point with full snow intelligence
   */
  private async processTimePoint(
    resort: Resort,
    elevationBand: 'base' | 'mid' | 'summit',
    elevationMeters: number,
    data: any,
    forecastHour: number,
    modelAgreements: ModelAgreement[]
  ): Promise<ElevationForecast> {
    // Debug logging
    if (forecastHour % 12 === 0) {
      console.log(`  [${elevationBand}] Hour ${forecastHour}: temp=${data.temperature.toFixed(1)}°C, precip=${data.precipitation.toFixed(2)}mm, windDir=${data.windDirection || 'null'}, time=${data.time.toISOString()}, freezing=${data.freezingLevel || 'null'}`);
    }
    
    // 1. Classify precipitation phase using wet bulb temperature
    const freezingLevel = data.freezingLevel || this.estimateFreezingLevel(data.temperature);
    const humidity = data.humidity || 70; // Default to 70% if not available
    const phase = this.phaseClassifier.classifyPrecipitation(
      data.temperature,
      freezingLevel,
      elevationMeters,
      data.precipitation,
      humidity
    );
    
    // Debug phase classification
    if (forecastHour === 0) {
      console.log(`  Phase classification: precip=${data.precipitation}mm -> phase=${phase.phase}`);
    }
    
    // 2. Calculate raw snowfall
    const rawSnowfall = this.snowCalculator.calculateSnowfall(
      data.precipitation,
      phase.snowRatio,
      data.temperature
    );
    
    // 3. Estimate snow line
    const snowLine = this.phaseClassifier.estimateSnowLine(
      freezingLevel,
      data.temperature,
      data.humidity
    );
    
    // 4. Calculate initial powder score
    const rawPowderScore = this.scoreCalculator.calculatePowderScore(
      rawSnowfall,
      data.temperature,
      data.windSpeed,
      'none' // Freeze quality TBD
    );
    
    // 5. Apply resort-specific corrections
    const corrected = await this.correctionService.applyAllCorrections(
      resort,
      elevationBand,
      {
        precipitation: data.precipitation,
        snowfall: rawSnowfall,
        temperature: data.temperature,
        windSpeed: data.windSpeed,
        freezingLevel,
        snowLine,
        powderScore: rawPowderScore
      }
    );
    
    // 6. Determine wind impact
    const windImpact = this.scoreCalculator.determineWindImpact(
      corrected.windSpeedCorrected,
      data.windGust || corrected.windSpeedCorrected * 1.3
    );
    
    // 7. Calculate skiability score
    const skiabilityScore = this.scoreCalculator.calculateSkiabilityScore(
      corrected.powderScoreCorrected,
      windImpact,
      10000 // Default visibility
    );
    
    // 8. Classify snow quality
    const snowQuality = this.scoreCalculator.classifySnowQuality(
      data.temperature,
      corrected.windSpeedCorrected,
      corrected.snowfallCorrected
    );
    
    // 9. Get confidence for this time point
    const confidence = modelAgreements.find(
      a => Math.abs(a.validTime.getTime() - data.time.getTime()) < 3600000 // Within 1 hour
    )?.confidenceScore;
    
    return {
      id: '',
      forecastRunId: '',
      resortId: resort.id,
      elevationBand,
      elevationMeters,
      validTime: data.time,
      forecastHour,
      temperatureC: data.temperature,
      apparentTempC: data.temperature, // TODO: Calculate wind chill
      precipitationMm: corrected.precipitationCorrected,
      snowfallCmRaw: rawSnowfall,
      windSpeedKmh: corrected.windSpeedCorrected,
      windGustKmh: data.windGust,
      windDirection: data.windDirection,
      humidity: data.humidity,
      cloudCover: data.cloudCover,
      pressure: data.pressure,
      freezingLevelM: corrected.freezingLevelCorrected,
      snowLineM: corrected.snowLineCorrected,
      snowfallCmCorrected: corrected.snowfallCorrected,
      phaseClassification: phase.phase, // Use phase directly, not classifyPhase
      snowQuality,
      powderScore: corrected.powderScoreCorrected,
      skiabilityScore,
      windImpact,
      confidenceScore: confidence,
      dataSource: 'ecmwf-ifs',
      createdAt: new Date()
    };
  }
  
  /**
   * Build hybrid forecast: ECMWF for early days (most precise), GFS/GEFS to fill remaining days
   */
  private buildHybridForecast(multiModel: any): NormalizedForecast | null {
    const ecmwf = multiModel.ecmwf;
    const gfs = multiModel.gfs;
    const gefs = multiModel.gefs;
    
    // If no models available, return null
    if (!ecmwf && !gfs && !gefs) {
      return null;
    }
    
    // If only one model available, use it
    if (!ecmwf && !gfs) return gefs;
    if (!ecmwf && !gefs) return gfs;
    if (!gfs && !gefs) return ecmwf;
    
    // PRIORITY: Use GFS as primary for Patagonia (more accurate for this region)
    // ECMWF has issues with freezing level (returns null) and temperature accuracy
    const primary = gfs || ecmwf;  // Prefer GFS for Patagonia
    const secondary = ecmwf || gefs;  // Fallback for additional hours
    
    // If GFS not available, fall back to ECMWF or GEFS
    if (!primary) {
      console.log('    ⚠ GFS not available, using ECMWF/GEFS as primary');
      return ecmwf || gefs || null;
    }
    
    console.log('    → Using GFS as primary source (most accurate for Patagonia)');
    
    // Hybrid approach: Start with ECMWF metadata
    const hybrid: NormalizedForecast = {
      provider: primary.provider,
      model: primary.model,
      issuedAt: primary.issuedAt,
      base: [],
      mid: [],
      summit: [],
      freezingLevels: primary.freezingLevels || [],
      metadata: primary.metadata
    };
    
    // For each elevation band
    for (const elevation of ['base', 'mid', 'summit'] as const) {
      const primaryData = primary[elevation] || [];
      const secondaryData = secondary?.[elevation] || [];
      
      // Start with ECMWF data (most accurate)
      hybrid[elevation] = [...primaryData];
      
      // Only fill with GFS/GEFS if ECMWF has less than 168 hours
      if (hybrid[elevation].length < 168 && secondary && secondaryData.length > 0) {
        const lastPrimaryTime = primaryData.length > 0 
          ? new Date(primaryData[primaryData.length - 1].time).getTime()
          : 0;
        
        // Add GFS/GEFS data ONLY for hours after ECMWF ends
        const additionalData = secondaryData.filter((item: any) => {
          const itemTime = new Date(item.time).getTime();
          return itemTime > lastPrimaryTime;
        });
        
        const hoursToAdd = Math.min(additionalData.length, 168 - hybrid[elevation].length);
        
        // Merge and limit to 168 hours
        hybrid[elevation] = [...hybrid[elevation], ...additionalData.slice(0, hoursToAdd)];
        
        console.log(`    → ${elevation}: ${primaryData.length} hrs (ECMWF) + ${hoursToAdd} hrs (GFS/GEFS) = ${hybrid[elevation].length} hrs total`);
      } else {
        console.log(`    → ${elevation}: ${primaryData.length} hrs (ECMWF only)`);
      }
    }
    
    // Merge freezing levels if secondary model has them
    if (secondary?.freezingLevels && hybrid.freezingLevels.length < 168) {
      const lastPrimaryTime = hybrid.freezingLevels.length > 0
        ? new Date(hybrid.freezingLevels[hybrid.freezingLevels.length - 1].time).getTime()
        : 0;
      
      const additionalLevels = secondary.freezingLevels.filter((item: any) => {
        return new Date(item.time).getTime() > lastPrimaryTime;
      });
      
      hybrid.freezingLevels = [...hybrid.freezingLevels, ...additionalLevels].slice(0, 168);
    }
    
    return hybrid;
  }
  
  /**
   * Calculate accumulation totals
   */
  private calculateAccumulationTotals(forecasts: ElevationForecast[]): {
    snow24h: number;
    snow72h: number;
    snow7d: number;
  } {
    const snowfalls = forecasts.map(f => f.snowfallCmCorrected);
    
    return {
      snow24h: this.snowCalculator.calculate24h(snowfalls),
      snow72h: this.snowCalculator.calculate72h(snowfalls),
      snow7d: this.snowCalculator.calculate7d(snowfalls)
    };
  }
  
  /**
   * Estimate freezing level from temperature
   */
  private estimateFreezingLevel(temperature: number): number {
    const lapseRate = 0.0065; // °C per meter
    return Math.max(0, temperature / lapseRate);
  }

  /**
   * Compute snow reality adjustments for all elevation forecasts
   */
  private computeSnowReality(
    elevationForecasts: { base: ElevationForecast[]; mid: ElevationForecast[]; summit: ElevationForecast[] },
    resort: Resort
  ) {
    const allReality: import('../domain/models').SnowRealityForecast[] = [];

    // Process base elevation
    elevationForecasts.base.forEach(forecast => {
      const reality = this.snowRealityEngine.computeRealityAdjustments(
        forecast,
        'base',
        resort.baseElevation,
        forecast.snowfallCmCorrected
      );
      allReality.push(reality);
    });

    // Process mid elevation
    elevationForecasts.mid.forEach(forecast => {
      const reality = this.snowRealityEngine.computeRealityAdjustments(
        forecast,
        'mid',
        resort.midElevation,
        forecast.snowfallCmCorrected
      );
      allReality.push(reality);
    });

    // Process summit elevation
    elevationForecasts.summit.forEach(forecast => {
      const reality = this.snowRealityEngine.computeRealityAdjustments(
        forecast,
        'summit',
        resort.summitElevation,
        forecast.snowfallCmCorrected
      );
      allReality.push(reality);
    });

    // Aggregate to daily forecasts
    return this.snowRealityEngine.aggregateDailyReality(allReality);
  }

  /**
   * Compute wind impact analysis for all elevation forecasts
   */
  private computeWindImpact(
    elevationForecasts: { base: ElevationForecast[]; mid: ElevationForecast[]; summit: ElevationForecast[] },
    resort: Resort
  ) {
    const allImpact: import('../domain/models').WindImpactForecast[] = [];

    // Process base elevation
    elevationForecasts.base.forEach(forecast => {
      const impact = this.windImpactEngine.analyzeWindImpact(
        forecast,
        'base',
        resort.baseElevation
      );
      allImpact.push(impact);
    });

    // Process mid elevation
    elevationForecasts.mid.forEach(forecast => {
      const impact = this.windImpactEngine.analyzeWindImpact(
        forecast,
        'mid',
        resort.midElevation
      );
      allImpact.push(impact);
    });

    // Process summit elevation
    elevationForecasts.summit.forEach(forecast => {
      const impact = this.windImpactEngine.analyzeWindImpact(
        forecast,
        'summit',
        resort.summitElevation
      );
      allImpact.push(impact);
    });

    // Aggregate to daily forecasts
    return this.windImpactEngine.aggregateDailyWindImpact(allImpact);
  }
}
