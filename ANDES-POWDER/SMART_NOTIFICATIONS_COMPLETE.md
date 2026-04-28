# 🔔 Sistema de Notificaciones Inteligentes - COMPLETO

## 📋 Resumen

Sistema completo de notificaciones push personalizadas para Andes Powder que permite a los usuarios configurar alertas inteligentes basadas en sus preferencias individuales.

---

## 🎯 Características Principales

### **No Invasivo**
- Solo notificaciones relevantes según preferencias del usuario
- Respeta horarios de silencio (quiet hours)
- Filtrado por cerros favoritos o todos
- Umbrales personalizables

### **Inteligente**
- Análisis de pronósticos 7 días adelante
- Filtrado por confianza del pronóstico
- Ventana de anticipación configurable (1-7 días)
- Evita spam: solo alertas significativas

### **Personalizable**
- Umbrales de nieve (5-30 cm)
- Umbrales de viento (50-100 km/h)
- Días de anticipación (1-7 días)
- Horarios de silencio
- Cerros favoritos

---

## 📱 Frontend (Mobile)

### **Pantalla de Configuración**
**Archivo:** `/mobile/app/(tabs)/notifications-settings.tsx`

**Componentes:**
- ✅ Toggles para tipos de alertas (nieve, tormenta, viento)
- ✅ Sliders para umbrales personalizables
- ✅ Configuración de horarios de silencio
- ✅ Selector de cerros (todos o favoritos)
- ✅ Verificación de permisos
- ✅ Guardado local + sincronización con backend

**Preferencias Disponibles:**
```typescript
{
  // Tipos de alertas
  snowAlerts: boolean
  stormAlerts: boolean
  windAlerts: boolean
  
  // Umbrales de nieve
  minSnowfallCm: number (5-30)
  requireHighConfidence: boolean
  
  // Umbrales de viento
  minWindSpeedKmh: number (50-100)
  
  // Cerros
  favoriteResorts: string[]
  allResorts: boolean
  
  // Timing
  advanceNoticeDays: number (1-7)
  quietHoursEnabled: boolean
  quietHoursStart: string ("22:00")
  quietHoursEnd: string ("08:00")
}
```

### **Servicio de Notificaciones**
**Archivo:** `/mobile/services/notifications.ts`

**Funciones:**
- `getPreferences()` - Cargar preferencias desde AsyncStorage
- `savePreferences()` - Guardar local + sync backend
- `registerForPushNotifications()` - Obtener token de Expo
- `updatePreferences()` - Actualizar en backend

**Valores por Defecto:**
- Min snowfall: 10 cm
- Min wind speed: 70 km/h
- Advance notice: 3 días
- All resorts: true
- Quiet hours: disabled

---

## 🖥️ Backend

### **1. Base de Datos**

**Migración:** `/backend/migrations/add_notification_preferences.sql`

**Nuevas Columnas en `user_preferences`:**
```sql
snow_alerts BOOLEAN DEFAULT true
storm_alerts BOOLEAN DEFAULT true
wind_alerts BOOLEAN DEFAULT true
min_snowfall_cm INTEGER DEFAULT 10
require_high_confidence BOOLEAN DEFAULT false
min_wind_speed_kmh INTEGER DEFAULT 70
favorite_resorts TEXT[] DEFAULT '{}'
all_resorts BOOLEAN DEFAULT true
advance_notice_days INTEGER DEFAULT 3
quiet_hours_enabled BOOLEAN DEFAULT false
quiet_hours_start TIME DEFAULT '22:00'
quiet_hours_end TIME DEFAULT '08:00'
```

### **2. Servicio de Notificaciones Inteligentes**

**Archivo:** `/backend/src/services/smart-notification-service.ts`

**Funciones Principales:**

#### `scanAndNotify()`
Escanea pronósticos y envía notificaciones inteligentes
- Busca pronósticos significativos (próximos 7 días)
- Filtra por preferencias de cada usuario
- Envía notificaciones en bulk

#### `shouldSendSnowAlert(forecast, preferences)`
Determina si enviar alerta de nieve
- ✅ Alertas de nieve activadas
- ✅ No en horario de silencio
- ✅ Dentro de ventana de anticipación
- ✅ Cerro en lista de favoritos (o all_resorts)
- ✅ Supera umbral mínimo de cm
- ✅ Cumple requisito de confianza (si activado)

#### `shouldSendWindAlert(forecast, preferences)`
Determina si enviar alerta de viento
- ✅ Alertas de viento activadas
- ✅ No en horario de silencio
- ✅ Dentro de ventana de anticipación
- ✅ Cerro en lista de favoritos (o all_resorts)
- ✅ Supera umbral mínimo de km/h

#### `isQuietHours(preferences)`
Verifica si está en horario de silencio
- Soporta horarios overnight (ej: 22:00 - 08:00)
- Respeta zona horaria local

**Consulta de Pronósticos:**
```sql
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
```

