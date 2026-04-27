# ✅ SISTEMA DE SNAPSHOTS - INTEGRACIÓN COMPLETA

**Fecha:** 26 de Abril, 2026  
**Estado:** ✅ Implementado y Activado

---

## 🎯 Resumen

Sistema de snapshots diarios para validación de pronósticos y mejora continua mediante ML.

**Peso total:** ~13 MB/año (10 cerros)  
**Frecuencia:** Diaria a las 6:00 AM  
**Beneficio:** Validación sistemática + datos para ML

---

## ✅ Componentes Implementados

### 1. Base de Datos (Supabase)
- ✅ `forecast_snapshots` - Pronósticos guardados
- ✅ `validation_events` - Observaciones reales
- ✅ `accuracy_metrics` - Métricas calculadas
- ✅ Índices para performance

### 2. Backend Services
- ✅ `/backend/src/domain/snapshot-models.ts` - Modelos de datos
- ✅ `/backend/src/services/snapshot-service.ts` - Servicio completo
- ✅ `/backend/src/jobs/daily-snapshot.ts` - Cron job diario
- ✅ `/backend/src/routes/snapshots.ts` - API endpoints
- ✅ `/backend/src/config/supabase.ts` - Configuración

### 3. Integración en Backend
- ✅ Imports agregados en `index.ts`
- ✅ Rutas registradas: `/api/snapshots`
- ✅ Cron job activado (6:00 AM diario)
- ✅ Dependencias instaladas

---

## 📡 API Endpoints Disponibles

### 1. Trigger Manual (Testing)
```bash
POST http://localhost:3000/api/snapshots/trigger
```
Crea snapshots manualmente para todos los cerros.

### 2. Obtener Snapshot Histórico
```bash
GET http://localhost:3000/api/snapshots/:resortId/:date
```
Ejemplo: `GET /api/snapshots/catedral/2026-04-26`

### 3. Crear Validación
```bash
POST http://localhost:3000/api/snapshots/validate
Content-Type: application/json

{
  "resortId": "catedral",
  "eventDate": "2026-04-26",
  "observed": {
    "base": 0,
    "mid": 3,
    "summit": 8
  },
  "observationType": "user-report",
  "observationSource": "Visual observation",
  "notes": "Nieve visible hasta mid"
}
```

### 4. Calcular Métricas
```bash
GET http://localhost:3000/api/snapshots/metrics/:resortId?startDate=2026-04-01&endDate=2026-04-30
```

---

## 🔧 Configuración Requerida

### Variables de Entorno (.env)
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**⚠️ IMPORTANTE:** Agregá estas variables a tu `.env` antes de deployar.

---

## 🚀 Próximos Pasos

### Fase 1: Conectar con Forecast Service (Pendiente)
Actualizar `snapshot-service.ts` línea ~200:

```typescript
private async getCurrentForecast(resortId: string, date: Date) {
  // REEMPLAZAR ESTO:
  // return mock data
  
  // CON ESTO:
  const { forecastService } = await import('./forecast-service');
  const forecast = await forecastService.getForecastForDate(resortId, date);
  return forecast;
}
```

### Fase 2: Validación Automática (2 semanas)
- [ ] Webcam scraping
- [ ] Weather station integration
- [ ] User report system en app móvil

### Fase 3: ML Training (1 mes)
- [ ] Exportar datos históricos
- [ ] Entrenar modelos
- [ ] Calibrar algoritmos

---

## 📊 Cómo Funciona

### Día 1 (6:00 AM)
```
Cron Job → createDailySnapshots()
  ├─ Catedral: forecast para hoy + 7 días
  ├─ Chapelco: forecast para hoy + 7 días
  └─ Guardado en forecast_snapshots (Supabase)
```

### Día 2 (Usuario observa)
```
POST /api/snapshots/validate
  ├─ Busca snapshot del Día 1
  ├─ Compara forecast vs observed
  ├─ Calcula errores (MAE, RMSE, bias)
  └─ Guarda en validation_events
```

### Fin de Mes
```
GET /api/snapshots/metrics/catedral
  ├─ Lee validation_events
  ├─ Calcula MAE, RMSE, bias
  ├─ Por elevación (base/mid/summit)
  └─ Retorna accuracy metrics
```

---

## 🧪 Testing

### Test 1: Crear Snapshot Manual
```bash
curl -X POST http://localhost:3000/api/snapshots/trigger
```

**Resultado esperado:**
```json
{
  "success": true,
  "count": 7,
  "snapshots": [...]
}
```

### Test 2: Verificar en Supabase
```sql
SELECT * FROM forecast_snapshots 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 3: Crear Validación
```bash
curl -X POST http://localhost:3000/api/snapshots/validate \
  -H "Content-Type: application/json" \
  -d '{
    "resortId": "catedral",
    "eventDate": "2026-04-26",
    "observed": { "summit": 8 },
    "observationType": "user-report",
    "observationSource": "Juan"
  }'
```

---

## 📈 Métricas Calculadas

### MAE (Mean Absolute Error)
Promedio de error absoluto en cm.
```
MAE = Σ|forecast - actual| / n
```

### RMSE (Root Mean Square Error)
Penaliza errores grandes.
```
RMSE = √(Σ(forecast - actual)² / n)
```

### Bias
Tendencia a sobre/sub-pronosticar.
```
Bias = Σ(forecast - actual) / n
```
- Positivo = sobre-pronosticamos
- Negativo = sub-pronosticamos

---

## 🐛 Troubleshooting

### Cron no corre
```bash
# Verificar logs
tail -f logs/snapshot-cron.log

# Trigger manual
curl -X POST http://localhost:3000/api/snapshots/trigger
```

### Error de Supabase
```bash
# Verificar variables de entorno
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Verificar tablas
# En Supabase SQL Editor:
SELECT * FROM forecast_snapshots LIMIT 1;
```

### Snapshots vacíos
```typescript
// Verificar que getCurrentForecast() retorna datos reales
// En snapshot-service.ts línea ~200
```

---

## 📚 Documentación Adicional

- **SNAPSHOT_SYSTEM.md** - Documentación técnica completa
- **backend/migrations/create_snapshot_tables.sql** - Schema SQL
- **backend/src/services/snapshot-service.ts** - Código fuente

---

## ✅ Checklist de Deployment

- [x] Tablas creadas en Supabase
- [x] Dependencias instaladas (`@supabase/supabase-js`, `node-schedule`)
- [x] Código integrado en backend
- [x] Rutas API registradas
- [x] Cron job activado
- [ ] Variables de entorno configuradas en producción
- [ ] Conectar con forecast service real
- [ ] Primer snapshot manual exitoso
- [ ] Primera validación registrada

---

**Sistema listo para empezar a recolectar datos y mejorar pronósticos.** 🚀

**Próximo paso crítico:** Conectar `getCurrentForecast()` con tu servicio real de pronósticos.
