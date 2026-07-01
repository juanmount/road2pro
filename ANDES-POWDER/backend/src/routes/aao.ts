import { Router, Request, Response } from 'express';
import { getSAMData } from '../services/sam-service';

const router = Router();

router.get('/current', async (req: Request, res: Response) => {
  try {
    const data = await getSAMData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching SAM/AAO data:', error);
    res.status(500).json({ error: 'Failed to fetch SAM data' });
  }
});

export default router;
