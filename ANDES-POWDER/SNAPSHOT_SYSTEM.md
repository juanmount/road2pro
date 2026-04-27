# FORECAST SNAPSHOT SYSTEM

Sistema de snapshots diarios para validación de pronósticos y entrenamiento de ML.

## 🎯 Objetivo

Guardar pronósticos diariamente para:
1. **Validación:** Comparar pronóstico vs realidad
2. **Accuracy Tracking:** Calcular métricas de precisión
3. **ML Training:** Datos para entrenar modelos
4. **Mejora Continua:** Identificar errores sistemáticos

---

## 📊 Arquitectura

### 1. Base de Datos (Supabase)

**Tabla: `forecast_snapshots`**
- Guarda pronóstico completo para cada día
- Por cerro, por fecha de pronóstico
- Incluye: temp, nieve, viento, storm crossing, confidence
- ~500 bytes por snapshot

**Tabla: `validation_events`**
- Observaciones reales vs pronóstico
- Fuentes: webcam, weather station, user reports
- Calcula errores automáticamente
- Link a snapshot original

**Tabla: `accuracy_metrics`**
- Métricas pre-calculadas por período
- MAE, RMSE, bias
- Por elevación (base/mid/summit)
- Cache para performance

### 2. Backend Services

**`SnapshotService`** (`/backend/src/services/snapshot-service.ts`)
- `createSnapshot()` - Crea snapshot de pronóstico actual
- `createDailySnapshots()` - Crea snapshots para todos los cerros
- `getSnapshot()` - Obtiene snapshot histórico
- `createValidation()` - Registra observación real
- `calculateMetrics()` - Calcula accuracy metrics

**Cron Job** (`/backend/src/jobs/daily-snapshot.ts`)
- Corre diariamente a las 6:00 AM
- Crea snapshots para próximos 7 días
- Todos los cerros activos
- Logging completo

**API Routes** (`/backend/src/routes/snapshots.ts`)
- `POST /api/snapshots/trigger` - Trigger manual (testing)
- `GET /api/snapshots/:resortId/:date` - Obtener snapshot
- `POST /api/snapshots/validate` - Crear validación
- `GET /api/snapshots/metrics/:resortId` - Métricas de accuracy

---

## 🚀 Implementación

### Paso 1: Crear Tablas en Supabase

```bash
# Ejecutar en Supabase SQL Editor
cat backend/migrations/create_snapshot_tables.sql
```

Esto crea:
- `forecast_snapshots` (pronósticos guardados)
- `validation_events` (observaciones reales)
- `accuracy_metrics` (métricas calculadas)

### Paso 2: Integrar en Backend

```typescript
// En tu server.ts o index.ts
import { startSnapshotCron } from './jobs/daily-snapshot';
import snapshotRoutes from './routes/snapshots';

// Iniciar cron job
startSnapshotCron();

// Registrar rutas
app.use('/api/snapshots', snapshotRoutes);
```

### Paso 3: Conectar con Forecast Service

En `snapshot-service.ts`, actualizar el método `getCurrentForecast()`:

```typescript
private async getCurrentForecast(resortId: string, date: Date) {
  // Reemplazar con tu servicio real de pronósticos
  const forecast = await yourForecastService.getForecast(resortId, date);
  return forecast;
}
```

---

## 📈 Uso

### Crear Snapshots Manualmente (Testing)

```bash
curl -X POST http://localhost:3000/api/snapshots/trigger
```

### Obtener Snapshot Histórico

```bash
curl http://localhost:3000/api/snapshots/catedral/2026-04-26
```

### Registrar Observación Real

```bash
curl -X POST http://localhost:3000/api/snapshots/validate \
  -H "Content-Type: application/json" \
  -d '{
    "resortId": "catedral",
    "eventDate": "2026-04-26",
    "observed": {
      "base": 0,
      "mid": 3,
      "summit": 8
    },
    "observationType": "user-report",
    "observationSource": "Juan visual observation",
    "notes": "Nieve visible hasta mid"
  }'
```

### Calcular Métricas de Accuracy

