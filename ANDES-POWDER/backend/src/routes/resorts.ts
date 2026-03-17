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
        timestamp,
        temperature,
        precipitation,
        precipitation_type,
        snow_depth,
        wind_speed,
        wind_direction,
        cloud_cover,
        powder_score
       FROM hourly_forecasts 
       WHERE resort_id = $1 
       AND timestamp >= NOW() 
       ORDER BY elevation_band, timestamp 
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

    // Get model agreement for confidence
    const agreementResult = await pool.query(
      `SELECT confidence_score, confidence_reason 
       FROM model_agreements 
       WHERE resort_id = $1 
       AND valid_time >= NOW() 
       ORDER BY valid_time 
       LIMIT 1`,
      [resort.id]
    );

    const confidence = agreementResult.rows[0];

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
    const { elevation = 'mid', hours = '168' } = req.query; // Default to 7 days (168 hours)

    const resortResult = await pool.query(
      'SELECT * FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resort = resortResult.rows[0];
    const elevationBand = elevation as string;
    const hoursLimit = parseInt(hours as string);

    // Get hourly forecasts from hourly_forecasts table
    // Include last 120 hours (5 days) for historical tracking + future hours
    const result = await pool.query(
      `SELECT 
        timestamp,
        temperature,
        precipitation,
        precipitation_type,
        snow_depth,
        wind_speed,
        wind_direction,
        cloud_cover,
        powder_score,
        freezing_level
      FROM hourly_forecasts
      WHERE resort_id = $1
      AND elevation_band = $2
      AND timestamp >= NOW() - INTERVAL '120 hours'
      ORDER BY timestamp
      LIMIT $3`,
      [resort.id, elevationBand, hoursLimit + 120]
    );

    // Map to response format
    const hourlyForecasts = result.rows.map((row: any) => ({
      time: row.timestamp,
      temperature: parseFloat(row.temperature),
      precipitation: parseFloat(row.precipitation || 0),
      windSpeed: parseFloat(row.wind_speed || 0),
      windDirection: row.wind_direction || 0,
      humidity: 70, // Not stored in hourly_forecasts, use default
      cloudCover: parseFloat(row.cloud_cover || 0),
      phase: row.precipitation_type || 'none',
      powderScore: parseFloat(row.powder_score || 0),
      snowfall: parseFloat(row.snow_depth || 0),
      freezingLevel: row.freezing_level ? parseInt(row.freezing_level) : null,
    }));

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
    console.error('Error fetching hourly forecast:', error);
    res.status(500).json({ error: 'Failed to fetch hourly forecast' });
  }
});

router.get('/:id/forecast/daily', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { elevation = 'mid', days = '7' } = req.query;

    const resortResult = await pool.query(
      'SELECT id FROM resorts WHERE slug = $1 OR id::text = $1',
      [id]
    );

    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const resortId = resortResult.rows[0].id;

    const snapshotResult = await pool.query(
      `SELECT id FROM forecast_snapshots 
       WHERE resort_id = $1 
       ORDER BY fetched_at DESC 
       LIMIT 1`,
      [resortId]
    );

    if (snapshotResult.rows.length === 0) {
      return res.status(404).json({ error: 'No forecast data available' });
    }

    const snapshotId = snapshotResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM daily_forecasts 
       WHERE snapshot_id = $1 
       AND elevation_band = $2 
       AND date >= CURRENT_DATE 
       ORDER BY date 
       LIMIT $3`,
      [snapshotId, elevation, parseInt(days as string)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
    res.status(500).json({ error: 'Failed to fetch daily forecast' });
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
      GROUP BY valid_time::date
      ORDER BY date
      LIMIT $3`,
      [id, elevationBand, daysLimit]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No forecast data available' });
    }

    const dailyForecasts = result.rows.map((row: any) => ({
      date: row.date,
      maxTemp: parseFloat(row.max_temp),
      minTemp: parseFloat(row.min_temp),
      snowfall: parseFloat(row.total_snowfall || 0),
      precipitation: parseFloat(row.total_precipitation || 0),
      powderScore: parseFloat(row.avg_powder_score || 0),
      maxWindSpeed: parseFloat(row.max_wind_speed || 0),
      cloudCover: parseFloat(row.avg_cloud_cover || 0),
    }));

    res.json(dailyForecasts);
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
    res.status(500).json({ error: 'Failed to fetch daily forecast' });
  }
});

export default router;
