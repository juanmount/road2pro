import { Router } from 'express';
import { validationService } from '../services/validation-service';

const router = Router();

/**
 * GET /api/validation/statistics
 * Get validation statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { resortId, periodStart, periodEnd } = req.query;
    
    const startDate = periodStart ? new Date(periodStart as string) : undefined;
    const endDate = periodEnd ? new Date(periodEnd as string) : undefined;
    
    const stats = await validationService.getStatistics(
      resortId as string | undefined,
      startDate,
      endDate
    );
    
    res.json(stats);
  } catch (error) {
    console.error('[VALIDATION API] Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch validation statistics' });
  }
});

/**
 * POST /api/validation/compare
 * Manually trigger forecast comparison
 */
router.post('/compare', async (req, res) => {
  try {
    await validationService.runWeeklyComparison();
    res.json({ success: true, message: 'Forecast comparison completed' });
  } catch (error) {
    console.error('[VALIDATION API] Error running comparison:', error);
    res.status(500).json({ error: 'Failed to run forecast comparison' });
  }
});

/**
 * POST /api/validation/:id/validate
 * Validate a forecast comparison with actual results
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = req.body;
    
    const success = await validationService.validateComparison(id, validation);
    
    if (success) {
      res.json({ success: true, message: 'Validation completed' });
    } else {
      res.status(400).json({ error: 'Failed to validate comparison' });
    }
  } catch (error) {
    console.error('[VALIDATION API] Error validating comparison:', error);
    res.status(500).json({ error: 'Failed to validate comparison' });
  }
});

export default router;
