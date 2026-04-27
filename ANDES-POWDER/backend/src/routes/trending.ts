import { Router, Request, Response } from 'express';
import { forecastTrendingService } from '../services/forecast-trending-service';

const router = Router();

/**
 * GET /api/trending/:resortId
 * Get forecast trending data for a resort
 */
router.get('/:resortId', async (req: Request, res: Response) => {
  try {
    const { resortId } = req.params;
    const { elevation = 'mid', days = '7' } = req.query;

    const trending = await forecastTrendingService.getTrending(
      resortId,
      elevation as string,
      parseInt(days as string)
    );

    res.json({
      success: true,
      resortId,
      elevation,
      trending
    });
  } catch (error: any) {
    console.error('Error getting trending data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending/snapshot/:resortId
 * Manually trigger snapshot save for a resort
 */
router.post('/snapshot/:resortId', async (req: Request, res: Response) => {
  try {
    const { resortId } = req.params;

    await forecastTrendingService.saveDailySnapshot(resortId);

    res.json({
      success: true,
      message: `Snapshot saved for resort ${resortId}`
    });
  } catch (error: any) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending/snapshot-all
 * Save snapshots for all resorts (admin only)
 */
router.post('/snapshot-all', async (req: Request, res: Response) => {
  try {
    await forecastTrendingService.saveAllResortsSnapshots();

    res.json({
      success: true,
      message: 'Snapshots saved for all resorts'
    });
  } catch (error: any) {
    console.error('Error saving all snapshots:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
