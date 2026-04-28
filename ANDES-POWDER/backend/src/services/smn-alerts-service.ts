/**
 * SMN (Servicio Meteorológico Nacional) Alerts Service
 * Fetches weather alerts for Argentina regions
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { pushNotificationService } from './push-notification-service';

interface SMNAlert {
  id: string;
  zone: string;
  phenomenon: string;
  severity: 'green' | 'yellow' | 'orange' | 'red';
  startDate: Date;
  endDate: Date;
  description: string;
  regions: string[];
}

interface ProcessedAlert {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  type: 'wind' | 'rain' | 'snow' | 'storm' | 'other';
  startDate: Date;
  endDate: Date;
  description: string;
  affectedRegions: string[];
  isActive: boolean;
}

class SMNAlertsService {
  // SMN doesn't have a stable public API - using mock for now
  // TODO: Implement web scraping or find official API
  private readonly SMN_ALERTS_URL = 'https://www.smn.gob.ar/alertas';
  private alertsCache: ProcessedAlert[] = [];
  private lastFetch: Date | null = null;
  private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Get active alerts for a specific region
   */
  async getAlertsForRegion(region: string): Promise<ProcessedAlert[]> {
    await this.refreshAlertsIfNeeded();
    
    const now = new Date();
    return this.alertsCache.filter(alert => 
      alert.isActive &&
      alert.affectedRegions.some(r => r.toLowerCase().includes(region.toLowerCase())) &&
      alert.startDate <= now &&
      alert.endDate >= now
    );
  }

  /**
   * Get all active alerts
   */
  async getAllActiveAlerts(): Promise<ProcessedAlert[]> {
    await this.refreshAlertsIfNeeded();
    
    const now = new Date();
    const future = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Next 48 hours
    return this.alertsCache.filter(alert =>
      alert.isActive &&
      alert.startDate <= future && // Alert starts within next 48 hours
      alert.endDate >= now // Alert hasn't ended yet
    );
  }

  /**
   * Force refresh alerts from SMN
   * Uses multiple sources: SMN API endpoints and manual alerts
   */
  async refreshAlerts(): Promise<void> {
    try {
      console.log('Fetching alerts from SMN...');
      const alerts: ProcessedAlert[] = [];
      
      // Try multiple SMN and government data endpoints
      const endpoints = [
        // Official SMN endpoints
        'https://ws.smn.gob.ar/alerts/type/AL',
        'https://ws.smn.gob.ar/v1/alertas',
        'https://api.smn.gob.ar/v1/alertas',
        // Argentina open data portal
        'https://datos.gob.ar/api/3/action/package_show?id=alertas-meteorologicos',
        // SMN RSS/XML feeds (converted to JSON)
        'https://www.smn.gob.ar/rss/alertas.xml',
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: 10000,
            headers: {
              'User-Agent': 'AndesPowder/1.0',
              'Accept': 'application/json, application/xml, text/xml',
            },
          });
          
          // Handle XML/RSS feeds
          if (endpoint.includes('.xml') && typeof response.data === 'string') {
            const $ = cheerio.load(response.data, { xmlMode: true });
            
            $('item').each((i, elem) => {
              const $item = $(elem);
              const title = $item.find('title').text().trim();
              const description = $item.find('description').text().trim();
              const pubDate = $item.find('pubDate').text().trim();
              
              if (title && description) {
                // Extract type and severity from title/description
                const text = (title + ' ' + description).toLowerCase();
                let type: ProcessedAlert['type'] = 'other';
                let severity: ProcessedAlert['severity'] = 'moderate';
                
                if (text.includes('viento') || text.includes('wind')) type = 'wind';
                else if (text.includes('lluv') || text.includes('rain')) type = 'rain';
                else if (text.includes('niev') || text.includes('snow')) type = 'snow';
                else if (text.includes('tormenta') || text.includes('storm')) type = 'storm';
                
                if (text.includes('roj') || text.includes('extreme')) severity = 'extreme';
                else if (text.includes('naran') || text.includes('orange')) severity = 'high';
                else if (text.includes('amarill') || text.includes('yellow')) severity = 'moderate';
                
                // Extract regions from description
                const regions: string[] = [];
                const patagoniaKeywords = ['bariloche', 'neuqu', 'patagonia', 'río negro', 'rio negro', 'cordillera'];
                patagoniaKeywords.forEach(keyword => {
                  if (text.includes(keyword)) {
                    regions.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
                  }
                });
                
                alerts.push({
                  id: `smn-rss-${Date.now()}-${i}`,
                  title,
                  severity,
                  type,
                  startDate: pubDate ? new Date(pubDate) : new Date(),
                  endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
                  description,
                  affectedRegions: regions.length > 0 ? regions : ['Argentina'],
                  isActive: true,
                });
              }
            });
            
            if (alerts.length > 0) {
              console.log(`✓ Found ${alerts.length} alerts from RSS feed`);
              break;
            }
          }
          // Handle JSON responses
          else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            console.log(`✓ Found ${response.data.length} alerts from ${endpoint}`);
            
            response.data.forEach((alert: any, i: number) => {
              const processed = this.processAlert(alert);
              if (processed) {
                alerts.push(processed);
              }
            });
            
            break; // Stop if we found alerts
          }
        } catch (err: any) {
          console.log(`  ✗ ${endpoint}: ${err.message}`);
          // Try next endpoint
          continue;
        }
      }
      
      // Sync wind alerts from our own forecast data
      // Generate alerts for summit elevation only (most critical)
      await this.syncWindAlertsFromForecasts();
      
      // Merge with existing manual alerts (don't remove them)
      const manualAlerts = this.alertsCache.filter(a => a.id.startsWith('manual-'));
      const windAlerts = this.alertsCache.filter(a => a.id.startsWith('wind-'));
      this.alertsCache = [...alerts, ...windAlerts, ...manualAlerts];
      
      this.lastFetch = new Date();
      console.log(`✓ Total active alerts: ${this.alertsCache.length} (${alerts.length} from SMN, ${manualAlerts.length} manual)`);
      
    } catch (error: any) {
      console.error('Error fetching SMN alerts:', error.message);
      console.log('💡 Tip: Use POST /api/alerts/manual to create alerts manually');
      // Keep existing cache on error
    }
  }
  
  /**
   * Manually add an alert (for admin use)
   */
  async addManualAlert(alert: Omit<ProcessedAlert, 'id'>): Promise<ProcessedAlert> {
    const newAlert: ProcessedAlert = {
      ...alert,
      id: `manual-${Date.now()}`,
    };
    
    this.alertsCache.push(newAlert);
    console.log(`✓ Added manual alert: ${newAlert.title}`);
    
    // Send push notification to affected users
    try {
      await pushNotificationService.sendAlertNotification(
        newAlert.title,
        newAlert.description,
        newAlert.affectedRegions,
        newAlert.id,
        newAlert.severity
      );
      console.log(`✓ Push notifications sent for alert: ${newAlert.title}`);
    } catch (error) {
      console.error('Error sending push notifications for alert:', error);
      // Don't fail alert creation if push fails
    }
    
    return newAlert;
  }
  
  /**
   * Sync wind alerts from forecast data
   */
  async syncWindAlertsFromForecasts(): Promise<void> {
    try {
      const pool = (await import('../config/database')).default;
      
      // Get wind impact forecasts for next 48 hours (SUMMIT ONLY - most critical)
      const result = await pool.query(`
        SELECT 
          resort_id,
          elevation_band,
          valid_time,
          wind_speed_kmh,
          wind_gust_kmh,
          wind_impact
        FROM elevation_forecasts
        WHERE valid_time >= NOW()
          AND valid_time <= NOW() + INTERVAL '48 hours'
          AND elevation_band = 'summit'
          AND (wind_speed_kmh >= 50 OR wind_gust_kmh >= 70)
        ORDER BY resort_id, valid_time
      `);
      
      if (result.rows.length === 0) {
        return; // No wind alerts
      }
      
      // Group by resort and date
      const alertsByResort = new Map<string, any[]>();
      result.rows.forEach(row => {
        const key = row.resort_id;
        if (!alertsByResort.has(key)) {
          alertsByResort.set(key, []);
        }
        alertsByResort.get(key)!.push(row);
      });
      
      // Create alerts for each resort
      const windAlerts: ProcessedAlert[] = [];
      
      for (const [resortId, forecasts] of alertsByResort) {
        const maxWind = Math.max(...forecasts.map(f => f.wind_speed_kmh || 0));
        const maxGust = Math.max(...forecasts.map(f => f.wind_gust_kmh || 0));
        
        const severity: ProcessedAlert['severity'] = 
          maxWind >= 70 || maxGust >= 100 ? 'extreme' :
          maxWind >= 60 || maxGust >= 85 ? 'high' : 'moderate';
        
        const startDate = new Date(forecasts[0].valid_time);
        const endDate = new Date(forecasts[forecasts.length - 1].valid_time);
        
        // Get resort name
        const resortResult = await pool.query('SELECT name FROM resorts WHERE id = $1', [resortId]);
        const resortName = resortResult.rows[0]?.name || resortId;
        
        windAlerts.push({
          id: `wind-${resortId}-${Date.now()}`,
          title: `Viento Fuerte - ${resortName}`,
          severity,
          type: 'wind',
          startDate,
          endDate,
          description: `Ráfagas: ${Math.round(maxGust)} km/h`,
          affectedRegions: [resortName, 'Patagonia'],
          isActive: true,
        });
      }
      
      // Remove old wind alerts and add new ones
      this.alertsCache = this.alertsCache.filter(a => !a.id.startsWith('wind-'));
      this.alertsCache.push(...windAlerts);
      
      if (windAlerts.length > 0) {
        console.log(`✓ Synced ${windAlerts.length} wind alerts from forecast data`);
      }
      
    } catch (error: any) {
      console.error('Error syncing wind alerts:', error.message);
    }
  }
  
  /**
   * Remove an alert by ID
   */
  async removeAlert(id: string): Promise<boolean> {
    const index = this.alertsCache.findIndex(a => a.id === id);
    if (index !== -1) {
      this.alertsCache.splice(index, 1);
      console.log(`✓ Removed alert: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Refresh alerts if cache is stale
   */
  private async refreshAlertsIfNeeded(): Promise<void> {
    if (!this.lastFetch || Date.now() - this.lastFetch.getTime() > this.CACHE_DURATION_MS) {
      await this.refreshAlerts();
    }
  }

  /**
   * Process raw SMN alert into our format
   */
  private processAlert(raw: any): ProcessedAlert | null {
    try {
      // Extract severity
      const severity = this.mapSeverity(raw.nivel || raw.severity);
      
      // Extract type from phenomenon
      const type = this.extractAlertType(raw.fenomeno || raw.phenomenon || '');
      
      // Extract regions
      const regions = this.extractRegions(raw);
      
      // Parse dates
      const startDate = new Date(raw.inicio || raw.start);
      const endDate = new Date(raw.fin || raw.end);
      
      return {
        id: raw.id || `${raw.zona}-${startDate.getTime()}`,
        title: this.generateTitle(type, severity),
        severity,
        type,
        startDate,
        endDate,
        description: raw.descripcion || raw.description || '',
        affectedRegions: regions,
        isActive: true,
      };
    } catch (error) {
      console.error('Error processing alert:', error);
      return null;
    }
  }

  /**
   * Map SMN severity to our format
   */
  private mapSeverity(smnSeverity: string): ProcessedAlert['severity'] {
    const severity = (smnSeverity || '').toLowerCase();
    
    if (severity.includes('roj') || severity.includes('red')) return 'extreme';
    if (severity.includes('naran') || severity.includes('orange')) return 'high';
    if (severity.includes('amarill') || severity.includes('yellow')) return 'moderate';
    return 'low';
  }

  /**
   * Extract alert type from phenomenon description
   */
  private extractAlertType(phenomenon: string): ProcessedAlert['type'] {
    const p = phenomenon.toLowerCase();
    
    if (p.includes('viento') || p.includes('wind')) return 'wind';
    if (p.includes('lluv') || p.includes('rain') || p.includes('precipit')) return 'rain';
    if (p.includes('niev') || p.includes('snow')) return 'snow';
    if (p.includes('tormenta') || p.includes('storm')) return 'storm';
    
    return 'other';
  }

  /**
   * Extract affected regions from alert
   */
  private extractRegions(raw: any): string[] {
    const regions: string[] = [];
    
    // Try different field names
    if (raw.zona) regions.push(raw.zona);
    if (raw.zone) regions.push(raw.zone);
    if (raw.localidad) regions.push(raw.localidad);
    if (raw.locality) regions.push(raw.locality);
    
    // Try to extract from description
    if (raw.descripcion || raw.description) {
      const desc = raw.descripcion || raw.description;
      
      // Common Patagonia regions
      const patagoniaRegions = [
        'Bariloche', 'San Carlos de Bariloche',
        'Neuquén', 'Neuquen',
        'Río Negro', 'Rio Negro',
        'Patagonia',
        'Cordillera',
        'Andes',
      ];
      
      patagoniaRegions.forEach(region => {
        if (desc.includes(region) && !regions.includes(region)) {
          regions.push(region);
        }
      });
    }
    
    return regions.length > 0 ? regions : ['Argentina'];
  }

  /**
   * Generate alert title
   */
  private generateTitle(type: ProcessedAlert['type'], severity: ProcessedAlert['severity']): string {
    const typeLabels = {
      wind: 'Viento Fuerte',
      rain: 'Lluvias Intensas',
      snow: 'Nevadas',
      storm: 'Tormenta',
      other: 'Alerta Meteorológica',
    };
    
    const severityLabels = {
      low: '',
      moderate: 'Moderado',
      high: 'Importante',
      extreme: 'Extremo',
    };
    
    const typeLabel = typeLabels[type];
    const severityLabel = severityLabels[severity];
    
    return severityLabel ? `${typeLabel} - ${severityLabel}` : typeLabel;
  }
}

export const smnAlertsService = new SMNAlertsService();
