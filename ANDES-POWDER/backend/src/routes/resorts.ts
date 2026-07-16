import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { Resort, CurrentConditions, ElevationConditions } from '../types';
import { SnowEngine } from '../engine/snow-engine';
import { MultiModelFetcher } from '../providers/open-meteo/multi-model-fetcher';
import { OpenMeteoService } from '../services/open-meteo';

const router = Router();

type RuntimeVisibility = {
  visibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'whiteout';
  visibilityMeters: number;
  inCloud: boolean;
  cloudBaseMeters?: number;
};

function estimateVisibilityRuntime(input: {
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  temperature: number;
}): RuntimeVisibility {
  const cloudCover = Math.max(0, Math.min(100, input.cloudCover || 0));
  const precipitation = Math.max(0, input.precipitation || 0);
  const windSpeed = Math.max(0, input.windSpeed || 0);
  const temperature = input.temperature || 0;

  let visibilityMeters = 10000;

  visibilityMeters -= cloudCover * 35;
  visibilityMeters -= precipitation * 2200;
  visibilityMeters -= Math.max(0, windSpeed - 30) * 60;

  if (temperature <= 1 && precipitation > 0.2) {
    visibilityMeters -= 1500;
  }

  visibilityMeters = Math.max(50, Math.min(10000, Math.round(visibilityMeters)));

  let visibility: RuntimeVisibility['visibility'];
  if (visibilityMeters < 150) visibility = 'whiteout';
  else if (visibilityMeters < 700) visibility = 'poor';
  else if (visibilityMeters < 3000) visibility = 'moderate';
  else if (visibilityMeters < 7000) visibility = 'good';
  else visibility = 'excellent';

  const inCloud = cloudCover >= 97 && visibilityMeters < 1200;

  return {
    visibility,
    visibilityMeters,
    inCloud,
    cloudBaseMeters: undefined,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM resorts ORDER BY name');
    const resorts = result.rows.map(mapResortFromDb);
    res.json(resorts);
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).json({ error: 'Failed to fetch resorts' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM resorts WHERE slug = $1 OR id::text = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = mapResortFromDb(result.rows[0]);
    res.json(resort);
  } catch (error) {
    console.error('Error fetching resort:', error);
    res.status(500).json({ error: 'Failed to fetch resort' });
  }
});

// Get real-time observed conditions (last 2 hours)
router.get('/:id/conditions/observed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = resortResult.rows[0];
    const midElevationDb = parseFloat(resort.mid_elevation || resort.midElevation || 0);

    // Try to get current conditions from Open-Meteo (updated every 15 minutes)
    let currentData = null;
    try {
      const { currentWeatherService } = await import('../services/current-weather-service');
      currentData = await currentWeatherService.getCurrentConditions(
        parseFloat(resort.latitude),
        parseFloat(resort.longitude)
      );
    } catch (error: any) {
      console.log('Current weather not available:', error.message);
    }

    // Get latest temperature observations for each elevation (last 2 hours)
    const observations = await pool.query(
      `SELECT 
        elevation_band,
        observation_type,
        value_numeric,
        observed_at,
        source
      FROM observations
      WHERE resort_id = $1
      AND observation_type = 'temperature'
      AND observed_at >= NOW() - INTERVAL '2 hours'
      ORDER BY observed_at DESC`,
      [resort.id]
    );

    // Group by elevation - get most recent for each
    const byElevation: any = {};
    observations.rows.forEach((obs: any) => {
      const band = obs.elevation_band;
      if (band && !byElevation[band]) {
        byElevation[band] = {
          temperature: parseFloat(obs.value_numeric),
          observedAt: obs.observed_at,
          source: obs.source || 'SMN Bariloche'
        };
      }
    });

    // Add current conditions data if available
    const response: any = {
      resort: {
        id: resort.id,
        name: resort.name,
        slug: resort.slug
      },
      observed: byElevation,
      note: 'Real observations from SMN Bariloche, adjusted for elevation. Updated hourly at :05 minutes.'
    };

    if (currentData) {
      response.current = {
        temperature: currentData.temperature,
        humidity: currentData.humidity,
        windSpeed: currentData.windSpeed,
        windDirection: currentData.windDirection,
        precipitation: currentData.precipitation,
        pressure: currentData.pressure,
        cloudCover: currentData.cloudCover,
        conditions: currentData.conditions,
        isRaining: currentData.isRaining,
        isPrecipitating: currentData.precipitation > 0,
        observedAt: currentData.observedAt,
        source: currentData.source
      };
      response.note += ' Current conditions from Open-Meteo (updated every 15 minutes).';
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching observed conditions:', error);
    res.status(500).json({ error: 'Failed to fetch observed conditions' });
  }
});

