# 🔔 Setup Push Notifications en Supabase

## Paso 1: Ejecutar el Schema SQL

1. **Abre tu proyecto en Supabase:**
   - Ve a https://supabase.com
   - Selecciona tu proyecto de Andes Powder

2. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **+ New query**

3. **Copia y pega este SQL:**

```sql
-- Push Notifications Schema for Andes Powder
-- Tables for managing push tokens and user notification preferences

-- Table: push_tokens
-- Stores Expo push tokens for each user/device
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at);

-- Table: user_preferences
-- Stores notification preferences for each user
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Alert toggles
  snow_alerts BOOLEAN DEFAULT true,
  storm_alerts BOOLEAN DEFAULT true,
  wind_alerts BOOLEAN DEFAULT true,
  
  -- Snow alert settings
  min_snowfall_cm INTEGER DEFAULT 10,
  require_high_confidence BOOLEAN DEFAULT false,
  
  -- Wind alert settings
  min_wind_speed_kmh INTEGER DEFAULT 70,
  
  -- Resort filters
  favorite_resorts TEXT[] DEFAULT '{}',
  all_resorts BOOLEAN DEFAULT true,
  
  -- Timing
  advance_notice_days INTEGER DEFAULT 3,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Table: users (if not exists)
-- Basic user table for authentication
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  display_name VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON TABLE user_preferences IS 'Stores notification preferences for each user';
COMMENT ON COLUMN user_preferences.min_snowfall_cm IS 'Minimum snowfall in cm to trigger alert';
COMMENT ON COLUMN user_preferences.min_wind_speed_kmh IS 'Minimum wind speed in km/h to trigger alert';
COMMENT ON COLUMN user_preferences.advance_notice_days IS 'How many days in advance to send alerts (1-7)';
```

4. **Ejecuta el query:**
   - Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)
   - Deberías ver: "Success. No rows returned"

5. **Verifica las tablas:**
   - Ve a **Table Editor** en el menú lateral
   - Deberías ver las nuevas tablas:
     - `push_tokens`
     - `user_preferences`
     - `users` (si no existía)

---

## Paso 2: Verificar el Backend

1. **Asegúrate de que tu backend esté corriendo:**

```bash
cd backend
npm start
```

2. **Verifica que veas este mensaje:**
```
🔔 Smart notification scanner initialized - 8:00 AM and 6:00 PM daily
```

---

## Paso 3: Instalar y Configurar la App

1. **Instala el APK en tu Android:**
   - Transfiere `~/Desktop/andes-powder-final.apk` a tu teléfono
   - Instala el APK

2. **Abre la app y ve a la pestaña Alertas (🔔)**

3. **Toca "Activar Notificaciones"**
   - Acepta los permisos cuando Android te lo pida

4. **Configura tus preferencias:**
   - Ajusta los umbrales si quieres
   - Toca "Guardar Configuración"

5. **Prueba con "Probar Notificación"**
   - Deberías recibir una notificación en 2 segundos

---

## Paso 4: Verificar que el Token se Guardó

1. **En Supabase, ve a Table Editor → push_tokens**

2. **Deberías ver una fila con:**
   - `user_id`: Tu device ID
   - `token`: Un string que empieza con `ExponentPushToken[...]` o `local-...`
   - `active`: true
   - `created_at`: Fecha actual

---

## ✅ ¡Listo!

El sistema está configurado. Ahora:

- **Notificaciones locales** funcionan inmediatamente (botón "Probar Notificación")
- **Alertas automáticas** se enviarán 2x al día (8:00 AM y 6:00 PM) cuando haya:
  - ❄️ Nieve ≥ 10cm (o tu umbral)
  - 💨 Viento ≥ 70km/h (o tu umbral)
  - 🌪️ Tormentas cruzando los Andes

---

## 🧪 Test Manual (Opcional)

Si quieres probar que las notificaciones del backend funcionan:

1. **Obtén tu user_id:**
   - En Supabase: Table Editor → push_tokens
   - Copia el valor de `user_id`

2. **Envía una notificación de prueba:**

```bash
curl -X POST https://tu-backend.com/api/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TU_USER_ID_AQUI",
    "title": "🌨️ Test desde Backend",
    "body": "Esta notificación viene del servidor"
  }'
```

3. **Deberías recibir la notificación en tu teléfono**

---

## 📊 Monitoreo en Supabase

### Ver tokens activos

```sql
SELECT * FROM push_tokens WHERE active = true ORDER BY updated_at DESC;
```

### Ver preferencias de usuarios

```sql
SELECT 
  up.*,
  pt.token
FROM user_preferences up
INNER JOIN push_tokens pt ON up.user_id = pt.user_id
WHERE pt.active = true;
```

---

## ⚠️ Troubleshooting

### El token no se guarda en Supabase

**Verifica:**
1. Que el backend esté corriendo y accesible
2. La URL del backend en `mobile/config/api.ts`
3. Los logs del backend cuando tocas "Activar Notificaciones"

### El token se guarda pero no llegan notificaciones

**Verifica:**
1. Que el token empiece con `ExponentPushToken[...]`
2. Si empieza con `local-`, el Expo token falló
3. Revisa el `projectId` en `mobile/app.json`

---

¿Necesitas más ayuda? Revisa `PUSH-NOTIFICATIONS-SETUP.md` para guía completa.
