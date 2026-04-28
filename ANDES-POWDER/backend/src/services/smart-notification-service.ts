import pool from '../config/database';
import { pushNotificationService } from './push-notification-service';

interface UserPreferences {
  userId: string;
  pushToken: string;
  snowAlerts: boolean;
  stormAlerts: boolean;
  windAlerts: boolean;
  minSnowfallCm: number;
  requireHighConfidence: boolean;
  minWindSpeedKmh: number;
  favoriteResorts: string[];
  allResorts: boolean;
  advanceNoticeDays: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface ForecastData {
  resortId: string;
  resortName: string;
  snowfallCm: number;
  windSpeedKmh: number;
  confidenceScore?: number;
  validTime: Date;
}

class SmartNotificationService {
  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(prefs: UserPreferences): boolean {
    if (!prefs.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    return currentTime >= start && currentTime <= end;
  }

  /**
   * Check if forecast is within advance notice window
   */
  private isWithinAdvanceNotice(validTime: Date, advanceNoticeDays: number): boolean {
    const now = new Date();
    const daysUntil = (validTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= advanceNoticeDays;
  }

  /**
   * Check if user should receive snow alert based on preferences
   */
  private shouldSendSnowAlert(forecast: ForecastData, prefs: UserPreferences): boolean {
    // Check if snow alerts are enabled
    if (!prefs.snowAlerts) return false;

    // Check quiet hours
    if (this.isQuietHours(prefs)) return false;

    // Check advance notice window
    if (!this.isWithinAdvanceNotice(forecast.validTime, prefs.advanceNoticeDays)) return false;

    // Check resort filter
    if (!prefs.allResorts && !prefs.favoriteResorts.includes(forecast.resortId)) return false;

    // Check minimum snowfall threshold
    if (forecast.snowfallCm < prefs.minSnowfallCm) return false;

    // Check confidence score if required
    if (prefs.requireHighConfidence && forecast.confidenceScore && forecast.confidenceScore < 0.7) {
      return false;
    }

    return true;
  }

  /**
   * Check if user should receive wind alert based on preferences
   */
  private shouldSendWindAlert(forecast: ForecastData, prefs: UserPreferences): boolean {
    // Check if wind alerts are enabled
    if (!prefs.windAlerts) return false;

    // Check quiet hours
    if (this.isQuietHours(prefs)) return false;

    // Check advance notice window
    if (!this.isWithinAdvanceNotice(forecast.validTime, prefs.advanceNoticeDays)) return false;

    // Check resort filter
    if (!prefs.allResorts && !prefs.favoriteResorts.includes(forecast.resortId)) return false;

    // Check minimum wind speed threshold
    if (forecast.windSpeedKmh < prefs.minWindSpeedKmh) return false;

    return true;
  }

  /**
   * Get all users with their notification preferences
   */
  private async getUsersWithPreferences(): Promise<UserPreferences[]> {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        pt.token as push_token,
        COALESCE(up.snow_alerts, true) as snow_alerts,
        COALESCE(up.storm_alerts, true) as storm_alerts,
        COALESCE(up.wind_alerts, true) as wind_alerts,
        COALESCE(up.min_snowfall_cm, 10) as min_snowfall_cm,
        COALESCE(up.require_high_confidence, false) as require_high_confidence,
        COALESCE(up.min_wind_speed_kmh, 70) as min_wind_speed_kmh,
        COALESCE(up.favorite_resorts, '{}') as favorite_resorts,
        COALESCE(up.all_resorts, true) as all_resorts,
        COALESCE(up.advance_notice_days, 3) as advance_notice_days,
        COALESCE(up.quiet_hours_enabled, false) as quiet_hours_enabled,
        COALESCE(up.quiet_hours_start::text, '22:00') as quiet_hours_start,
        COALESCE(up.quiet_hours_end::text, '08:00') as quiet_hours_end
      FROM users u
      INNER JOIN push_tokens pt ON u.id = pt.user_id
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE pt.active = true
    `);

    return result.rows.map(row => ({
      userId: row.user_id,
      pushToken: row.push_token,
      snowAlerts: row.snow_alerts,
      stormAlerts: row.storm_alerts,
      windAlerts: row.wind_alerts,
      minSnowfallCm: row.min_snowfall_cm,
      requireHighConfidence: row.require_high_confidence,
      minWindSpeedKmh: row.min_wind_speed_kmh,
      favoriteResorts: row.favorite_resorts,
      allResorts: row.all_resorts,
      advanceNoticeDays: row.advance_notice_days,
      quietHoursEnabled: row.quiet_hours_enabled,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
    }));
  }

  /**
   * Send smart snow alerts based on user preferences
   */
  async sendSnowAlerts(forecasts: ForecastData[]): Promise<void> {
    try {
      const users = await this.getUsersWithPreferences();
      const notifications: Array<{ token: string; title: string; body: string; data: any }> = [];

      for (const user of users) {
        for (const forecast of forecasts) {
          if (this.shouldSendSnowAlert(forecast, user)) {
            const daysUntil = Math.ceil(
              (forecast.validTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            
            const timeText = daysUntil === 0 ? 'hoy' : 
                           daysUntil === 1 ? 'mañana' : 
                           `en ${daysUntil} días`;

            notifications.push({
              token: user.pushToken,
              title: `❄️ ${forecast.snowfallCm}cm en ${forecast.resortName}`,
              body: `Nevada importante pronosticada para ${timeText}`,
              data: {
                type: 'snow_alert',
                resortId: forecast.resortId,
                snowfall: forecast.snowfallCm,
                validTime: forecast.validTime.toISOString(),
              },
            });
          }
        }
      }

      // Send notifications in batches
      if (notifications.length > 0) {
        await pushNotificationService.sendBulkNotifications(notifications);
        console.log(`[SMART NOTIFICATIONS] Sent ${notifications.length} snow alerts`);
      }
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error sending snow alerts:', error);
    }
  }

  /**
   * Send smart wind alerts based on user preferences
   */
  async sendWindAlerts(forecasts: ForecastData[]): Promise<void> {
    try {
      const users = await this.getUsersWithPreferences();
      const notifications: Array<{ token: string; title: string; body: string; data: any }> = [];

      for (const user of users) {
        for (const forecast of forecasts) {
          if (this.shouldSendWindAlert(forecast, user)) {
            const daysUntil = Math.ceil(
              (forecast.validTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            
            const timeText = daysUntil === 0 ? 'hoy' : 
                           daysUntil === 1 ? 'mañana' : 
                           `en ${daysUntil} días`;

            notifications.push({
              token: user.pushToken,
              title: `💨 Viento Fuerte en ${forecast.resortName}`,
              body: `Ráfagas de ${forecast.windSpeedKmh} km/h pronosticadas para ${timeText}`,
              data: {
                type: 'wind_alert',
                resortId: forecast.resortId,
                windSpeed: forecast.windSpeedKmh,
                validTime: forecast.validTime.toISOString(),
              },
            });
          }
        }
      }

      // Send notifications in batches
      if (notifications.length > 0) {
        await pushNotificationService.sendBulkNotifications(notifications);
        console.log(`[SMART NOTIFICATIONS] Sent ${notifications.length} wind alerts`);
      }
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error sending wind alerts:', error);
    }
  }

  /**
   * Scan forecasts and send relevant alerts
   */
  async scanAndNotify(): Promise<void> {
    try {
      console.log('[SMART NOTIFICATIONS] Scanning forecasts for alerts...');

      // Get significant forecasts from next 7 days
      const forecastResult = await pool.query(`
        SELECT 
          r.id as resort_id,
          r.name as resort_name,
          ef.snowfall_cm,
          ef.wind_speed_kmh,
          ef.valid_time,
          ef.confidence_score
        FROM elevation_forecasts ef
        INNER JOIN resorts r ON ef.resort_id = r.id
        WHERE ef.valid_time >= NOW()
          AND ef.valid_time <= NOW() + INTERVAL '7 days'
          AND ef.elevation_band = 'summit'
          AND (ef.snowfall_cm >= 5 OR ef.wind_speed_kmh >= 50)
        ORDER BY ef.valid_time
      `);

      const forecasts: ForecastData[] = forecastResult.rows.map(row => ({
        resortId: row.resort_id,
        resortName: row.resort_name,
        snowfallCm: row.snowfall_cm || 0,
        windSpeedKmh: row.wind_speed_kmh || 0,
        confidenceScore: row.confidence_score,
        validTime: new Date(row.valid_time),
      }));

      // Send snow alerts
      const snowForecasts = forecasts.filter(f => f.snowfallCm >= 5);
      if (snowForecasts.length > 0) {
        await this.sendSnowAlerts(snowForecasts);
      }

      // Send wind alerts
      const windForecasts = forecasts.filter(f => f.windSpeedKmh >= 50);
      if (windForecasts.length > 0) {
        await this.sendWindAlerts(windForecasts);
      }

      console.log('[SMART NOTIFICATIONS] Scan complete');
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error scanning forecasts:', error);
    }
  }
}

export const smartNotificationService = new SmartNotificationService();
