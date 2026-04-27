/**
 * SMN Alerts API Routes
 */

import { Router } from 'express';
import { smnAlertsService } from '../services/smn-alerts-service';

const router = Router();

/**
 * GET /api/alerts
 * Get all active alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await smnAlertsService.getAllActiveAlerts();
    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts/region/:region
 * Get alerts for a specific region
 */
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const alerts = await smnAlertsService.getAlertsForRegion(region);
    
    res.json({
      success: true,
      region,
      count: alerts.length,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/alerts/refresh
 * Force refresh alerts from SMN
 */
router.post('/refresh', async (req, res) => {
  try {
    await smnAlertsService.refreshAlerts();
    const alerts = await smnAlertsService.getAllActiveAlerts();
    
    res.json({
      success: true,
      message: 'Alerts refreshed successfully',
      count: alerts.length,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/alerts/manual
 * Manually create an alert
 */
router.post('/manual', async (req, res) => {
  try {
    const { title, severity, type, startDate, endDate, description, affectedRegions } = req.body;
    
    if (!title || !severity || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, severity, type, startDate, endDate',
      });
    }
    
    const alert = await smnAlertsService.addManualAlert({
      title,
      severity,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || '',
      affectedRegions: affectedRegions || ['Patagonia'],
      isActive: true,
    });
    
    res.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/alerts/:id
 * Remove an alert
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await smnAlertsService.removeAlert(id);
    
    if (removed) {
      res.json({
        success: true,
        message: 'Alert removed successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
