import { Router } from 'express';
import { tuyaWeatherService } from '../services/tuya-weather-service';

const router = Router();

/**
 * GET /api/weather-station/current
 * Get current weather conditions from Tuya weather station
 */
router.get('/current', async (req, res) => {
  try {
    console.log('[WEATHER-STATION] Fetching current conditions...');
    
    const weatherData = await tuyaWeatherService.getCurrentWeather();
    
    // Add location info
    const response = {
      ...weatherData,
      location: 'Cerro Catedral Base',
      elevation: 1030,
      station_id: process.env.TUYA_DEVICE_ID,
    };
    
    res.json(response);
  } catch (error) {
    console.error('[WEATHER-STATION] Error fetching current conditions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather station data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/weather-station/status
 * Check if weather station is online and responding
 */
router.get('/status', async (req, res) => {
  try {
    const isOnline = await tuyaWeatherService.testConnection();
    
    res.json({
      online: isOnline,
      station_id: process.env.TUYA_DEVICE_ID,
      location: 'Cerro Catedral Base',
      last_check: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      online: false,
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
