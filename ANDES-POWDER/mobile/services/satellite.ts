/**
 * GOES-16 Satellite Imagery Service
 * Free satellite images from NOAA covering South America
 * Updates every 10-15 minutes
 */

export interface SatelliteImage {
  url: string;
  timestamp: Date;
  type: 'geocolor' | 'infrared' | 'visible' | 'water_vapor';
  region: 'south_america' | 'southern_cone';
}

// GOES-16 (GOES-East) covers South America
// Images are publicly available from NOAA
const GOES16_BASE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI';

/**
 * Get latest GEOCOLOR satellite image
 * Shows true color during day, enhanced infrared at night
 * Best for general weather visualization
 */
export const getGeoColorImage = async (): Promise<SatelliteImage> => {
  // South America sector
  const url = `${GOES16_BASE_URL}/SECTOR/ssa/GEOCOLOR/latest.jpg`;
  
  return {
    url,
    timestamp: new Date(),
    type: 'geocolor',
    region: 'south_america',
  };
};

/**
 * Get infrared satellite image
 * Shows cloud top temperatures (useful for storm intensity)
 * Works day and night
 */
export const getInfraredImage = async (): Promise<SatelliteImage> => {
  const url = `${GOES16_BASE_URL}/SECTOR/ssa/13/latest.jpg`;
  
  return {
    url,
    timestamp: new Date(),
    type: 'infrared',
    region: 'south_america',
  };
};

/**
 * Get water vapor satellite image
 * Shows moisture in upper atmosphere
 * Useful for tracking storms approaching from Pacific
 */
export const getWaterVaporImage = async (): Promise<SatelliteImage> => {
  const url = `${GOES16_BASE_URL}/SECTOR/ssa/08/latest.jpg`;
  
  return {
    url,
    timestamp: new Date(),
    type: 'water_vapor',
    region: 'south_america',
  };
};

/**
 * Get Southern Cone focused image
 * Zoomed into Argentina/Chile region
 */
export const getSouthernConeImage = async (): Promise<SatelliteImage> => {
  // Using custom coordinates for better Patagonia view
  // Note: NOAA doesn't have a pre-defined Southern Cone sector
  // We use South America sector which includes the region
  const url = `${GOES16_BASE_URL}/SECTOR/ssa/GEOCOLOR/latest.jpg`;
  
  return {
    url,
    timestamp: new Date(),
    type: 'geocolor',
    region: 'southern_cone',
  };
};

/**
 * Get animation frames for last 3 hours
 * Returns array of image URLs
 */
export const getAnimationFrames = async (
  type: 'geocolor' | 'infrared' = 'geocolor',
  hours: number = 3
): Promise<string[]> => {
  // GOES-16 archives images every 10 minutes
  // For 3 hours = 18 frames
  const frames: string[] = [];
  const now = new Date();
  
  // Generate URLs for last N hours (10 min intervals)
  for (let i = 0; i < hours * 6; i++) {
    const time = new Date(now.getTime() - i * 10 * 60 * 1000);
    const year = time.getUTCFullYear();
    const day = String(time.getUTCDate()).padStart(3, '0');
    const hour = String(time.getUTCHours()).padStart(2, '0');
    const minute = String(Math.floor(time.getUTCMinutes() / 10) * 10).padStart(2, '0');
    
    const channel = type === 'infrared' ? '13' : 'GEOCOLOR';
    const url = `${GOES16_BASE_URL}/SECTOR/ssa/${channel}/${year}${day}${hour}${minute}_GOES16-ABI-ssa-${channel}-1000x1000.jpg`;
    
    frames.push(url);
  }
  
  return frames;
};

/**
 * Check if satellite image is available
 * Sometimes NOAA servers have delays
 */
export const checkImageAvailability = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('[Satellite] Error checking image availability:', error);
    return false;
  }
};

export default {
  getGeoColorImage,
  getInfraredImage,
  getWaterVaporImage,
  getSouthernConeImage,
  getAnimationFrames,
  checkImageAvailability,
};
