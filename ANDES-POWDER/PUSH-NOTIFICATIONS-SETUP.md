# 🔔 Push Notifications Setup Guide - Andes Powder

## ✅ Estado Actual

### Backend
- ✅ Smart Notification Service implementado
- ✅ Push Notification Service implementado
- ✅ Endpoints REST creados (`/api/push/*`)
- ✅ Cron jobs configurados (8:00 AM y 6:00 PM)
- ✅ Schema SQL creado

### Frontend (Mobile)
- ✅ Servicio de notificaciones con Expo Push Tokens
- ✅ UI completa para configurar alertas
- ✅ APK generado: `~/Desktop/andes-powder-final.apk`

---

## 📋 Pasos para Producción

### 1. Configurar Base de Datos

#### Opción A: Usando el script automático

```bash
cd backend

# Si usas archivo .env
source .env

# O exporta manualmente
export DATABASE_URL='postgresql://user:pass@host:5432/andes_powder'

# Ejecuta el script
./scripts/setup-notifications.sh
```

#### Opción B: Manual con psql

```bash
cd backend
psql "$DATABASE_URL" -f database/push-notifications-schema.sql
```

#### Opción C: Supabase Dashboard

1. Ve a tu proyecto en https://supabase.com
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `backend/database/push-notifications-schema.sql`
4. Ejecuta el script

**Tablas creadas:**
- `push_tokens` - Tokens de dispositivos
- `user_preferences` - Preferencias de notificaciones
- `users` - Usuarios (si no existe)

---

### 2. Verificar Variables de Entorno

Asegúrate de tener en tu `backend/.env`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/andes_powder

# Firebase (si usas autenticación)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

---

### 3. Instalar Dependencias del Backend

```bash
cd backend
npm install
```

Verifica que `expo-server-sdk` esté instalado:

```bash
npm list expo-server-sdk
```

Si no está, instálalo:

```bash
npm install expo-server-sdk
```

---

### 4. Iniciar el Backend

```bash
cd backend
npm run build
npm start
```

**Verifica que veas estos mensajes:**

```
🏔️  Andes Powder API running on port 3000
📸 Snapshot system initialized - Daily snapshots at 6:00 AM
📊 Forecast trending system initialized - Daily snapshots at 6:00 AM
🚨 SMN Alerts system initialized
🔔 Smart notification scanner initialized - 8:00 AM and 6:00 PM daily
[CRON] Notification scanner scheduled: 8:00 AM and 6:00 PM daily
```

---

### 5. Instalar el APK en tu Android

1. Transfiere `~/Desktop/andes-powder-final.apk` a tu teléfono
2. Instala el APK (permite instalación de fuentes desconocidas si es necesario)
3. Abre la app

---

### 6. Configurar Notificaciones en la App

1. **Abre la app** → pestaña **Alertas** (🔔)
2. **Toca "Activar Notificaciones"**
3. **Acepta los permisos** cuando Android te lo pida
4. **Configura tus preferencias:**
   - Alertas de Nieve: ✅ (≥10cm por defecto)
   - Alertas de Tormenta: ✅
   - Alertas de Viento: ✅ (≥70km/h por defecto)
5. **(Opcional) Toca "Umbrales Personalizados"** para ajustar:
   - Mínimo de nieve (5-30cm)
   - Velocidad mínima de viento (50-100km/h)
   - Días de anticipación (1-7 días)
6. **Toca "Guardar Configuración"**
7. **Toca "Probar Notificación"** para verificar que funciona

---

## 🧪 Probar el Sistema

### Test 1: Notificación Local (Inmediata)

En la app:
1. Pestaña **Alertas**
2. Toca **"Probar Notificación"**
3. Deberías recibir una notificación en 2 segundos

✅ **Si funciona:** Las notificaciones locales están OK

---

### Test 2: Verificar Token Registrado

```bash
# En tu backend
curl http://localhost:3000/api/push/stats
```

**Respuesta esperada:**
```json
{
  "success": true,
  "activeTokens": 1,
  "message": "1 active push tokens registered"
}
```

✅ **Si ves activeTokens > 0:** El token se registró correctamente

---

### Test 3: Enviar Notificación desde Backend

```bash
# Obtén tu user_id de la tabla push_tokens
psql "$DATABASE_URL" -c "SELECT user_id, token FROM push_tokens LIMIT 1;"

# Envía notificación de prueba
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TU_USER_ID_AQUI",
    "title": "🌨️ Test desde Backend",
    "body": "Esta notificación viene del servidor"
  }'
```