router.get('/:id/forecast/current', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = mapResortFromDb(resortResult.rows[0]);

    // Get current hourly forecasts (next hour for each elevation)
    const elevationResult = await pool.query(
      `SELECT DISTINCT ON (elevation_band)
        elevation_band,
        valid_time as timestamp,
        temperature_c as temperature,
        precipitation_mm as precipitation,
        phase_classification as precipitation_type,
        snowfall_cm_corrected as snow_depth,
        wind_speed_kmh as wind_speed,
        wind_direction,
        cloud_cover,
        powder_score,
        freezing_level_m,
        snow_line_m
       FROM elevation_forecasts 
       WHERE resort_id = $1::uuid 
       AND valid_time >= NOW()
       AND forecast_run_id = (
         SELECT id FROM forecast_runs 
         WHERE resort_id = $1::uuid 
         ORDER BY created_at DESC 
         LIMIT 1
       )
       ORDER BY elevation_band, (freezing_level_m IS NULL), valid_time 
       LIMIT 3`,
      [resort.id]
    );

    const forecasts = elevationResult.rows;
    
    // Get latest temperature observations (prefer real data over forecast)
    const obsResult = await pool.query(
      `SELECT elevation_band, value_numeric as temperature
       FROM observations
       WHERE resort_id = $1
       AND observation_type = 'temperature'
       AND observed_at >= NOW() - INTERVAL '2 hours'
       ORDER BY observed_at DESC`,
      [resort.id]
    );
    
    const observations = obsResult.rows;
    const baseObs = observations.find((o: any) => o.elevation_band === 'base');
    const midObs = observations.find((o: any) => o.elevation_band === 'mid');
    const summitObs = observations.find((o: any) => o.elevation_band === 'summit');
    
    const baseConditions = forecasts.find((f: any) => f.elevation_band === 'base');
    const midConditions = forecasts.find((f: any) => f.elevation_band === 'mid');
    const summitConditions = forecasts.find((f: any) => f.elevation_band === 'summit');

    // Get model agreement for confidence (optional, may not exist)
    let confidence = null;
    try {
      const agreementResult = await pool.query(
        `SELECT confidence_score, confidence_reason 
         FROM model_agreements 
         WHERE resort_id = $1 
         AND valid_time >= NOW() 
         ORDER BY valid_time 
         LIMIT 1`,
        [resort.id]
      );
      confidence = agreementResult.rows[0];
    } catch (error) {
      console.warn('model_agreements table not found or empty, using default confidence');
      confidence = { confidence_score: 6, confidence_reason: 'Good confidence, good model agreement, long forecast horizon' };
    }

    const currentConditions = {
      resort: {
        id: resort.id,
        name: resort.name,
        slug: resort.slug,
      },
      current: {
        timestamp: new Date(),
        powderScore: parseFloat(midConditions?.powder_score || 0),
        confidence: confidence ? {
          score: parseFloat(confidence.confidence_score),
          reason: confidence.confidence_reason
        } : null,
        snowLine: midConditions?.snow_line_m || null,
        freezingLevel: midConditions?.freezing_level_m || null,
        phase: midConditions?.phase_classification || 'unknown',
        snowQuality: midConditions?.snow_quality || 'unknown',
      },
      byElevation: {
        base: mapElevationForecast(baseConditions, resort.baseElevation, baseObs?.temperature),
        mid: mapElevationForecast(midConditions, resort.midElevation, midObs?.temperature),
        summit: mapElevationForecast(summitConditions, resort.summitElevation, summitObs?.temperature),
      },
    };

    if (!currentConditions.current.freezingLevel) {
      const frzResult = await pool.query(
        `SELECT freezing_level_m
         FROM elevation_forecasts
         WHERE resort_id = $1::uuid
           AND elevation_band = 'mid'
           AND valid_time >= NOW()
           AND valid_time <= NOW() + INTERVAL '3 hours'
           AND forecast_run_id = (
             SELECT id FROM forecast_runs
             WHERE resort_id = $1::uuid
             ORDER BY created_at DESC
             LIMIT 1
           )
           AND freezing_level_m IS NOT NULL
         ORDER BY valid_time
         LIMIT 1`,
        [resort.id]
      );
      if (frzResult.rows.length > 0) {
        currentConditions.current.freezingLevel = Math.round(parseFloat(frzResult.rows[0].freezing_level_m));
      }
    }

    if (!currentConditions.current.freezingLevel) {
      try {
        const om = new OpenMeteoService();
        const omForecast = await om.getForecast(resort.latitude, resort.longitude, resort.midElevation);
        const arr: number[] = omForecast?.hourly?.freezinglevel_height || [];
        const val = arr.find((v: any) => v != null);
        if (val != null) {
          currentConditions.current.freezingLevel = Math.round(Number(val));
        }
      } catch (e) {}
    }

    res.json(currentConditions);
  } catch (error) {
    console.error('Error fetching current conditions:', error);
    res.status(500).json({ error: 'Failed to fetch current conditions' });
  }
});

