/**
 * Visibility Engine
 * Calculates mountain visibility based on cloud layers and weather conditions
 */

export interface VisibilityConditions {
  visibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'whiteout';
  visibilityMeters: number;
  inCloud: boolean;
  cloudBaseMeters: number | null;
  seaOfClouds: boolean; // Summit above clouds, base/mid in clouds
  description: string;
}

export class VisibilityEngine {
  /**
   * Calculate visibility for a specific elevation
   */
  calculateVisibility(
    elevationMeters: number,
    cloudCoverLow: number,      // % (0-100) - clouds 0-2000m
    cloudCoverMid: number,      // % (0-100) - clouds 2000-6000m
    cloudCoverHigh: number,     // % (0-100) - clouds 6000m+
    precipitationMm: number,
    humidity: number,
    temperature: number
  ): VisibilityConditions {
    
    // 1. Determine cloud cover at this elevation
    const cloudCoverAtElevation = this.getCloudCoverAtElevation(
      elevationMeters,
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh
    );
    
    // 2. Calculate cloud base height
    const cloudBase = this.estimateCloudBase(
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh,
      temperature,
      humidity
    );
    
    // 3. Apply weather penalties
    let visibilityPenalty = 0;
    
    // Precipitation reduces visibility
    if (precipitationMm > 0) {
      visibilityPenalty += Math.min(precipitationMm * 15, 40);
    }
    
    // High humidity + clouds = fog/mist
    if (humidity > 90 && cloudCoverAtElevation > 60) {
      visibilityPenalty += 25;
    }
    
    // Snow reduces visibility more than rain
    if (temperature < 0 && precipitationMm > 0) {
      visibilityPenalty += 15; // Heavy snow = poor visibility
    }
    
    // 4. Calculate effective cloud cover
    const effectiveCloudCover = Math.min(100, cloudCoverAtElevation + visibilityPenalty);
    
    // 5. Determine if in cloud
    const inCloud = cloudBase !== null && elevationMeters >= cloudBase && cloudCoverAtElevation > 70;
    
    // 6. Classify visibility
    const { visibility, visibilityMeters, description } = this.classifyVisibility(
      effectiveCloudCover,
      inCloud,
      precipitationMm
    );
    
    // 7. Check for sea of clouds (summit above, base/mid below)
    const seaOfClouds = false; // Will be determined at resort level
    
    return {
      visibility,
      visibilityMeters,
      inCloud,
      cloudBaseMeters: cloudBase,
      seaOfClouds,
      description
    };
  }
  
  /**
   * Calculate visibility for all elevation bands and detect sea of clouds
   */
  calculateResortVisibility(
    baseElevation: number,
    midElevation: number,
    summitElevation: number,
    cloudCoverLow: number,
    cloudCoverMid: number,
    cloudCoverHigh: number,
    precipitationMm: number,
    humidity: number,
    temperature: number
  ): {
    base: VisibilityConditions;
    mid: VisibilityConditions;
    summit: VisibilityConditions;
    seaOfClouds: boolean;
    alert: boolean;
    alertMessage?: string;
  } {
    
    const base = this.calculateVisibility(
      baseElevation,
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh,
      precipitationMm,
      humidity,
      temperature
    );
    
    const mid = this.calculateVisibility(
      midElevation,
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh,
      precipitationMm,
      humidity,
      temperature
    );
    
    const summit = this.calculateVisibility(
      summitElevation,
      cloudCoverLow,
      cloudCoverMid,
      cloudCoverHigh,
      precipitationMm,
      humidity,
      temperature - 3.5 // Summit is ~3.5°C colder
    );
    
    // Detect sea of clouds: summit clear, lower elevations in cloud
    const seaOfClouds = (base.inCloud || mid.inCloud) && !summit.inCloud && summit.visibility === 'excellent';
    
    // Update sea of clouds flag
    base.seaOfClouds = seaOfClouds;
    mid.seaOfClouds = seaOfClouds;
    summit.seaOfClouds = seaOfClouds;
    
    // Generate alerts
    let alert = false;
    let alertMessage: string | undefined;
    
    if (summit.visibility === 'whiteout' || summit.visibility === 'poor') {
      alert = true;
      alertMessage = `⚠️ Visibilidad ${summit.visibility === 'whiteout' ? 'CRÍTICA' : 'REDUCIDA'} en summit (${summit.visibilityMeters}m)`;
    }
    
    if (seaOfClouds) {
      alertMessage = `🌊 Mar de nubes - Summit despejado, base/mid en nubes`;
    }
    
    return {
      base,
      mid,
      summit,
      seaOfClouds,
      alert,
      alertMessage
    };
  }
  
