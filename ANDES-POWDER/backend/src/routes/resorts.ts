import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { Resort, CurrentConditions, ElevationConditions } from '../types';
import { SnowEngine } from '../engine/snow-engine';
import { MultiModelFetcher } from '../providers/open-meteo/multi-model-fetcher';

const router = Router();

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
        powder_score
       FROM elevation_forecasts 
       WHERE resort_id = $1::uuid 
       AND valid_time >= NOW() 
       ORDER BY elevation_band, valid_time 
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
    const hoursLimit = parseInt(hours as string);

    const result = await pool.query(
      `SELECT 
        valid_time,
        temperature_c,
        precipitation_mm,
        snowfall_cm_corrected,
        wind_speed_kmh,
        wind_gust_kmh,
        wind_direction,
        cloud_cover,
        cloud_cover_low,
        cloud_cover_mid,
        cloud_cover_high,
        powder_score,
        freezing_level_m,
        phase_classification,
        visibility,
        visibility_meters,
        in_cloud,
        cloud_base_meters
      FROM elevation_forecasts
      WHERE resort_id = $1::uuid
      AND elevation_band = $2
      AND valid_time >= NOW()
      AND forecast_run_id = (
        SELECT id FROM forecast_runs 
        WHERE resort_id = $1::uuid 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      ORDER BY valid_time
      LIMIT $3`,
      [resort.id, elevationBand, hoursLimit]
    );

    const hourlyForecasts = result.rows.map((row: any) => ({
      time: row.valid_time, // PostgreSQL returns this in UTC, but it's stored with -03 offset
      temperature: parseFloat(row.temperature_c),
      precipitation: parseFloat(row.precipitation_mm || 0),
      windSpeed: parseFloat(row.wind_speed_kmh || 0),
      windGust: parseFloat(row.wind_gust_kmh || 0),
      windDirection: row.wind_direction || 0,
      humidity: 70,
      cloudCover: parseFloat(row.cloud_cover || 0),
      cloudCoverLow: row.cloud_cover_low ? parseFloat(row.cloud_cover_low) : undefined,
      cloudCoverMid: row.cloud_cover_mid ? parseFloat(row.cloud_cover_mid) : undefined,
      cloudCoverHigh: row.cloud_cover_high ? parseFloat(row.cloud_cover_high) : undefined,
      phase: row.phase_classification || 'none', // Use DB phase classification
      powderScore: parseFloat(row.powder_score || 0),
      snowfall: parseFloat(row.snowfall_cm_corrected || 0),
      freezingLevel: row.freezing_level_m ? parseInt(row.freezing_level_m) : 2000,
      visibility: row.visibility || undefined,
      visibilityMeters: row.visibility_meters ? parseInt(row.visibility_meters) : undefined,
      inCloud: row.in_cloud || false,
      cloudBaseMeters: row.cloud_base_meters ? parseInt(row.cloud_base_meters) : undefined,
    }));

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

router.get('/:id/forecast/daily', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { elevation = 'mid', days = '7' } = req.query;
    const elevationBand = elevation as string;
    const daysLimit = parseInt(days as string);

    // Import pool dynamically like the working debug endpoint
    const dbPool = (await import('../config/database')).default;

    const result = await dbPool.query(
      `SELECT 
        valid_time::date as date,
        MAX(temperature_c) as max_temp,
        MIN(temperature_c) as min_temp,
        SUM(snowfall_cm_corrected) as total_snowfall,
        SUM(precipitation_mm) as total_precipitation,
        AVG(powder_score) as avg_powder_score,
        MAX(wind_speed_kmh) as max_wind_speed,
        AVG(cloud_cover) as avg_cloud_cover
      FROM elevation_forecasts
      WHERE resort_id IN (SELECT id FROM resorts WHERE slug = $1)
      AND elevation_band = $2
      AND valid_time >= NOW()
      GROUP BY valid_time::date
      ORDER BY date
      LIMIT $3`,
      [id, elevationBand, daysLimit]
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

export default router;
