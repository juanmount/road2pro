# DEPLOYMENT - SISTEMA DE VALIDACIÓN

## ✅ ESTADO ACTUAL

**Todo el código está implementado y listo.** Solo faltan estos pasos de deployment:

---

## 📋 PASOS DE DEPLOYMENT

### PASO 1: Ejecutar Migración de Base de Datos

La migración ya está creada en:
`/backend/supabase/migrations/20260421_forecast_validation.sql`

**Opción A - Si usás Supabase CLI:**
```bash
cd /Users/juanomountford/ANDES-POWDER/backend
supabase db push
```

**Opción B - Manual en Supabase Dashboard:**
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto Andes Powder
3. Ir a "SQL Editor"
4. Copiar y pegar el contenido de `20260421_forecast_validation.sql`
5. Ejecutar

**Opción C - Si usás PostgreSQL directo:**
```bash
psql $DATABASE_URL -f /Users/juanomountford/ANDES-POWDER/backend/supabase/migrations/20260421_forecast_validation.sql
```

**Verificar que funcionó:**
```sql
-- Deberías ver estas tablas:
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('forecast_validations', 'validation_summary');
```

---

### PASO 2: Verificar Dependencias

Las dependencias ya están en `package.json`:
- ✅ `axios` (para HTTP requests)
- ✅ `cheerio` (para parsing HTML)

Si no las tenés instaladas:
```bash
cd /Users/juanomountford/ANDES-POWDER/backend
npm install
# o
yarn install
```

---

### PASO 3: Verificar Integración en Index

**Ya hecho ✅** - El router de validación ya está registrado en `/backend/src/index.ts`:
```typescript
import validationRouter from './routes/validation';
app.use('/api/validation', validationRouter);
```

---

### PASO 4: Compilar y Arrancar Backend

```bash
cd /Users/juanomountford/ANDES-POWDER/backend

# Compilar TypeScript
npm run build

# Arrancar servidor
npm start

# O en desarrollo con hot reload:
npm run dev
```

**Deberías ver:**
```
🏔️  Andes Powder API running on port 3000
```

---

### PASO 5: Testear Sistema de Validación

#### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
**Respuesta esperada:**
```json
{"status":"ok","timestamp":"2026-04-21T..."}
```

#### Test 2: Trigger Comparación Manual
```bash
curl -X POST http://localhost:3000/api/validation/compare
```
**Respuesta esperada:**
```json
{"success":true,"message":"Forecast comparison completed"}
```

**Logs esperados en consola:**
```
[VALIDATION] Starting weekly forecast comparison...
[VALIDATION] Comparing forecasts for Cerro Catedral, 1 days ahead
[VALIDATION] tiempodesur parsed: precip=12mm, freezing=1800m
[VALIDATION] Mountain-Forecast parsed: summit=15cm, base=8cm
[VALIDATION] Created comparison: abc-123-def-456
[VALIDATION] Comparing forecasts for Chapelco, 1 days ahead
...
[VALIDATION] Weekly comparison completed
```

#### Test 3: Ver Estadísticas (debería estar vacío inicialmente)
```bash
curl http://localhost:3000/api/validation/statistics
```
**Respuesta esperada:**
```json
[]
```

---

### PASO 6: Validar Primera Comparación (Post-Evento)

Después de que ocurra un evento de nieve:

1. **Observar condiciones reales:**
   - Revisar webcams de resorts
   - Revisar @greenguru.bariloche en Instagram
   - Revisar reportes oficiales

2. **Obtener ID de comparación:**
```bash
# Consultar DB para ver comparaciones pendientes
# O revisar logs del paso anterior para obtener el ID
```

3. **Validar con datos reales:**
```bash
curl -X POST http://localhost:3000/api/validation/abc-123-def-456/validate \
  -H "Content-Type: application/json" \
  -d '{
    "actualSnowfallBase": 8,
    "actualSnowfallSummit": 15,
    "actualWind": 25,
    "actualTemp": -2,
    "actualSource": "webcam + greenguru",
    "actualNotes": "Nieve visible en cumbre desde webcam, @greenguru reportó 12-15cm"
  }'
```

**Respuesta esperada:**
```json
{"success":true,"message":"Validation completed"}
```

**Logs esperados:**
```
[VALIDATION] Validated comparison abc-123-def-456, winner: andes_powder
[VALIDATION] Updated summary for resort xyz-789
```

4. **Ver estadísticas actualizadas:**
```bash
curl http://localhost:3000/api/validation/statistics
```

