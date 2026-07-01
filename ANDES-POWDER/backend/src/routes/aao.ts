import { Router, Request, Response } from 'express';
import { aaoService } from '../services/aao-service';

const router = Router();

router.get('/current', async (req: Request, res: Response) => {
  try {
    const data = await aaoService.getCurrentAAOData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching AAO data:', error);
    res.status(500).json({ error: 'Failed to fetch AAO data' });
  }
});

export default router;