router.get('/:id/forecast/hourly', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { elevation = 'mid', hours = '168' } = req.query;

    console.log('[HOURLY] Request for:', id, 'elevation:', elevation, 'hours:', hours);

    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      console.log('[HOURLY] Resort not found:', id);
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = resortResult.rows[0];
    const elevationBand = elevation as string;
    const midElevationDbHourly = parseFloat(resort.mid_elevation || resort.midElevation || 0);
    const hoursLimit = parseInt(hours as string);

    const result = await pool.query(
      `SELECT DISTINCT ON (valid_time)
        valid_time,
        temperature_c,
        precipitation_mm,
        snowfall_cm_corrected,
        wind_speed_kmh,
        wind_gust_kmh,
        wind_direction,
        cloud_cover,
        powder_score,
        freezing_level_m,
        phase_classification
      FROM elevation_forecasts
      WHERE resort_id = $1::uuid
      AND elevation_band = $2
      AND valid_time >= date_trunc('hour', NOW())
      ORDER BY valid_time, forecast_run_id DESC
      LIMIT $3`,
      [resort.id, elevationBand, hoursLimit]
    );

    const hourlyForecasts = result.rows.map((row: any) => {
      const temperature = parseFloat(row.temperature_c);
      const precipitation = parseFloat(row.precipitation_mm || 0);
      const windSpeed = parseFloat(row.wind_speed_kmh || 0);
      const cloudCover = parseFloat(row.cloud_cover || 0);
      const runtimeVisibility = estimateVisibilityRuntime({
        cloudCover,
        precipitation,
        windSpeed,
        temperature,
      });

      return {
        time: row.valid_time,
        temperature,
        precipitation,
        windSpeed,
        windGust: parseFloat(row.wind_gust_kmh || 0),
        windDirection: row.wind_direction || 0,
        humidity: 70,
        cloudCover,
        phase: row.phase_classification || 'none',
        powderScore: parseFloat(row.powder_score || 0),
        snowfall: parseFloat(row.snowfall_cm_corrected || 0),
        freezingLevel: row.freezing_level_m ? Math.round(parseFloat(row.freezing_level_m)) : null,
        visibility: runtimeVisibility.visibility,
        visibilityMeters: runtimeVisibility.visibilityMeters,
        inCloud: runtimeVisibility.inCloud,
        cloudBaseMeters: runtimeVisibility.cloudBaseMeters,
      };
    });

    // Fill missing FRZ with last known valid value from DB
    const missingFrz = hourlyForecasts.some(h => h.freezingLevel == null || !Number.isFinite(h.freezingLevel as number));
    if (missingFrz) {
      let lastKnownFrz: number | null = null;
      try {
        const lastFrzResult = await pool.query(
          `SELECT freezing_level_m FROM elevation_forecasts
           WHERE resort_id = $1::uuid AND elevation_band = 'mid'
             AND freezing_level_m IS NOT NULL
           ORDER BY valid_time DESC LIMIT 1`,
          [resort.id]
        );
        if (lastFrzResult.rows.length > 0) {
          lastKnownFrz = Math.round(parseFloat(lastFrzResult.rows[0].freezing_level_m));
        }
      } catch (_) {}
      const frzFallback = lastKnownFrz ?? 2000;
      for (const h of hourlyForecasts) {
        if (h.freezingLevel == null || !Number.isFinite(h.freezingLevel as number)) {
          h.freezingLevel = frzFallback;
        }
      }
    }

    let needsProviderFallback = false;
    if (hourlyForecasts.length >= 6) {
      const first6 = hourlyForecasts.slice(0, 6);
      const set = new Set(first6.map(h => h.freezingLevel));
      const anyCold = first6.some(h => h.temperature < 0);
      const frzVal = first6[0].freezingLevel;
      const highVsMid = midElevationDbHourly && frzVal && (frzVal - midElevationDbHourly > 300);
      const flat = set.size === 1;
      // If base is selected, relax the cold temperature requirement to unstick flat/high FRZ series
      // Additionally, if the first hour FRZ is very high vs mid (>500m), trigger fallback for base even if not flat
      const veryHighVsMid = midElevationDbHourly && frzVal && (frzVal - midElevationDbHourly > 500);
      needsProviderFallback = (flat && !!highVsMid && (anyCold || elevationBand === 'base'))
        || (elevationBand === 'base' && !!veryHighVsMid);
    }

    needsProviderFallback = false;
    if (needsProviderFallback) {
      try {
        const om = new OpenMeteoService();
        const omForecast = await om.getForecast(parseFloat(resort.latitude), parseFloat(resort.longitude), midElevationDbHourly || parseFloat(resort.midElevation));
        const times: string[] = omForecast?.hourly?.time || [];
        const frz: number[] = omForecast?.hourly?.freezinglevel_height || [];
        const providerPoints: Array<{t:number; v:number}> = [];
        for (let i = 0; i < times.length; i++) {
          const t = new Date(times[i]).getTime();
          const v = frz[i];
          if (v != null) providerPoints.push({ t, v: Math.round(Number(v)) });
        }
        const TOL = 4 * 60 * 60 * 1000; // 4 hours to absorb TZ offsets
        let replaced = 0;
        for (const h of hourlyForecasts) {
          const t = new Date(h.time).getTime();
          let best: {t:number; v:number} | null = null;
          let bestDt = Number.POSITIVE_INFINITY;
          for (const p of providerPoints) {
            const dt = Math.abs(p.t - t);
            if (dt < bestDt) { bestDt = dt; best = p; }
          }
          if (best && bestDt <= TOL) {
            h.freezingLevel = best.v;
            replaced++;
          }
        }

        if (replaced === 0) {
          const lapse = 0.0065; // °C/m
          for (const h of hourlyForecasts.slice(0, 6)) {
            if (h.temperature < 0 && ((h.freezingLevel ?? 2000) - midElevationDbHourly > 300)) {
              const est = Math.round(midElevationDbHourly + (h.temperature / lapse));
              h.freezingLevel = Math.max(300, Math.min(4800, est));
            }
          }
        }
      } catch (e) {}
    }

    if (hourlyForecasts.length > 1) {
      const MAX_DELTA_PER_HOUR = 800;
      const MIN_FRZ = 300;
      const MAX_FRZ = 4800;
      for (let i = 1; i < hourlyForecasts.length; i++) {
        const prev = hourlyForecasts[i - 1].freezingLevel;
        let cur = hourlyForecasts[i].freezingLevel;
        if (prev != null && cur != null) {
          const delta = cur - prev;
          if (Math.abs(delta) > MAX_DELTA_PER_HOUR) {
            cur = prev + Math.sign(delta) * MAX_DELTA_PER_HOUR;
            hourlyForecasts[i].freezingLevel = cur;
          }
        }
        hourlyForecasts[i].freezingLevel = Math.max(MIN_FRZ, Math.min(MAX_FRZ, Number(hourlyForecasts[i].freezingLevel ?? 2000)));
      }
    }

    // Safety net: Correct phase using elevation-specific FRZ margin and temperature
    // Ensures we don't show 'rain' at subzero temps well below FRZ for the selected band
    const elevationMeters = (() => {
      try {
        if (elevationBand === 'base') return parseFloat(resort.base_elevation || resort.baseElevation || 0);
        if (elevationBand === 'mid') return parseFloat(resort.mid_elevation || resort.midElevation || 0);
        return parseFloat(resort.summit_elevation || resort.summitElevation || 0);
      } catch {
        return 0;
      }
    })();

    for (const h of hourlyForecasts) {
      const frz = h.freezingLevel ?? 2000;
      const margin = frz - elevationMeters; // negative = colder than FRZ (snow-favor)
      const temp = Number(h.temperature);
      const precip = Number(h.precipitation || 0);
      // Strong snow signal
      if (margin < -200 && precip >= 0.1) {
        h.phase = 'snow';
      } else if (temp <= -2 && precip >= 0.1 && margin < -50) {
        // At least mixed if subzero and near/below FRZ
        if (h.phase === 'rain' || !h.phase || h.phase === 'none') h.phase = margin < -120 ? 'snow' : 'mixed';
      } else if (temp <= -1 && precip >= 0.1 && margin < -100 && h.phase === 'rain') {
        // Prevent 'rain' label in clearly subfreezing margin
        h.phase = 'mixed';
      }
    }

    console.log('[HOURLY] Returning', hourlyForecasts.length, 'forecasts');

    res.json({
      resort: {
        id: resort.id,
        name: resort.name,
        slug: resort.slug,
      },
      elevation: elevationBand,
      hourly: hourlyForecasts,
    });
  } catch (error) {
    console.error('[HOURLY] Error:', error);
    res.status(500).json({ error: 'Failed to fetch hourly forecast', details: (error as Error).message });
  }
});

/**
 * GET /api/resorts/:id/storm-crossing
 * Get storm crossing probability forecast for a resort
 */