```bash
curl "http://localhost:3000/api/snapshots/metrics/catedral?startDate=2026-04-01&endDate=2026-04-30"
```

---

## 📊 Métricas Calculadas

### MAE (Mean Absolute Error)
```
MAE = Σ|forecast - actual| / n
```
Promedio de error absoluto en cm.

### RMSE (Root Mean Square Error)
```
RMSE = √(Σ(forecast - actual)² / n)
```
Penaliza errores grandes más fuertemente.

### Bias
```
Bias = Σ(forecast - actual) / n
```
- Positivo = sobre-pronosticamos
- Negativo = sub-pronosticamos

### Accuracy por Elevación
- Base MAE
- Mid MAE  
- Summit MAE

---

## 🔄 Workflow Completo

### Día 1 (6:00 AM)
```
Cron Job → createDailySnapshots()
  ├─ Catedral: forecast para hoy + 7 días
  ├─ Chapelco: forecast para hoy + 7 días
  └─ Guardado en forecast_snapshots
```

### Día 2 (Usuario observa)
```
Usuario: "Vi nieve hasta mid"
  ↓
POST /api/snapshots/validate
  ├─ Busca snapshot del Día 1
  ├─ Compara forecast vs observed
  ├─ Calcula errores (MAE, bias)
  └─ Guarda en validation_events
```

### Fin de Mes
```
GET /api/snapshots/metrics/catedral?startDate=...
  ├─ Lee todos los validation_events
  ├─ Calcula MAE, RMSE, bias
  ├─ Por elevación
  └─ Retorna accuracy metrics
```

---

## 💾 Peso de Datos

### Por Snapshot
- **Tamaño:** ~500 bytes
- **Frecuencia:** 1 cerro × 7 días = 7 snapshots/día
- **Anual:** 1 cerro × 365 días × 7 = 2,555 snapshots = ~1.3 MB

### Por Validación
- **Tamaño:** ~300 bytes
- **Frecuencia:** Variable (eventos de nieve)
- **Anual:** ~50 eventos × 300 bytes = 15 KB

### Total (10 cerros, 1 año)
- Snapshots: 13 MB
- Validations: 150 KB
- **Total: ~13 MB/año** ✅ Insignificante

---

## 🎯 Próximos Pasos

### Fase 1: Fundación (Esta Semana)
- [x] Crear modelos de datos
- [x] Crear servicio de snapshots
- [x] Crear tablas en Supabase
- [x] Crear cron job
- [x] Crear API endpoints
- [ ] Ejecutar migración SQL
- [ ] Integrar con forecast service real
- [ ] Activar cron job en producción

### Fase 2: Validación (Próximas 2 Semanas)
- [ ] Webcam scraping para validación automática
- [ ] Weather station integration
- [ ] User report system (app móvil)
- [ ] Dashboard de accuracy

### Fase 3: ML (Próximo Mes)
- [ ] Exportar datos para training
- [ ] Entrenar modelo de storm crossing
- [ ] Calibrar algoritmos con datos reales
- [ ] Ensemble forecasting

---

## 🔧 Troubleshooting

### Cron no corre
```bash
# Verificar que node-schedule está instalado
npm install node-schedule

# Verificar logs
tail -f logs/snapshot-cron.log
```

### Snapshots no se crean
```bash
# Trigger manual para debugging
curl -X POST http://localhost:3000/api/snapshots/trigger
```

### Métricas incorrectas
```bash
# Verificar validations
SELECT * FROM validation_events WHERE resort_id = 'catedral';

# Recalcular métricas
curl "http://localhost:3000/api/snapshots/metrics/catedral?startDate=2026-04-01&endDate=2026-04-30"
```

---

## 📚 Referencias

- **Forecast Validation:** WMO Guidelines on Forecast Verification
- **Accuracy Metrics:** Jolliffe & Stephenson (2012) - Forecast Verification
- **ML Training:** Rasp et al. (2018) - Deep Learning for Weather Forecasting

---

**Sistema implementado:** 26 de Abril, 2026  
**Autor:** Andes Powder Team  
**Versión:** 1.0.0
