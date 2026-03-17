/**
 * Observations API Routes
 * Allows external systems (resort apps, weather stations) to submit observations
 */

import { Router, Request, Response } from 'express';
import { observationService } from '../services/observation-service';

const router = Router();

/**
 * POST /api/observations
 * Record a new observation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { resortSlug, temperature, elevation, source } = req.body;
    
    if (!resortSlug || temperature === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: resortSlug, temperature' 
      });
    }
    
    const elevationBand = elevation || 'base';
    const observationSource = source || 'api';
    
    await observationService.recordCurrentConditions(
      resortSlug,
      elevationBand === 'base' ? temperature : undefined,
      elevationBand === 'mid' ? temperature : undefined,
      elevationBand === 'summit' ? temperature : undefined
    );
    
    res.json({ 
      success: true, 
      message: 'Observation recorded and correction profile updated' 
    });
  } catch (error) {
    console.error('Error recording observation:', error);
    res.status(500).json({ error: 'Failed to record observation' });
  }
});

/**
 * GET /api/observations/:resortSlug/bias
 * Get current learned biases for a resort
 */
router.get('/:resortSlug/bias', async (req: Request, res: Response) => {
  try {
    const { resortSlug } = req.params;
    
    // Get resort ID
    const pool = require('../config/database').default;
    const resortResult = await pool.query(
      'SELECT id FROM resorts WHERE slug = $1',
      [resortSlug]
    );
    
    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    
    const resortId = resortResult.rows[0].id;
    
    // Calculate biases
    const baseBias = await observationService.calculateTemperatureBias(resortId, 'base');
    const midBias = await observationService.calculateTemperatureBias(resortId, 'mid');
    const summitBias = await observationService.calculateTemperatureBias(resortId, 'summit');
    
    res.json({
      resort: resortSlug,
      biases: {
        base: baseBias,
        mid: midBias,
        summit: summitBias
      },
      unit: '°C',
      description: 'Average difference between observed and forecasted temperatures (last 7 days)'
    });
  } catch (error) {
    console.error('Error getting bias:', error);
    res.status(500).json({ error: 'Failed to get bias' });
  }
});

/**
 * GET /api/observations/:resortSlug/recent
 * Get recent observations for a resort
 */
router.get('/:resortSlug/recent', async (req: Request, res: Response) => {
  try {
    const { resortSlug } = req.params;
    const { limit = 20 } = req.query;
    
    const pool = require('../config/database').default;
    
    // Get resort ID
    const resortResult = await pool.query(
      'SELECT id FROM resorts WHERE slug = $1',
      [resortSlug]
    );
    
    if (resortResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }
    
    const resortId = resortResult.rows[0].id;
    
    // Get recent observations
    const obsResult = await pool.query(
      `SELECT observation_type, value_numeric, unit, elevation_band, 
              observed_at, source, reliability
       FROM observations
       WHERE resort_id = $1
       ORDER BY observed_at DESC
       LIMIT $2`,
      [resortId, limit]
    );
    
    res.json({
      resort: resortSlug,
      observations: obsResult.rows.map((row: any) => ({
        type: row.observation_type,
        value: parseFloat(row.value_numeric),
        unit: row.unit,
        elevation: row.elevation_band,
        time: row.observed_at,
        source: row.source,
        reliability: row.reliability
      }))
    });
  } catch (error) {
    console.error('Error getting observations:', error);
    res.status(500).json({ error: 'Failed to get observations' });
  }
});

export default router;