### **3. Servicio de Push Notifications**

**Archivo:** `/backend/src/services/push-notification-service.ts`

**Nueva Función:** `sendBulkNotifications()`
- Envía múltiples notificaciones con mensajes diferentes
- Usa chunking de Expo (max 100 por request)
- Manejo de errores por chunk

**Formato de Notificación:**
```typescript
{
  token: string
  title: string  // "❄️ 15cm en Cerro Catedral"
  body: string   // "Nevada importante pronosticada para mañana"
  data: {
    type: 'snow_alert' | 'wind_alert'
    resortId: string
    snowfall?: number
    windSpeed?: number
    validTime: string
  }
}
```

### **4. API Endpoints**

**Archivo:** `/backend/src/routes/push.ts`

#### `PUT /api/push/preferences`
Actualiza preferencias de notificaciones
```json
{
  "token": "ExponentPushToken[...]",
  "preferences": {
    "snowAlerts": true,
    "minSnowfallCm": 15,
    "requireHighConfidence": true,
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

#### `POST /api/admin/scan-notifications`
Trigger manual para testing
```json
{
  "success": true,
  "message": "Notification scan completed"
}
```

### **5. Cron Job**

**Archivo:** `/backend/src/jobs/notification-scanner.ts`

**Schedule:**
- 🌅 **8:00 AM** - Escaneo matutino
- 🌆 **6:00 PM** - Escaneo vespertino

**Formato Cron:**
```javascript
cron.schedule('0 8 * * *', async () => {
  await smartNotificationService.scanAndNotify();
});

cron.schedule('0 18 * * *', async () => {
  await smartNotificationService.scanAndNotify();
});
```

**Integración en Server:**
```typescript
// /backend/src/index.ts
import { startNotificationScanner } from './jobs/notification-scanner';

app.listen(PORT, () => {
  startNotificationScanner();
  console.log('🔔 Smart notification scanner initialized');
});
```

---

## 🔄 Flujo Completo

### **1. Usuario Configura Preferencias**
```
Usuario abre app → Notifications Settings
  ↓
Ajusta sliders y toggles
  ↓
Presiona "Guardar Configuración"
  ↓
Frontend: AsyncStorage.setItem()
  ↓
Frontend: notificationService.updatePreferences()
  ↓
Backend: PUT /api/push/preferences
  ↓
Backend: INSERT/UPDATE user_preferences table
```

### **2. Sistema Escanea Pronósticos**
```
Cron ejecuta a las 8:00 AM / 6:00 PM
  ↓
smartNotificationService.scanAndNotify()
  ↓
Query: elevation_forecasts (próximos 7 días)
  ↓
Para cada usuario con push token:
  ↓
  Para cada pronóstico significativo:
    ↓
    shouldSendSnowAlert() / shouldSendWindAlert()
      ↓
      ✅ Checks: quiet hours, advance window, resort filter, thresholds, confidence
      ↓
      Si pasa todos los checks → agregar a lista de notificaciones
  ↓
pushNotificationService.sendBulkNotifications()
  ↓
Expo Push API → Dispositivos de usuarios
```

### **3. Usuario Recibe Notificación**
```
Dispositivo recibe push de Expo
  ↓
Sistema muestra notificación:
  Title: "❄️ 15cm en Cerro Catedral"
  Body: "Nevada importante pronosticada para mañana"
  ↓
Usuario toca notificación
  ↓
App abre en pantalla del cerro específico
```

---

## 🧪 Testing

### **1. Testing Manual de Preferencias**
```bash
# En mobile simulator
1. Abrir app → Tab "Notifications Settings"
2. Ajustar preferencias
3. Guardar
4. Verificar en backend:
   SELECT * FROM user_preferences WHERE user_id = '...';
```

### **2. Testing de Escaneo**
```bash
# Trigger manual desde terminal
curl -X POST http://localhost:3000/api/admin/scan-notifications

# Verificar logs
[SMART NOTIFICATIONS] Scanning forecasts for alerts...
[SMART NOTIFICATIONS] Sent 5 snow alerts
[SMART NOTIFICATIONS] Sent 2 wind alerts
[SMART NOTIFICATIONS] Scan complete
```

### **3. Testing de Notificaciones**
```bash
# Verificar que hay pronósticos significativos
curl http://localhost:3000/api/admin/debug-forecasts

# Verificar preferencias de usuario
SELECT * FROM user_preferences;

# Verificar tokens activos
SELECT * FROM push_tokens WHERE active = true;

# Trigger manual
curl -X POST http://localhost:3000/api/admin/scan-notifications

# Verificar dispositivo recibe notificación
```

---

## 📊 Métricas y Monitoreo

### **Logs Importantes**
```
[SMART NOTIFICATIONS] Scanning forecasts for alerts...
[SMART NOTIFICATIONS] Sent 12 snow alerts
[SMART NOTIFICATIONS] Sent 3 wind alerts
[SMART NOTIFICATIONS] Scan complete