router.get('/:id/storm-crossing', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hours = '168' } = req.query;

    console.log(`[Storm Crossing] Computing for resort: ${id}`);

    // Get resort
    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = mapResortFromDb(resortResult.rows[0]);

    // Convert to domain Resort model
    const domainResort = {
      ...resort,
      country: resort.country as 'AR' | 'CL',
      town: resort.region,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[Storm Crossing] Processing forecast with SnowEngine...`);
    
    // Compute storm crossing probability using real SnowEngine
    const snowEngine = new SnowEngine([]);
    const processedForecast = await snowEngine.processResortForecast(domainResort);

    console.log(`[Storm Crossing] Forecast processed. Storm crossing data points: ${processedForecast.stormCrossingProbabilities?.length || 0}`);

    if (!processedForecast.stormCrossingProbabilities || processedForecast.stormCrossingProbabilities.length === 0) {
      console.warn(`[Storm Crossing] No storm crossing data available for ${resort.name}`);
      return res.json({
        resortId: resort.id,
        resortName: resort.name,
        issuedAt: processedForecast.issuedAt,
        forecast: [],
      });
    }

    res.json({
      resortId: resort.id,
      resortName: resort.name,
      issuedAt: processedForecast.issuedAt,
      forecast: processedForecast.stormCrossingProbabilities,
    });
  } catch (error) {
    console.error('[Storm Crossing] Error computing storm crossing data:', error);
    res.status(500).json({ error: 'Failed to compute storm crossing data' });
  }
});

/**
 * GET /api/resorts/:id/snow-reality
 * Get snow reality forecast with adjustments
 */
router.get('/:id/snow-reality', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[Snow Reality] Computing for resort: ${id}`);

    // Get resort
    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = mapResortFromDb(resortResult.rows[0]);

    // Convert to domain Resort model
    const domainResort = {
      ...resort,
      country: resort.country as 'AR' | 'CL',
      town: resort.region,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[Snow Reality] Processing forecast with SnowEngine...`);
    
    // Compute full forecast including snow reality
    const snowEngine = new SnowEngine([]);
    const processedForecast = await snowEngine.processResortForecast(domainResort);

    console.log(`[Snow Reality] Snow reality forecasts: ${processedForecast.snowRealityForecasts?.length || 0}`);

    if (!processedForecast.snowRealityForecasts || processedForecast.snowRealityForecasts.length === 0) {
      console.warn(`[Snow Reality] No snow reality data available for ${resort.name}`);
      return res.json({
        resortId: resort.id,
        resortName: resort.name,
        issuedAt: processedForecast.issuedAt,
        forecasts: [],
      });
    }

    // Return snow reality forecasts directly
    res.json({
      resortId: resort.id,
      resortName: resort.name,
      issuedAt: processedForecast.issuedAt,
      totalForecasts: processedForecast.snowRealityForecasts.length,
      forecasts: processedForecast.snowRealityForecasts.slice(0, 21), // First 7 days (3 elevations each)
    });
  } catch (error) {
    console.error('[Snow Reality] Error computing snow reality data:', error);
    res.status(500).json({ error: 'Failed to compute snow reality data' });
  }
});

/**
 * GET /api/resorts/:id/wind-impact
 * Get wind impact analysis with elevation adjustments
 */
router.get('/:id/wind-impact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[Wind Impact] Computing for resort: ${id}`);

    // Get resort
    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = mapResortFromDb(resortResult.rows[0]);

    // Convert to domain Resort model
    const domainResort = {
      ...resort,
      country: resort.country as 'AR' | 'CL',
      town: resort.region,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[Wind Impact] Processing forecast with SnowEngine...`);
    
    // Compute full forecast including wind impact
    const snowEngine = new SnowEngine([]);
    const processedForecast = await snowEngine.processResortForecast(domainResort);

    console.log(`[Wind Impact] Wind impact forecasts: ${processedForecast.windImpactForecasts?.length || 0}`);

    if (!processedForecast.windImpactForecasts || processedForecast.windImpactForecasts.length === 0) {
      console.warn(`[Wind Impact] No wind impact data available for ${resort.name}`);
      return res.json({
        resortId: resort.id,
        resortName: resort.name,
        issuedAt: processedForecast.issuedAt,
        forecasts: [],
      });
    }

    // Return wind impact forecasts directly
    res.json({
      resortId: resort.id,
      resortName: resort.name,
      issuedAt: processedForecast.issuedAt,
      totalForecasts: processedForecast.windImpactForecasts.length,
      forecasts: processedForecast.windImpactForecasts.slice(0, 21), // First 7 days (3 elevations each)
    });
  } catch (error) {
    console.error('[Wind Impact] Error computing wind impact data:', error);
    res.status(500).json({ error: 'Failed to compute wind impact data' });
  }
});

function mapResortFromDb(row: any): Resort {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    region: row.region,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    timezone: row.timezone,
    baseElevation: row.base_elevation,
    midElevation: row.mid_elevation,
    summitElevation: row.summit_elevation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapElevationForecast(forecast: any, elevation: number, observedTemp?: number) {
  if (!forecast) {
    return {
      elevation,
      temperature: observedTemp !== undefined ? parseFloat(observedTemp.toString()) : null,
      snowfall24h: 0,
      conditions: 'No data',
      powderScore: 0,
      skiabilityScore: 0,
      windSpeed: 0,
      windImpact: 'none',
      humidity: 50,
      cloudCover: 0,
      phase: 'unknown',
      snowQuality: 'unknown',
      confidence: null,
    };
  }

  return {
    elevation,
    // Prioritize observed temperature over forecast
    temperature: observedTemp !== undefined ? parseFloat(observedTemp.toString()) : parseFloat(forecast.temperature),
    snowfall24h: parseFloat(forecast.snow_depth || 0),
    conditions: forecast.precipitation_type || 'Standard conditions',
    powderScore: parseFloat(forecast.powder_score || 0),
    skiabilityScore: 0, // Not available in hourly_forecasts
    windSpeed: parseFloat(forecast.wind_speed || 0),
    windImpact: 'none', // Not available in hourly_forecasts
    humidity: 70, // Not available in hourly_forecasts, use default
    cloudCover: parseFloat(forecast.cloud_cover || 0),
    phase: forecast.precipitation_type || 'unknown',
    snowQuality: forecast.precipitation_type || 'unknown',
    confidence: null, // Not available in hourly_forecasts
  };
}

function mapElevationConditions(hourly: any, elevation: number) {
  if (!hourly) {
    return {
      elevation,
      temperature: null,
      conditions: 'No data',
      powderScore: 0,
    };
  }

  const conditions: string[] = [];
  
  if (hourly.precipitation > 0) {
    conditions.push('Precipitation');
  }
  
  if (hourly.temperature > 0) {
    conditions.push('Above freezing');
  } else if (hourly.temperature < -10) {
    conditions.push('Very cold');
  }

  return {
    elevation,
    temperature: hourly.temperature,
    conditions: conditions.length > 0 ? conditions.join(', ') : 'Standard conditions',
    powderScore: hourly.powder_score || 0,
  };
}

function generateConditionsText(hourly: any): string {
  const parts: string[] = [];

  if (hourly.precipitation_type === 'snow' && hourly.precipitation > 0) {
    parts.push(`${hourly.precipitation}cm fresh snow`);
  } else if (hourly.precipitation_type === 'rain') {
    parts.push('Rain');
  }

  if (hourly.wind_speed > 40) {
    parts.push('Strong winds');
  } else if (hourly.wind_speed > 25) {
    parts.push('Moderate winds');
  }

  if (hourly.temperature > 0) {
    parts.push('Above freezing');
  } else if (hourly.temperature < -10) {
    parts.push('Very cold');
  }

  return parts.length > 0 ? parts.join(', ') : 'Standard conditions';
}

router.get('/:id/accumulation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { elevation = 'mid', days = '14' } = req.query as any;

    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = resortResult.rows[0];
    const tzCandidate = resort.timezone || 'America/Argentina/Buenos_Aires';
    const tz = typeof tzCandidate === 'string' && /^[A-Za-z_\\/+-]+$/.test(tzCandidate)
      ? tzCandidate
      : 'America/Argentina/Buenos_Aires';

    const elevationBand = String(elevation);
    const elevationMeters = elevationBand === 'base'
      ? parseFloat(resort.base_elevation || 1000)
      : elevationBand === 'mid'
      ? parseFloat(resort.mid_elevation || 1600)
      : parseFloat(resort.summit_elevation || 2100);
    const windMultiplier = elevationBand === 'summit' ? 1.3 : elevationBand === 'mid' ? 1.2 : 1.0;
    const totalDays = Math.max(2, Math.min(30, parseInt(String(days)) || 14));
    const last = Math.floor(totalDays / 2);
    const next = totalDays - last;
    const todayIndex = last;

    const daysArr: Array<{ date: string; predicted_cm: number; run_timestamp: string | null; is_past: boolean; is_observed?: boolean }>= [];
    let totalPast = 0;
    let totalNext = 0;

    // --- Fetch live FRZ from Open-Meteo (same override the hourly endpoint uses) ---
    let liveFrzPoints: Array<{ t: number; v: number }> = [];
    try {
      const om = new OpenMeteoService();
      const omForecast = await om.getForecast(
        parseFloat(resort.latitude),
        parseFloat(resort.longitude),
        elevationMeters
      );
      const frzTimes: string[] = omForecast?.hourly?.time || [];
      const frzRaw: Array<number | null> = (omForecast?.hourly as any)?.freezinglevel_height || [];
      const frzFilled: number[] = Array.from({ length: frzTimes.length }, (_, i) => {
        const v = frzRaw[i]; return v == null ? NaN : Math.round(Number(v));
      });
      let fi = frzFilled.findIndex(Number.isFinite);
      if (fi === -1) fi = 0;
      if (fi > 0) for (let i = 0; i < fi; i++) frzFilled[i] = frzFilled[fi];
      let ix = Math.max(0, fi);
      while (ix < frzFilled.length) {
        if (Number.isFinite(frzFilled[ix])) { ix++; continue; }
        let jx = ix + 1;
        while (jx < frzFilled.length && !Number.isFinite(frzFilled[jx])) jx++;
        const lx = ix - 1, rx = jx < frzFilled.length ? jx : -1;
        if (rx !== -1 && Number.isFinite(frzFilled[lx]) && Number.isFinite(frzFilled[rx])) {
          const span = rx - lx;
          for (let k = 1; k < span; k++)
            frzFilled[lx + k] = Math.round(frzFilled[lx] + ((frzFilled[rx] - frzFilled[lx]) * k) / span);
          ix = rx + 1;
        } else {
          const fv = Number.isFinite(frzFilled[lx]) ? (frzFilled[lx] as number) : 2000;
          for (let k = ix; k < (rx === -1 ? frzFilled.length : rx); k++) frzFilled[k] = fv;
          ix = rx === -1 ? frzFilled.length : rx + 1;
        }
      }
      for (let idx = 0; idx < frzTimes.length; idx++) {
        const tv = frzFilled[idx];
        if (Number.isFinite(tv)) liveFrzPoints.push({ t: new Date(frzTimes[idx]).getTime(), v: tv });
      }
    } catch { console.warn('[ACCUMULATION] live FRZ fetch failed, falling back to DB values'); }

    // --- Pre-fetch all future hourly rows grouped by local date ---
    const futureHoursMap = new Map<string, any[]>();
    const FRZ_TOL = 4 * 60 * 60 * 1000;
    const localDateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    try {
      const fhRes = await pool.query(
        `SELECT ef.valid_time, ef.snowfall_cm_corrected, ef.wind_speed_kmh,
                ef.phase_classification, ef.freezing_level_m, ef.temperature_c
         FROM elevation_forecasts ef
         WHERE ef.resort_id = $1
           AND ef.elevation_band = $2
           AND ef.valid_time >= NOW()
           AND ef.forecast_run_id = (
             SELECT id FROM forecast_runs WHERE resort_id = $1 ORDER BY created_at DESC LIMIT 1
           )
         ORDER BY ef.valid_time`,
        [resort.id, elevationBand]
      );
      for (const row of fhRes.rows) {
        const t = new Date(row.valid_time).getTime();
        let bestFrz: number | null = null, bestDt = Infinity;
        for (const p of liveFrzPoints) {
          const dt = Math.abs(p.t - t);
          if (dt < bestDt) { bestDt = dt; bestFrz = p.v; }
        }
        row.live_frz = (bestFrz != null && bestDt <= FRZ_TOL) ? bestFrz : null;
        const dk = localDateFmt.format(new Date(row.valid_time));
        if (!futureHoursMap.has(dk)) futureHoursMap.set(dk, []);
        futureHoursMap.get(dk)!.push(row);
      }
    } catch { console.warn('[ACCUMULATION] future hours pre-fetch failed'); }

    const todayStr = localDateFmt.format(new Date());
    const todayBase = new Date(todayStr + 'T12:00:00Z');

    for (let offset = -last; offset < next; offset++) {
      const isPast = offset < 0;
      const cap = elevationBand === 'base' ? 18 : (elevationBand === 'mid' ? 25 : 40);

      if (!isPast) {
        // Future days: JS computation with live Open-Meteo FRZ
        const targetDate = new Date(todayBase);
        targetDate.setUTCDate(targetDate.getUTCDate() + offset);
        const dateKey = targetDate.toISOString().slice(0, 10);
        const hours = futureHoursMap.get(dateKey) || [];
        let dailyTotal = 0;
        for (const hr of hours) {
          if (!['snow', 'sleet', 'mixed'].includes(hr.phase_classification)) continue;
          const snow = parseFloat(hr.snowfall_cm_corrected || 0);
          if (snow <= 0) continue;
          const frz = hr.live_frz != null ? hr.live_frz
            : (hr.freezing_level_m != null ? parseFloat(hr.freezing_level_m) : null);
          const surfaceTemp = parseFloat(hr.temperature_c || 0);
          let retention: number;
          if (frz == null) { retention = 0.7; }
          else {
            const margin = frz - elevationMeters;
            if (margin <= -300) retention = 0.95;
            else if (margin <= -100) retention = 0.88;
            else if (margin <= 50) retention = 0.45;
            else if (margin <= 150) retention = 0.20;
            else if (margin <= 250) retention = 0.08;
            else if (margin <= 350) retention = 0.04;
            else if (margin <= 450) retention = 0.02;
            else retention = 0;
          }
          // T<0°C: snow/mixed precipitación sí acumula aunque FRZ esté alto
          if (surfaceTemp < 0 && hr.phase_classification !== 'sleet') {
            retention = Math.max(retention, hr.phase_classification === 'snow' ? 0.75 : 0.45);
          }
          if (retention === 0) continue;
          const wind = parseFloat(hr.wind_speed_kmh || 0) * windMultiplier;
          const wf = wind > 60 ? 0.65 : wind > 40 ? 0.75 : wind > 25 ? 0.85 : wind > 15 ? 0.92 : 0.97;
          dailyTotal += snow * retention * wf * 0.93;
        }
        const predicted = Math.min(cap, Math.max(0, dailyTotal));
        totalNext += predicted;
        daysArr.push({
          date: dateKey,
          predicted_cm: Math.round(predicted * 10) / 10,
          run_timestamp: null,
          is_past: false,
        });
        continue;
      }

      // Past days: SQL (will be overridden by snowfall_history below)
      const sql = `
        WITH bounds AS (
          SELECT date_trunc('day', (NOW() AT TIME ZONE '${tz}')) + ($1 || ' day')::interval AS day_start_local
        ),
        run AS (
          SELECT id, created_at
          FROM forecast_runs
          WHERE resort_id = $2
            AND created_at <= (((SELECT day_start_local FROM bounds) + interval '1 day') AT TIME ZONE '${tz}')
          ORDER BY created_at DESC
          LIMIT 1
        )
        SELECT
          to_char((SELECT day_start_local FROM bounds),'YYYY-MM-DD') AS day_key,
          (SELECT created_at FROM run) AS run_timestamp,
          COALESCE((
            SELECT SUM(
              CASE
                WHEN ef.phase_classification NOT IN ('snow', 'sleet', 'mixed') THEN 0
                WHEN ef.snowfall_cm_corrected <= 0 THEN 0
                WHEN ef.freezing_level_m IS NULL THEN ef.snowfall_cm_corrected * 0.7
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= -300 THEN ef.snowfall_cm_corrected * 0.95
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= -100 THEN ef.snowfall_cm_corrected * 0.88
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= 50  THEN ef.snowfall_cm_corrected * 0.45
                WHEN ef.phase_classification = 'mixed' AND ef.temperature_c < 0 THEN ef.snowfall_cm_corrected * 0.45
                WHEN ef.phase_classification = 'snow'  AND ef.temperature_c < 0 THEN ef.snowfall_cm_corrected * 0.75
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= 150 THEN ef.snowfall_cm_corrected * 0.20
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= 250 THEN ef.snowfall_cm_corrected * 0.08
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= 350 THEN ef.snowfall_cm_corrected * 0.04
                WHEN (ef.freezing_level_m - ${elevationMeters}) <= 450 THEN ef.snowfall_cm_corrected * 0.02
                ELSE 0
              END
              * CASE
                  WHEN (COALESCE(ef.wind_speed_kmh, 0) * ${windMultiplier}) > 60 THEN 0.65
                  WHEN (COALESCE(ef.wind_speed_kmh, 0) * ${windMultiplier}) > 40 THEN 0.75
                  WHEN (COALESCE(ef.wind_speed_kmh, 0) * ${windMultiplier}) > 25 THEN 0.85
                  WHEN (COALESCE(ef.wind_speed_kmh, 0) * ${windMultiplier}) > 15 THEN 0.92
                  ELSE 0.97
                END
              * 0.93
            )
            FROM elevation_forecasts ef
            WHERE ef.resort_id = $2
              AND ef.elevation_band = $3
              AND ef.forecast_run_id = (SELECT id FROM run)
              AND (ef.valid_time AT TIME ZONE '${tz}') >= (SELECT day_start_local FROM bounds)
              AND (ef.valid_time AT TIME ZONE '${tz}') < (SELECT day_start_local FROM bounds) + interval '1 day'
          ), 0) AS predicted_cm`;

      const r = await pool.query(sql, [offset, resort.id, elevationBand]);
      const row = r.rows[0] || {};
      const rawPred = Number.parseFloat(row.predicted_cm || 0);
      const predicted = Math.min(cap, Math.max(0, Number.isFinite(rawPred) ? rawPred : 0));
      totalPast += predicted;
      daysArr.push({
        date: row.day_key || '',
        predicted_cm: Math.round((Number.isFinite(predicted) ? predicted : 0) * 10) / 10,
        run_timestamp: row.run_timestamp || null,
        is_past: true,
      });
    }

    // Override past days with observed snowfall history when available
    try {
      const pastDates = daysArr.filter(d => d.is_past).map(d => d.date).sort();
      if (pastDates.length > 0) {
        const startDate = pastDates[0];
        const endDate = pastDates[pastDates.length - 1];
        const obsRes = await pool.query(
          `SELECT to_char(date, 'YYYY-MM-DD') AS date_key, snowfall_cm
           FROM snowfall_history
           WHERE resort_id = $1
             AND elevation_band = $2
             AND date >= $3::date
             AND date <= $4::date`,
          [resort.id, elevationBand, startDate, endDate]
        );
        const obsMap = new Map<string, number>();
        for (const row of obsRes.rows) {
          const v = Number.parseFloat(row.snowfall_cm || 0);
          if (Number.isFinite(v)) obsMap.set(row.date_key, v);
        }
        // Recompute past total using observed values when present
        totalPast = 0;
        for (const d of daysArr) {
          if (d.is_past) {
            const ov = obsMap.get(d.date);
            if (ov != null) {
              const cap = elevationBand === 'base' ? 30 : (elevationBand === 'mid' ? 40 : 50);
              const clamped = Math.min(cap, Math.max(0, ov));
              d.predicted_cm = Math.round(clamped * 10) / 10;
              d.is_observed = true;
            }
            totalPast += d.predicted_cm || 0;
          }
        }
      }
    } catch (e) {
      // If snowfall_history table is missing or query fails, keep forecast-based values
      console.warn('[ACCUMULATION] snowfall_history unavailable, using forecast-only for past days');
    }

    res.json({
      resort: { id: resort.id, name: resort.name, slug: resort.slug },
      elevation: elevationBand,
      timezone: tz,
      todayIndex,
      totals: {
        last7Days: Math.round(totalPast * 10) / 10,
        next7Days: Math.round(totalNext * 10) / 10,
      },
      days: daysArr,
    });
  } catch (error) {
    console.error('[ACCUMULATION] Error:', error);
    res.status(500).json({ error: 'Failed to compute accumulation' });
  }
});

router.get('/:id/forecast/daily', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { elevation = 'mid', days = '7' } = req.query;
    const elevationBand = elevation as string;
    const daysLimit = parseInt(days as string);

    // Import pool dynamically like the working debug endpoint
    const dbPool = (await import('../config/database')).default;

    // Resolve slug → UUID first
    const resortRes = await dbPool.query(
      'SELECT id FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );
    if (resortRes.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    const resortId = resortRes.rows[0].id;

    const result = await dbPool.query(
      `SELECT 
        (valid_time AT TIME ZONE 'America/Argentina/Buenos_Aires')::date as date,
        MAX(temperature_c) as max_temp,
        MIN(temperature_c) as min_temp,
        SUM(CASE WHEN phase_classification IN ('snow','sleet','mixed') THEN snowfall_cm_corrected ELSE 0 END) as total_snowfall,
        SUM(precipitation_mm) as total_precipitation,
        AVG(powder_score) as avg_powder_score,
        MAX(wind_speed_kmh) as max_wind_speed,
        MAX(wind_gust_kmh) as max_wind_gust,
        AVG(cloud_cover) as avg_cloud_cover
      FROM elevation_forecasts
      WHERE resort_id = $1
      AND elevation_band = $2
      AND valid_time >= NOW()
      AND forecast_run_id = (
        SELECT id FROM forecast_runs WHERE resort_id = $1 ORDER BY created_at DESC LIMIT 1
      )
      GROUP BY (valid_time AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      ORDER BY date
      LIMIT $3`,
      [resortId, elevationBand, daysLimit]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No forecast data available' });
    }

    const now = new Date();
    const dailyForecasts = result.rows.map((row: any, index: number) => {
      const forecastDate = new Date(row.date);
      const hoursOut = (forecastDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Calculate confidence score based on lead time
      // Using simplified version since we don't have model agreement data here
      let leadTimeFactor = 1.0;
      if (hoursOut <= 24) leadTimeFactor = 1.0;
      else if (hoursOut <= 48) leadTimeFactor = 0.9;
      else if (hoursOut <= 72) leadTimeFactor = 0.8;
      else if (hoursOut <= 120) leadTimeFactor = 0.7;
      else if (hoursOut <= 168) leadTimeFactor = 0.6;
      else leadTimeFactor = 0.5;
      
      // Simplified confidence (0-10 scale)
      // In production, this would include model agreement from ConfidenceService
      const confidenceScore = leadTimeFactor * 10;
      
      // Generate confidence reason in Spanish
      let confidenceReason = '';
      if (confidenceScore >= 7.5) {
        if (hoursOut <= 24) {
          confidenceReason = 'Alta confianza - Pronóstico de corto plazo';
        } else if (hoursOut <= 72) {
          confidenceReason = 'Alta confianza - Pronóstico confiable';
        } else {
          confidenceReason = 'Buena confianza - Pronóstico lejano';
        }
      } else if (confidenceScore >= 5.0) {
        if (hoursOut > 120) {
          confidenceReason = 'Confianza moderada - Pronóstico muy lejano';
        } else {
          confidenceReason = 'Confianza moderada - Revisá más cerca de la fecha';
        }
      } else {
        confidenceReason = 'Baja confianza - Pronóstico demasiado lejano';
      }

      return {
        date: row.date,
        maxTemp: parseFloat(row.max_temp),
        minTemp: parseFloat(row.min_temp),
        snowfall: parseFloat(row.total_snowfall || 0),
        precipitation: parseFloat(row.total_precipitation || 0),
        powderScore: parseFloat(row.avg_powder_score || 0),
        maxWindSpeed: parseFloat(row.max_wind_speed || 0),
        maxWindGust: parseFloat(row.max_wind_gust || 0),
        cloudCover: parseFloat(row.avg_cloud_cover || 0),
        confidenceScore: Math.round(confidenceScore * 10) / 10,
        confidenceReason,
      };
    });

    res.json(dailyForecasts);
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
    res.status(500).json({ error: 'Failed to fetch daily forecast' });
  }
});

// Get Best Time to Ski windows for next 72 hours
// TODO: Implement proper database query when schema is confirmed
router.get('/:id/best-time', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const elevation = (req.query.elevation as string) || 'mid';

    console.log('[BEST TIME] Request for resort:', id, 'elevation:', elevation);

    // For now, return empty array since current conditions are not ideal
    // (0cm snow, warm temps). This prevents errors in the frontend.
    // TODO: Implement proper query once database schema is confirmed
    res.json([]);
  } catch (error) {
    console.error('Error finding best ski times:', error);
    res.status(500).json({ error: 'Failed to find best ski times' });
  }
});

// Get current snow depth (accumulated snow on ground) 
router.get('/:id/snow-depth', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Try to find resort by slug first, then by id if it's a valid UUID
    const resortResult = await pool.query(
      `SELECT * FROM resorts WHERE slug = $1 
       OR (id::text = $1 AND $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')`,
      [id]
    );
    
    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    
    const resort = resortResult.rows[0];
    
    // Fetch current snow depth from Open-Meteo for each elevation
    const axios = (await import('axios')).default;
    
    const elevations = [
      { band: 'base', meters: resort.base_elevation },
      { band: 'mid', meters: resort.mid_elevation },
      { band: 'summit', meters: resort.summit_elevation }
    ].filter(e => e.meters != null && e.meters > 0);
    
    const snowDepthData = await Promise.all(
      elevations.map(async ({ band, meters }) => {
        try {
          const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
              latitude: resort.latitude,
              longitude: resort.longitude,
              elevation: meters,
              current: 'snow_depth',
              timezone: 'auto'
            }
          });
          
          const unit = response.data?.current_units?.snow_depth;
          const toCm = unit === 'cm' ? 1 : unit === 'm' ? 100 : 100;
          const snowDepthVal = response.data.current?.snow_depth || 0;
          const snowDepthCm = Math.round((Number(snowDepthVal) || 0) * toCm);
          
          return {
            elevation: band,
            elevationMeters: meters,
            snowDepthCm,
            lastUpdate: response.data.current?.time || new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error fetching snow depth for ${band}:`, error);
          return {
            elevation: band,
            elevationMeters: meters,
            snowDepthCm: 0,
            lastUpdate: new Date().toISOString()
          };
        }
      })
    );
    
    res.json({
      resort: {
        id: resort.id,
        name: resort.name,
        slug: resort.slug
      },
      snowDepth: snowDepthData,
      source: 'Open-Meteo Forecast API',
      note: 'Current accumulated snow depth on ground (not forecast)'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching snow depth:', errorMessage, error);
    
    // Return empty data instead of error to prevent frontend crashes
    res.json({
      resort: {
        id: req.params.id,
        name: 'Unknown',
        slug: req.params.id
      },
      snowDepth: [
        { elevation: 'mid', elevationMeters: 1600, snowDepthCm: 0, lastUpdate: new Date().toISOString() }
      ],
      source: 'Error - returning default values',
      note: 'Failed to fetch snow depth: ' + errorMessage
    });
  }
});

// Get snow depth daily series and on-ground accumulation for last N days
router.get('/:id/snow-depth-series', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const elevationBand = (req.query.elevation as string) || 'mid';
    const daysParam = parseInt((req.query.days as string) || '7', 10);
    const days = Math.max(1, Math.min(30, Number.isFinite(daysParam) ? daysParam : 7));

    const resortResult = await pool.query(
      `SELECT * FROM resorts WHERE slug = $1 
       OR (id::text = $1 AND $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')`,
      [id]
    );
    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    const resort = resortResult.rows[0];

    const meters = elevationBand === 'base' ? resort.base_elevation
      : elevationBand === 'summit' ? resort.summit_elevation
      : resort.mid_elevation;

    if (!meters || meters <= 0) {
      return res.status(400).json({ error: 'Invalid or missing elevation meters for resort' });
    }

    const axios = (await import('axios')).default;
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: resort.latitude,
        longitude: resort.longitude,
        elevation: meters,
        hourly: 'snow_depth',
        past_days: days,
        forecast_days: 1,
        timezone: 'auto'
      }
    });

    const times: string[] = response.data?.hourly?.time || [];
    const depths: number[] = response.data?.hourly?.snow_depth || [];
    const unit = response.data?.hourly_units?.snow_depth;
    const toCm = unit === 'cm' ? 1 : unit === 'm' ? 100 : 100;
    if (!Array.isArray(times) || !Array.isArray(depths) || times.length !== depths.length) {
      return res.status(502).json({ error: 'Invalid snow depth data from provider' });
    }

    // Group by local date and take daily max snow depth (meters -> cm)
    const daily: Record<string, number> = {};
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const vRaw = Number(depths[i] || 0);
      const vCm = Math.max(0, Math.round(vRaw * toCm));
      // Open-Meteo returns time array in requested timezone ('auto'), safe to slice date
      const dateKey = typeof t === 'string' ? t.slice(0, 10) : (new Date(t)).toISOString().slice(0, 10);
      daily[dateKey] = Math.max(daily[dateKey] ?? 0, vCm);
    }

    const series = Object.keys(daily).sort().map(k => ({ date: k, snowDepthCmMax: daily[k] }));

    // Sum only positive day-to-day increases as on-ground accumulation last N days
    let accumulationOnGround = 0;
    for (let i = 1; i < series.length; i++) {
      const inc = series[i].snowDepthCmMax - series[i - 1].snowDepthCmMax;
      if (inc > 0) accumulationOnGround += inc;
    }

    const currentDepthCm = series.length > 0 ? series[series.length - 1].snowDepthCmMax : 0;

    // Fallback: if Open-Meteo returned no useful snow depth data, use snowfall_history
    let finalSeries = series;
    let finalAccum = accumulationOnGround;
    if (accumulationOnGround === 0) {
      try {
        const tz = resort.timezone || 'America/Argentina/Buenos_Aires';
        const histRes = await pool.query(
          `SELECT to_char(date, 'YYYY-MM-DD') AS date_key, snowfall_cm
           FROM snowfall_history
           WHERE resort_id = $1
             AND elevation_band = $2
             AND date >= (date_trunc('day', NOW() AT TIME ZONE '${tz}') - ($3 || ' days')::interval)::date
             AND date < (date_trunc('day', NOW() AT TIME ZONE '${tz}'))::date
           ORDER BY date ASC`,
          [resort.id, elevationBand, days]
        );
        if (histRes.rows.length > 0) {
          const cap = elevationBand === 'base' ? 30 : elevationBand === 'mid' ? 40 : 50;
          finalSeries = histRes.rows.map(r => ({
            date: r.date_key,
            snowDepthCmMax: Math.min(cap, Math.max(0, Number(r.snowfall_cm || 0)))
          }));
          finalAccum = finalSeries.reduce((s, r) => s + r.snowDepthCmMax, 0);
        }
      } catch (histErr) {
        console.warn('[snow-depth-series] snowfall_history fallback failed:', histErr);
      }
    }

    res.json({
      resort: { id: resort.id, name: resort.name, slug: resort.slug },
      elevation: elevationBand,
      days: finalSeries,
      currentDepthCm,
      accumulationOnGround7d: finalAccum
    });
  } catch (error) {
    console.error('Error fetching snow depth series:', error);
    res.status(500).json({ error: 'Failed to fetch snow depth series' });
  }
});

export default router;
