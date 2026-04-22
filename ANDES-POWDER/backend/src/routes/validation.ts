import { Router, Request, Response } from 'express';
import { validationService } from '../services/validation-service';

const router = Router();

/**
 * GET /api/validation/statistics
 * Get validation statistics for a resort
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { resortId, periodStart, periodEnd } = req.query;

    if (!resortId) {
      return res.status(400).json({ error: 'resortId is required' });
    }

    const stats = await validationService.getStatistics(
      resortId as string,
      periodStart as string | undefined,
      periodEnd as string | undefined
    );

    if (!stats) {
      return res.status(404).json({ error: 'No statistics found for this resort' });
    }

    res.json(stats);
  } catch (error) {
    console.error('[VALIDATION API] Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch validation statistics' });
  }
});

/**
 * POST /api/validation/compare
 * Trigger manual forecast comparison
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    console.log('[VALIDATION API] Triggering manual comparison...');
    
    // Run comparison asynchronously
    validationService.runWeeklyComparison().catch(err => {
      console.error('[VALIDATION API] Error in background comparison:', err);
    });

    res.json({ 
      message: 'Forecast comparison started',
      status: 'running'
    });
  } catch (error) {
    console.error('[VALIDATION API] Error starting comparison:', error);
    res.status(500).json({ error: 'Failed to start forecast comparison' });
  }
});

/**
 * POST /api/validation/:id/validate
 * Validate a comparison with actual conditions
 */
router.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      actual_snowfall_base,
      actual_snowfall_mid,
      actual_snowfall_summit,
      actual_wind,
      actual_temp,
      actual_source,
      actual_notes
    } = req.body;

    if (!actual_source) {
      return res.status(400).json({ error: 'actual_source is required' });
    }

    await validationService.validateComparison(id, {
      actual_snowfall_base,
      actual_snowfall_mid,
      actual_snowfall_summit,
      actual_wind,
      actual_temp,
      actual_source,
      actual_notes
    });

    res.json({ 
      message: 'Comparison validated successfully',
      comparison_id: id
    });
  } catch (error) {
    console.error('[VALIDATION API] Error validating comparison:', error);
    res.status(500).json({ error: 'Failed to validate comparison' });
  }
});

export default router;