✅ **Si recibes la notificación:** Push notifications funcionan end-to-end

---

### Test 4: Trigger Manual del Scanner

```bash
# En tu backend, agrega este endpoint temporal en src/index.ts:
app.post('/api/admin/trigger-notifications', async (req, res) => {
  const { triggerNotificationScan } = await import('./jobs/notification-scanner');
  await triggerNotificationScan();
  res.json({ success: true });
});

# Luego ejecuta:
curl -X POST http://localhost:3000/api/admin/trigger-notifications
```

Esto escaneará los pronósticos y enviará alertas si hay nieve ≥10cm en los próximos 3 días.

---

## 🔍 Troubleshooting

### Problema: "No active tokens found"

**Causa:** El token no se guardó en la base de datos

**Solución:**
1. Verifica que el backend esté corriendo
2. Verifica la URL del backend en `mobile/config/api.ts`
3. Revisa los logs del backend cuando tocas "Activar Notificaciones"

---

### Problema: Token se guarda pero no llegan notificaciones

**Causa:** El token puede ser inválido o el proyecto ID de Expo es incorrecto

**Solución:**
1. Verifica que el token empiece con `ExponentPushToken[...]`
2. Si empieza con `local-`, significa que falló obtener el token de Expo
3. Verifica el `projectId` en `mobile/app.json` (línea 53)

---

### Problema: Notificaciones locales funcionan pero no las del backend

**Causa:** Firewall, puerto cerrado, o URL incorrecta

**Solución:**
1. Verifica que el backend sea accesible desde internet
2. Si usas localhost, cambia a la IP de tu máquina
3. Actualiza `mobile/config/api.ts` con la URL correcta

---

## 📊 Monitoreo

### Ver tokens activos

```sql
SELECT 
  user_id,
  token,
  active,
  created_at,
  updated_at
FROM push_tokens
WHERE active = true
ORDER BY updated_at DESC;
```

### Ver preferencias de usuarios

```sql
SELECT 
  up.user_id,
  up.snow_alerts,
  up.min_snowfall_cm,
  up.wind_alerts,
  up.min_wind_speed_kmh,
  up.advance_notice_days
FROM user_preferences up
INNER JOIN push_tokens pt ON up.user_id = pt.user_id
WHERE pt.active = true;
```

### Ver logs del scanner

```bash
# En tu servidor
tail -f logs/app.log | grep "SMART NOTIFICATIONS"
```

---

## 🚀 Próximos Pasos

1. ✅ **Configurar base de datos** (Paso 1)
2. ✅ **Iniciar backend** (Paso 4)
3. ✅ **Instalar APK** (Paso 5)
4. ✅ **Configurar notificaciones** (Paso 6)
5. ✅ **Probar sistema** (Tests 1-4)
6. 🔄 **Esperar pronósticos** (el scanner corre 2x al día)
7. 📱 **Recibir alertas reales** cuando haya nieve ≥10cm

---

## 📝 Notas Importantes

- **Notificaciones locales** funcionan siempre (para testing)
- **Push notifications** requieren backend corriendo
- **Alertas automáticas** se envían 2x al día (8:00 AM y 6:00 PM)
- **Quiet hours** respetan la configuración del usuario
- **Umbrales personalizables** por usuario
- **Resorts favoritos** (opcional, por defecto todos)

---

## 🎯 Características del Sistema

### Alertas Inteligentes
- ✅ Basadas en pronósticos reales de Andes Powder
- ✅ Filtradas por umbrales personalizados
- ✅ Respetan quiet hours
- ✅ Anticipación configurable (1-7 días)
- ✅ Confianza opcional (solo alertas >70% confianza)

### Tipos de Alertas
- ❄️ **Nieve:** Cuando snowfall ≥ umbral (default 10cm)
- 🌪️ **Tormenta:** Cuando hay cruce de Andes confirmado
- 💨 **Viento:** Cuando wind speed ≥ umbral (default 70km/h)

### Personalización
- 🎚️ Umbrales ajustables
- 🏔️ Resorts favoritos o todos
- 🔕 Quiet hours (ej: 22:00 - 08:00)
- 📅 Días de anticipación (1-7)
- 🎯 Alta confianza opcional

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del backend
2. Verifica que las tablas existan en la DB
3. Confirma que el token se guardó correctamente
4. Prueba con notificación de test primero

¿Necesitas ayuda? Revisa la sección de Troubleshooting arriba.
