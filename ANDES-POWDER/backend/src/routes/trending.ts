import { Router, Request, Response } from 'express';

const router = Router();

router.all('*', async (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Trending is temporarily disabled',
  });
});

export default router;