**Respuesta esperada:**
```json
[
  {
    "resort_name": "Cerro Catedral",
    "period_start": "2026-04-01",
    "period_end": "2026-04-30",
    "ap_total_forecasts": 1,
    "ap_avg_snowfall_accuracy": 87.5,
    "ap_wins": 1,
    "ts_total_forecasts": 1,
    "ts_avg_snowfall_accuracy": 65.2,
    "ts_wins": 0,
    "mf_total_forecasts": 1,
    "mf_avg_snowfall_accuracy": 72.1,
    "mf_wins": 0
  }
]
```

---

## 🔧 TROUBLESHOOTING

### Error: "Cannot find module './routes/validation'"
**Solución:** Verificar que el archivo existe en `/backend/src/routes/validation.ts`

### Error: "Cannot find module '../config/supabase'"
**Solución:** Verificar que tenés configurado Supabase. El archivo debería estar en `/backend/src/config/supabase.ts` o similar.

Si no existe, crear:
```typescript
// /backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

Y agregar a `.env`:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
```

### Error: "Could not parse tiempodesur data"
**Causa:** HTML structure de tiempodesur.com cambió.
**Solución:** 
1. Revisar logs para ver qué selectores fallaron
2. Inspeccionar manualmente https://tiempodesur.com/nieve/cerro-catedral.html
3. Actualizar selectores en `/backend/src/services/validation-service.ts`

### Error: "Could not parse Mountain-Forecast data"
**Causa:** HTML structure de Mountain-Forecast.com cambió.
**Solución:** Similar al anterior, actualizar selectores.

### Los scrapers no encuentran datos
**Nota:** Esto es normal si:
- Las páginas no tienen pronósticos disponibles
- La fecha objetivo está fuera de rango (>7 días)
- Las páginas están temporalmente caídas

El sistema está diseñado para manejar esto gracefully y simplemente no guardará datos de esa fuente.

---

## 🔄 AUTOMATIZACIÓN (Opcional)

### Setup Cron Job Semanal

Para ejecutar comparaciones automáticamente cada lunes:

**Opción A - Node-cron (dentro de la app):**

Agregar en `/backend/src/index.ts`:
```typescript
import cron from 'node-cron';
import { validationService } from './services/validation-service';

// Run every Monday at 9:00 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Running weekly forecast comparison...');
  await validationService.runWeeklyComparison();
});
```

**Opción B - Sistema cron (Linux/Mac):**
```bash
# Editar crontab
crontab -e

# Agregar línea (ejecutar cada lunes a las 9am)
0 9 * * 1 curl -X POST http://localhost:3000/api/validation/compare
```

**Opción C - Railway/Render/Heroku:**
Usar sus sistemas de scheduled jobs integrados.

---

## 📊 MONITOREO

### Logs a Observar

**Éxito:**
```
[VALIDATION] Starting weekly forecast comparison...
[VALIDATION] tiempodesur parsed: precip=12mm, freezing=1800m
[VALIDATION] Mountain-Forecast parsed: summit=15cm
[VALIDATION] Created comparison: abc-123
[VALIDATION] Weekly comparison completed
```

**Warnings (normales):**
```
[VALIDATION] Could not parse tiempodesur data for Cerro Bayo, day 3
[VALIDATION] HTML structure may have changed. Manual review needed.
```

**Errores (requieren atención):**
```
[VALIDATION] Error fetching tiempodesur forecast: timeout
[VALIDATION] Error creating comparison: database error
```

---

## ✅ CHECKLIST FINAL

- [ ] Migración de DB ejecutada
- [ ] Dependencias instaladas (axios, cheerio)
- [ ] Backend compilado y corriendo
- [ ] Test: `curl http://localhost:3000/health` funciona
- [ ] Test: `curl -X POST http://localhost:3000/api/validation/compare` funciona
- [ ] Logs muestran comparaciones creadas
- [ ] Primera validación post-evento completada
- [ ] Estadísticas muestran datos
- [ ] (Opcional) Cron job configurado

---

## 🎯 PRÓXIMOS PASOS POST-DEPLOYMENT

1. **Semana 1:** Ejecutar comparaciones manualmente, validar que scrapers funcionen
2. **Semana 2:** Validar primeros eventos de nieve, verificar accuracy
3. **Semana 3:** Setup automatización si todo funciona bien
4. **Resto de Season 0:** Acumular datos, documentar casos de éxito

---

## 📞 SOPORTE

Si algo no funciona:
1. Revisar logs del backend
2. Verificar que la migración de DB se ejecutó correctamente
3. Verificar variables de entorno (.env)
4. Testear scrapers manualmente visitando las URLs

**El sistema está diseñado para ser resiliente:** Si un scraper falla, simplemente no guardará datos de esa fuente, pero el resto seguirá funcionando.

---

**Última actualización:** 21 Abril 2026  
**Status:** ✅ Listo para deployment  
**Tiempo estimado de deployment:** 15-30 minutos
