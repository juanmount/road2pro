import { Router, Request, Response } from 'express';
import { ENSOService } from '../services/enso-service';

const router = Router();
const ensoService = new ENSOService();

// GET /api/enso/current - Get current ENSO status
router.get('/current', async (req: Request, res: Response) => {
  try {
    const ensoData = await ensoService.getCurrentENSOData();
    res.json(ensoData);
  } catch (error) {
    console.error('Error fetching ENSO data:', error);
    res.status(500).json({ error: 'Failed to fetch ENSO data' });
  }
});

export default router;
