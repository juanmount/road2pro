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

type AlertType = 'snow' | 'wind' | 'storm' | 'snow5d' | 'snow36h';

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
   * Check if user should receive storm crossing alert based on preferences
   */
  private shouldSendStormAlert(forecast: ForecastData, prefs: UserPreferences): boolean {
    if (!prefs.stormAlerts) return false;
    if (this.isQuietHours(prefs)) return false;
    if (!this.isWithinAdvanceNotice(forecast.validTime, prefs.advanceNoticeDays)) return false;
    if (!prefs.allResorts && !prefs.favoriteResorts.includes(forecast.resortId)) return false;
    // Storm crossing: significant snowfall (>=15cm) combined with strong wind (>=40 km/h)
    // This indicates a high-probability storm system crossing the Andes
    return forecast.snowfallCm >= 15 && forecast.windSpeedKmh >= 40;
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
        pt.user_id as user_id,
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
      FROM push_tokens pt
      LEFT JOIN user_preferences up ON pt.user_id = up.user_id
      WHERE pt.updated_at > NOW() - INTERVAL '30 days'
    `);

    return result.rows.map((row: any) => {
      // Normalize favorite_resorts to string[]
      let fav: any = row.favorite_resorts;
      let favoriteResorts: string[] = [];
      if (Array.isArray(fav)) {
        favoriteResorts = fav.filter((v) => typeof v === 'string');
      } else if (typeof fav === 'string') {
        const s = fav.trim();
        if (s.startsWith('{') && s.endsWith('}')) {
          // Postgres text[] literal: {a,b,c}
          const inner = s.slice(1, -1);
          favoriteResorts = inner ? inner.split(',').map((x) => x.replace(/^"|"$/g, '').trim()).filter(Boolean) : [];
        } else if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
          try {
            const parsed = JSON.parse(s.startsWith('"') ? JSON.parse(s) : s);
            if (Array.isArray(parsed)) favoriteResorts = parsed.filter((v) => typeof v === 'string');
          } catch {
            favoriteResorts = [];
          }
        }
      }

      return {
        userId: row.user_id,
        pushToken: row.push_token,
        snowAlerts: row.snow_alerts,
        stormAlerts: row.storm_alerts,
        windAlerts: row.wind_alerts,
        minSnowfallCm: row.min_snowfall_cm,
        requireHighConfidence: row.require_high_confidence,
        minWindSpeedKmh: row.min_wind_speed_kmh,
        favoriteResorts,
        allResorts: row.all_resorts,
        advanceNoticeDays: row.advance_notice_days,
        quietHoursEnabled: row.quiet_hours_enabled,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
      } as UserPreferences;
    });
  }

  /**
   * Ensure notification_log table exists (production safety net if migrations didn't run)
   */
  private async ensureNotificationLogExists(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_log (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          resort_id TEXT NOT NULL,
          alert_type TEXT NOT NULL CHECK (alert_type IN ('snow','wind','storm','snow5d','snow36h')),
          sent_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      // Ensure CHECK constraint allows accumulation variants
      await pool.query(`
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE notification_log DROP CONSTRAINT IF EXISTS notification_log_alert_type_check;
          EXCEPTION WHEN undefined_object THEN
            NULL;
          END;
          ALTER TABLE notification_log
            ADD CONSTRAINT notification_log_alert_type_check
            CHECK (alert_type IN ('snow','wind','storm','snow5d','snow36h'));
        END$$;
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_log_lookup
          ON notification_log (user_id, resort_id, alert_type, sent_at);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
          ON notification_log (sent_at);
      `);
    } catch (e) {
      console.warn('[SMART NOTIFICATIONS] Could not ensure notification_log table exists:', e);
    }
  }

  /**
   * Check if a notification was already sent within a configurable window (deduplication)
   */
  private async wasRecentlySentWithin(userId: string, resortId: string, alertType: AlertType, hours: number): Promise<boolean> {
    const intervalHours = Math.max(1, Math.floor(hours));
    const result = await pool.query(
      `SELECT 1 FROM notification_log
       WHERE user_id = $1 AND resort_id = $2 AND alert_type = $3
         AND sent_at > NOW() - INTERVAL '${intervalHours} hours'
       LIMIT 1`,
      [userId, resortId, alertType]
    );
    return result.rows.length > 0;
  }

  /**
   * Log sent notifications for deduplication
   */
  private async logSentNotifications(
    entries: Array<{ userId: string; resortId: string; alertType: AlertType }>
  ): Promise<void> {
    if (entries.length === 0) return;
    const values = entries.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
    const params = entries.flatMap(e => [e.userId, e.resortId, e.alertType]);
    await pool.query(
      `INSERT INTO notification_log (user_id, resort_id, alert_type) VALUES ${values}`,
      params
    );
    // Clean entries older than 48h
    await pool.query(`DELETE FROM notification_log WHERE sent_at < NOW() - INTERVAL '48 hours'`);
  }

  /**
   * Send accumulation-based snow alerts for a given time window (e.g., 120h or 36h)
   * Uses the same user threshold (minSnowfallCm) and respects quiet hours and resort filters.
   */
  private async sendAccumulationAlertsByWindow(
    forecasts: ForecastData[],
    hoursWindow: number,
    alertType: AlertType
  ): Promise<void> {
    try {
      const users = await this.getUsersWithPreferences();
      const tokensToSend: Array<{ token: string; title: string; body: string; data: any }> = [];
      const logEntries: Array<{ userId: string; resortId: string; alertType: AlertType }> = [];

      const now = Date.now();
      const windowEnd = now + hoursWindow * 60 * 60 * 1000;

      // Group forecasts by resort
      const byResort = new Map<string, { name: string; points: ForecastData[] }>();
      for (const f of forecasts) {
        let bucket = byResort.get(f.resortId);
        if (!bucket) {
          bucket = { name: f.resortName, points: [] };
          byResort.set(f.resortId, bucket);
        }
        bucket.points.push(f);
      }

      // Compute sums and peak time per resort for the window
      const resortWindows = new Map<string, { name: string; sumCm: number; peakTime?: Date }>();
      for (const [resortId, bucket] of byResort.entries()) {
        const windowPoints = bucket.points.filter(p => p.validTime.getTime() >= now && p.validTime.getTime() <= windowEnd);
        if (windowPoints.length === 0) continue;
        const sumCm = windowPoints.reduce((acc, p) => acc + (Number(p.snowfallCm) || 0), 0);
        let peakTime: Date | undefined = undefined;
        let peakVal = -1;
        for (const p of windowPoints) {
          const v = Number(p.snowfallCm) || 0;
          if (v > peakVal) {
            peakVal = v; peakTime = p.validTime;
          }
        }
        resortWindows.set(resortId, { name: bucket.name, sumCm, peakTime });
      }

      // Build notifications per user respecting preferences
      for (const user of users) {
        if (!user.snowAlerts) continue;
        if (this.isQuietHours(user)) continue;

        for (const [resortId, info] of resortWindows.entries()) {
          // Resort filter
          if (!user.allResorts && !user.favoriteResorts.includes(resortId)) continue;

          if ((info.sumCm || 0) < user.minSnowfallCm) continue;

          // Dedup windows: 12h for 5d, 6h for 36h
          const dedupHours = alertType === 'snow5d' ? 12 : 6;
          if (await this.wasRecentlySentWithin(user.userId, resortId, alertType, dedupHours)) continue;

          // Compose time text from peak time if available
          let timeText = '';
          if (info.peakTime) {
            const diffMs = info.peakTime.getTime() - now;
            const diffH = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
            if (diffH <= 24) timeText = 'hoy';
            else if (diffH <= 48) timeText = 'mañana';
            else timeText = `en ~${Math.ceil(diffH / 24)} días`;
          }

          const rounded = Math.max(0, Math.round(Number(info.sumCm) || 0));
          const title = alertType === 'snow5d'
            ? `❄️ Aviso: ${rounded} cm (5 días) — ${info.name}`
            : `❄️ Alerta: ${rounded} cm (36 h) — ${info.name}`;
          const body = alertType === 'snow5d'
            ? `Se esperan ${rounded} cm acumulados en los próximos 5 días. Pico: ${timeText || 'pronto'}`
            : `Se esperan ${rounded} cm en las próximas 36 h. Pico: ${timeText || 'pronto'}`;

          tokensToSend.push({
            token: user.pushToken,
            title,
            body,
            data: { type: alertType, resortId, sumCm: rounded, windowHours: hoursWindow, peakTime: info.peakTime?.toISOString() }
          });
          logEntries.push({ userId: user.userId, resortId, alertType });
        }
      }

      if (tokensToSend.length > 0) {
        await pushNotificationService.sendBulkNotifications(tokensToSend);
        await this.logSentNotifications(logEntries);
        console.log(`[SMART NOTIFICATIONS] Sent ${tokensToSend.length} ${alertType} alerts`);
      }
    } catch (error) {
      console.error(`[SMART NOTIFICATIONS] Error sending ${alertType} alerts:`, error);
    }
  }

  /**
   * Send smart snow alerts based on user preferences
   */
  async sendSnowAlerts(forecasts: ForecastData[]): Promise<void> {
    try {
      const users = await this.getUsersWithPreferences();
      const notifications: Array<{ token: string; title: string; body: string; data: any }> = [];
      const logEntries: Array<{ userId: string; resortId: string; alertType: 'snow' | 'wind' | 'storm' }> = [];

      for (const user of users) {
        for (const forecast of forecasts) {
          if (!this.shouldSendSnowAlert(forecast, user)) continue;
          if (await this.wasRecentlySentWithin(user.userId, forecast.resortId, 'snow', 12)) continue;

          const daysUntil = Math.ceil(
            (forecast.validTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const timeText = daysUntil === 0 ? 'hoy' :
                         daysUntil === 1 ? 'mañana' :
                         `en ${daysUntil} días`;

          notifications.push({
            token: user.pushToken,
            title: `❄️ ${forecast.snowfallCm} cm en ${forecast.resortName}`,
            body: `Nevada importante pronosticada para ${timeText}`,
            data: { type: 'snow_alert', resortId: forecast.resortId, snowfall: forecast.snowfallCm, validTime: forecast.validTime.toISOString() },
          });
          logEntries.push({ userId: user.userId, resortId: forecast.resortId, alertType: 'snow' });
        }
      }

      if (notifications.length > 0) {
        await pushNotificationService.sendBulkNotifications(notifications);
        await this.logSentNotifications(logEntries);
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
      const logEntries: Array<{ userId: string; resortId: string; alertType: 'snow' | 'wind' | 'storm' }> = [];

      for (const user of users) {
        for (const forecast of forecasts) {
          if (!this.shouldSendWindAlert(forecast, user)) continue;
          if (await this.wasRecentlySentWithin(user.userId, forecast.resortId, 'wind', 12)) continue;

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
            data: { type: 'wind_alert', resortId: forecast.resortId, windSpeed: forecast.windSpeedKmh, validTime: forecast.validTime.toISOString() },
          });
          logEntries.push({ userId: user.userId, resortId: forecast.resortId, alertType: 'wind' });
        }
      }

      if (notifications.length > 0) {
        await pushNotificationService.sendBulkNotifications(notifications);
        await this.logSentNotifications(logEntries);
        console.log(`[SMART NOTIFICATIONS] Sent ${notifications.length} wind alerts`);
      }
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error sending wind alerts:', error);
    }
  }

  /**
   * Send storm crossing alerts based on user preferences
   */
  async sendStormAlerts(forecasts: ForecastData[]): Promise<void> {
    try {
      const users = await this.getUsersWithPreferences();
      const notifications: Array<{ token: string; title: string; body: string; data: any }> = [];
      const logEntries: Array<{ userId: string; resortId: string; alertType: 'snow' | 'wind' | 'storm' }> = [];

      for (const user of users) {
        for (const forecast of forecasts) {
          if (!this.shouldSendStormAlert(forecast, user)) continue;
          if (await this.wasRecentlySentWithin(user.userId, forecast.resortId, 'storm', 12)) continue;

          const daysUntil = Math.ceil(
            (forecast.validTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const timeText = daysUntil === 0 ? 'hoy' :
                         daysUntil === 1 ? 'mañana' :
                         `en ${daysUntil} días`;

          notifications.push({
            token: user.pushToken,
            title: `⛈️ Tormenta cruzando en ${forecast.resortName}`,
            body: `Sistema con ${forecast.snowfallCm}cm y vientos de ${forecast.windSpeedKmh} km/h para ${timeText}`,
            data: { type: 'storm_crossing_alert', resortId: forecast.resortId, snowfall: forecast.snowfallCm, windSpeed: forecast.windSpeedKmh, validTime: forecast.validTime.toISOString() },
          });
          logEntries.push({ userId: user.userId, resortId: forecast.resortId, alertType: 'storm' });
        }
      }

      if (notifications.length > 0) {
        await pushNotificationService.sendBulkNotifications(notifications);
        await this.logSentNotifications(logEntries);
        console.log(`[SMART NOTIFICATIONS] Sent ${notifications.length} storm crossing alerts`);
      }
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error sending storm alerts:', error);
    }
  }

  /**
   * Scan forecasts and send relevant alerts
   */
  async scanAndNotify(): Promise<void> {
    try {
      console.log('[SMART NOTIFICATIONS] Scanning forecasts for alerts...');

      // Safety: ensure dedup table exists
      await this.ensureNotificationLogExists();

      // Get forecasts from next 7 days (all points; filters are applied per alert type downstream)
      // Prefer corrected snowfall column when available; fallback to legacy column.
      let forecastResult;
      try {
        forecastResult = await pool.query(`
          SELECT 
            r.id as resort_id,
            r.name as resort_name,
            ef.snowfall_cm_corrected as snowfall_cm,
            ef.wind_speed_kmh,
            ef.valid_time,
            ef.confidence_score
          FROM elevation_forecasts ef
          INNER JOIN resorts r ON ef.resort_id = r.id
          WHERE ef.valid_time >= NOW()
            AND ef.valid_time <= NOW() + INTERVAL '7 days'
            AND ef.elevation_band = 'summit'
            AND ef.forecast_run_id = (
              SELECT id FROM forecast_runs fr
              WHERE fr.resort_id = ef.resort_id
              ORDER BY fr.created_at DESC
              LIMIT 1
            )
          ORDER BY ef.valid_time
        `);
      } catch (err: any) {
        // Fallback for environments without the corrected column
        if (err?.code === '42703') {
          forecastResult = await pool.query(`
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
              AND ef.forecast_run_id = (
                SELECT id FROM forecast_runs fr
                WHERE fr.resort_id = ef.resort_id
                ORDER BY fr.created_at DESC
                LIMIT 1
              )
            ORDER BY ef.valid_time
          `);
        } else {
          throw err;
        }
      }

      const forecasts: ForecastData[] = forecastResult.rows.map((row: any) => ({
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

      // Send accumulation-based snow alerts (5 days and 36 hours) using the same user threshold
      if (forecasts.length > 0) {
        await this.sendAccumulationAlertsByWindow(forecasts, 120, 'snow5d');
        await this.sendAccumulationAlertsByWindow(forecasts, 36, 'snow36h');
      }

      // Send wind alerts
      const windForecasts = forecasts.filter(f => f.windSpeedKmh >= 50);
      if (windForecasts.length > 0) {
        await this.sendWindAlerts(windForecasts);
      }

      // Send storm crossing alerts (significant snow + wind combined)
      const stormForecasts = forecasts.filter(f => f.snowfallCm >= 15 && f.windSpeedKmh >= 40);
      if (stormForecasts.length > 0) {
        await this.sendStormAlerts(stormForecasts);
      }

      console.log('[SMART NOTIFICATIONS] Scan complete');
    } catch (error) {
      console.error('[SMART NOTIFICATIONS] Error scanning forecasts:', error);
    }
  }
}

export const smartNotificationService = new SmartNotificationService();
