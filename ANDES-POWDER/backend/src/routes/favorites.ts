import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.*, ufr.created_at as favorited_at
       FROM user_favorite_resorts ufr
       JOIN resorts r ON ufr.resort_id = r.id
       WHERE ufr.user_id = $1
       ORDER BY ufr.created_at DESC`,
      [req.user!.userId]
    );

    const favorites = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      country: row.country,
      region: row.region,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      baseElevation: row.base_elevation,
      midElevation: row.mid_elevation,
      summitElevation: row.summit_elevation,
      favoritedAt: row.favorited_at,
    }));

    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

router.post('/:resortId', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { resortId } = req.params;

    const resortExists = await pool.query(
      'SELECT id FROM resorts WHERE id = $1',
      [resortId]
    );

    if (resortExists.rows.length === 0) {
      return res.status(404).json({ error: 'Resort not found' });
    }

    const existing = await pool.query(
      'SELECT id FROM user_favorite_resorts WHERE user_id = $1 AND resort_id = $2',
      [req.user!.userId, resortId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Resort already in favorites' });
    }

    await pool.query(
      'INSERT INTO user_favorite_resorts (user_id, resort_id) VALUES ($1, $2)',
      [req.user!.userId, resortId]
    );

    await pool.query(
      `INSERT INTO user_activity (user_id, activity_type, resort_id)
       VALUES ($1, 'favorite_added', $2)`,
      [req.user!.userId, resortId]
    );

    res.status(201).json({ message: 'Resort added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/:resortId', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { resortId } = req.params;

    const result = await pool.query(
      'DELETE FROM user_favorite_resorts WHERE user_id = $1 AND resort_id = $2 RETURNING id',
      [req.user!.userId, resortId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    await pool.query(
      `INSERT INTO user_activity (user_id, activity_type, resort_id)
       VALUES ($1, 'favorite_removed', $2)`,
      [req.user!.userId, resortId]
    );

    res.json({ message: 'Resort removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

router.get('/check/:resortId', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { resortId } = req.params;

    const result = await pool.query(
      'SELECT id FROM user_favorite_resorts WHERE user_id = $1 AND resort_id = $2',
      [req.user!.userId, resortId]
    );

    res.json({ isFavorite: result.rows.length > 0 });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

export default router;