  /**
   * Get cloud cover at specific elevation
   */
  private getCloudCoverAtElevation(
    elevation: number,
    cloudCoverLow: number,
    cloudCoverMid: number,
    cloudCoverHigh: number
  ): number {
    
    if (elevation < 2000) {
      // Below 2000m: mostly affected by low clouds
      return cloudCoverLow;
    } else if (elevation < 3000) {
      // 2000-3000m: transition zone, take maximum of low and mid
      const weight = (elevation - 2000) / 1000; // 0 to 1
      return cloudCoverLow * (1 - weight) + cloudCoverMid * weight;
    } else if (elevation < 6000) {
      // 3000-6000m: mid-level clouds
      return cloudCoverMid;
    } else {
      // Above 6000m: high clouds
      return cloudCoverHigh;
    }
  }
  
  /**
   * Estimate cloud base height from cloud layers and conditions
   */
  private estimateCloudBase(
    cloudCoverLow: number,
    cloudCoverMid: number,
    cloudCoverHigh: number,
    temperature: number,
    humidity: number
  ): number | null {
    
    // If significant low clouds, base is low
    if (cloudCoverLow > 50) {
      // Use dew point spread to estimate cloud base
      // Rough approximation: cloud base = 125 * (T - Td) meters
      // Assuming Td ≈ T - (100 - humidity) / 5
      const dewPointSpread = (100 - humidity) / 5;
      const cloudBase = Math.max(0, 125 * dewPointSpread);
      return cloudBase;
    }
    
    // If mid-level clouds dominate
    if (cloudCoverMid > 50) {
      return 2500; // Typical mid-level cloud base
    }
    
    // If only high clouds
    if (cloudCoverHigh > 50) {
      return 6000; // High clouds don't affect mountain visibility
    }
    
    // Clear or scattered
    return null;
  }
  
  /**
   * Classify visibility into categories
   */
  private classifyVisibility(
    effectiveCloudCover: number,
    inCloud: boolean,
    precipitation: number
  ): {
    visibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'whiteout';
    visibilityMeters: number;
    description: string;
  } {
    
    // Whiteout conditions: in cloud + precipitation
    if (inCloud && precipitation > 0.5) {
      return {
        visibility: 'whiteout',
        visibilityMeters: 50,
        description: 'Condiciones de whiteout - extrema precaución'
      };
    }
    
    // Poor: heavy cloud cover or in cloud
    if (effectiveCloudCover >= 85 || inCloud) {
      return {
        visibility: 'poor',
        visibilityMeters: 200,
        description: 'Visibilidad muy limitada'
      };
    }
    
    // Moderate: significant clouds
    if (effectiveCloudCover >= 60) {
      return {
        visibility: 'moderate',
        visibilityMeters: 1000,
        description: 'Visibilidad moderada'
      };
    }
    
    // Good: some clouds
    if (effectiveCloudCover >= 30) {
      return {
        visibility: 'good',
        visibilityMeters: 5000,
        description: 'Buena visibilidad'
      };
    }
    
    // Excellent: clear
    return {
      visibility: 'excellent',
      visibilityMeters: 10000,
      description: 'Visibilidad excelente'
    };
  }
}

export const visibilityEngine = new VisibilityEngine();