[PUSH] Sent 15 bulk notifications
[PUSH] Error sending chunk: ...
```

### **Queries de Monitoreo**
```sql
-- Usuarios con notificaciones activadas
SELECT COUNT(*) FROM user_preferences 
WHERE snow_alerts = true OR wind_alerts = true;

-- Tokens activos
SELECT COUNT(*) FROM push_tokens 
WHERE updated_at > NOW() - INTERVAL '30 days';

-- Pronósticos significativos próximos
SELECT COUNT(*) FROM elevation_forecasts
WHERE valid_time >= NOW()
  AND valid_time <= NOW() + INTERVAL '7 days'
  AND (snowfall_cm >= 10 OR wind_speed_kmh >= 70);
```

---

## 🚀 Deployment

### **1. Migración de Base de Datos**
```bash
cd backend
psql $DATABASE_URL < migrations/add_notification_preferences.sql
```

### **2. Instalar Dependencias**
```bash
# Backend
cd backend
npm install node-cron
npm install --save-dev @types/node-cron

# Mobile
cd mobile
npm install @react-native-community/slider
```

### **3. Variables de Entorno**
```env
# Backend ya tiene configurado Expo Push
EXPO_ACCESS_TOKEN=your_token_here
```

### **4. Deploy Backend**
```bash
git push railway main
# O tu plataforma de deploy
```

### **5. Deploy Mobile**
```bash
cd mobile
eas build --platform all
eas submit --platform all
```

---

## 🎨 UI/UX Highlights

### **Pantalla de Configuración**
- ✨ Diseño moderno con Ionicons
- 🎚️ Sliders interactivos con valores en tiempo real
- 🔵 Color scheme consistente (#0ea5e9)
- 📱 Responsive y touch-friendly
- ✅ Feedback visual al guardar
- 🔒 Verificación de permisos clara

### **Notificaciones**
- ❄️ Emojis contextuales (❄️ nieve, 💨 viento)
- 📍 Nombre del cerro en título
- 📅 Timing claro ("hoy", "mañana", "en 3 días")
- 🎯 Deep linking al cerro específico

---

## 🔐 Seguridad y Privacidad

- ✅ Tokens encriptados en tránsito (HTTPS)
- ✅ Preferencias almacenadas por usuario
- ✅ No se comparten datos entre usuarios
- ✅ Usuario controla completamente sus notificaciones
- ✅ Puede desactivar en cualquier momento
- ✅ Respeta permisos del sistema operativo

---

## 📈 Próximas Mejoras

### **Fase 2 (Futuro)**
- [ ] Notificaciones de powder alerts (score alto)
- [ ] Alertas de apertura/cierre de medios
- [ ] Notificaciones de webcam (nieve fresca visible)
- [ ] Alertas de cambios drásticos en pronóstico
- [ ] Notificaciones de eventos especiales
- [ ] Analytics de engagement con notificaciones
- [ ] A/B testing de mensajes
- [ ] Notificaciones rich con imágenes

### **Optimizaciones**
- [ ] Caché de preferencias en memoria
- [ ] Rate limiting por usuario
- [ ] Deduplicación de notificaciones similares
- [ ] Batching más inteligente
- [ ] Retry logic para fallos

---

## 📝 Notas Técnicas

### **Expo Push Notifications**
- Max 100 notificaciones por request
- Rate limit: 600 requests/min
- Token expiration: manejado automáticamente
- Delivery: best-effort (no garantizado)

### **Cron Schedule**
- Timezone: Server timezone (UTC o local)
- Execution: Asíncrono, no bloquea server
- Error handling: Logs pero no crash server

### **Database Performance**
- Índices en `user_preferences` para queries rápidas
- Índices en `elevation_forecasts` para escaneo eficiente
- Queries optimizadas con JOINs apropiados

---

## ✅ Checklist de Implementación

- [x] Frontend: Pantalla de configuración
- [x] Frontend: Servicio de notificaciones
- [x] Frontend: Integración con AsyncStorage
- [x] Backend: Migración de base de datos
- [x] Backend: Servicio de notificaciones inteligentes
- [x] Backend: Endpoint de preferencias
- [x] Backend: Bulk notification sending
- [x] Backend: Cron job scheduler
- [x] Backend: Admin endpoint para testing
- [x] Integración: Server startup
- [x] Documentación completa

---

## 🎉 Resultado Final

Sistema completo de notificaciones push personalizadas que:
- ✅ Respeta las preferencias del usuario
- ✅ No es invasivo ni spammy
- ✅ Envía solo alertas relevantes
- ✅ Funciona automáticamente 2x al día
- ✅ Es escalable y eficiente
- ✅ Tiene UI moderna y profesional
- ✅ Está listo para producción

**El usuario tiene control total sobre qué, cuándo y cómo recibe notificaciones.**
