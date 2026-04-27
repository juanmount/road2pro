/**
 * Snapshot API Routes
 * Endpoints for forecast snapshots and validation
 */

import { Router } from 'express';
import { snapshotService } from '../services/snapshot-service';
import { triggerSnapshotManually } from '../jobs/daily-snapshot';

const router = Router();

/**
 * POST /api/snapshots/trigger
 * Manually trigger snapshot creation (for testing)
 */
router.post('/trigger', async (req, res) => {
  try {
    const snapshots = await triggerSnapshotManually();
    res.json({
      success: true,
      count: snapshots.length,
      snapshots,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/snapshots/:resortId/:date
 * Get snapshot for a specific resort and date
 */
router.get('/:resortId/:date', async (req, res) => {
  try {
    const { resortId, date } = req.params;
    const forecastDate = new Date(date);
    
    const snapshot = await snapshotService.getSnapshot(resortId, forecastDate);
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot not found',
      });
    }
    
    res.json({
      success: true,
      snapshot,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/snapshots/validate
 * Create a validation event (compare forecast vs actual)
 */
router.post('/validate', async (req, res) => {
  try {
    const {
      resortId,
      eventDate,
      observed,
      observationType,
      observationSource,
      notes,
    } = req.body;
    
    const validation = await snapshotService.createValidation(
      resortId,
      new Date(eventDate),
      observed,
      observationType,
      observationSource,
      notes
    );
    
    res.json({
      success: true,
      validation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/snapshots/metrics/:resortId
 * Get accuracy metrics for a resort
 */
router.get('/metrics/:resortId', async (req, res) => {
  try {
    const { resortId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }
    
    const metrics = await snapshotService.calculateMetrics(
      resortId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
