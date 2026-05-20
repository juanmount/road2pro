# Plan de Implementación Seguro - Mejoras de Pronóstico
**Fecha:** 20 Mayo 2026
**Contexto:** Versión Android en testing cerrado - NO ROMPER NADA

---

## 🛡️ PRINCIPIOS DE SEGURIDAD

### 1. **Backward Compatibility**
- Todo cambio debe ser compatible con versión actual
- Frontend NO debe requerir cambios
- APIs existentes deben seguir funcionando igual

### 2. **Feature Flags**
- Nuevas features deben poder activarse/desactivarse
- Rollback inmediato si algo falla

### 3. **Testing Incremental**
- Probar cada cambio en desarrollo antes de producción
- Validar con datos reales de Catedral

---

## 📋 FASE 1: ForecastRunHistory (PRIORIDAD ALTA)

### Objetivo
Detectar tendencias en modelos (si sistema se fortalece o debilita)

### Cambios Necesarios

#### 1.1. Crear servicio de historial (NUEVO ARCHIVO)
**Archivo:** `backend/src/services/forecast-history-service.ts`

```typescript
// Servicio NUEVO - no toca código existente
export class ForecastHistoryService {
  async getRecentRuns(resortId: string, modelName: string, limit: number = 6) {
    // Query a tabla forecast_runs que YA EXISTE
  }
  
  async calculatePrecipitationTrend(runs: ForecastRun[]) {
    // Calcula si precipitación aumenta o disminuye entre corridas
  }
}
```

**Riesgo:** ❌ CERO - archivo nuevo, no modifica nada existente

---

#### 1.2. Modificar Storm Crossing Engine (CAMBIO SEGURO)
**Archivo:** `backend/src/engine/storm-crossing-engine.ts`

**Cambio:**
```typescript
// ANTES (línea 143):
private calculatePrecipitationPersistence(
  ecmwf: NormalizedForecast,
  gfs: NormalizedForecast
): number {
  // TODO: Implement historical comparison
  return 50; // Placeholder
}

// DESPUÉS:
private async calculatePrecipitationPersistence(
  ecmwf: NormalizedForecast,
  gfs: NormalizedForecast,
  resort: Resort
): Promise<number> {
  // Obtener historial de corridas
  const history = await this.historyService.getRecentRuns(resort.id, 'ecmwf-ifs', 6);
  
  // Si no hay historial suficiente, usar valor por defecto
  if (history.length < 3) {
    return 50; // Backward compatible
  }
  
  // Calcular trend
  const trend = await this.historyService.calculatePrecipitationTrend(history);
  return trend;
}
```

**Riesgo:** ✅ BAJO
- Si falla, devuelve valor por defecto (50)
- Backward compatible
- No rompe nada existente

---

#### 1.3. Feature Flag (SEGURIDAD EXTRA)
**Archivo:** `backend/src/config/features.ts` (NUEVO)

```typescript
export const FEATURES = {
  USE_FORECAST_HISTORY: process.env.USE_FORECAST_HISTORY === 'true' || false,
  USE_T850: process.env.USE_T850 === 'true' || false,
};
```

**Uso en Storm Crossing:**
```typescript
if (FEATURES.USE_FORECAST_HISTORY) {
  score = await this.calculatePrecipitationPersistence(...);
} else {
  score = 50; // Valor actual
}
```

**Riesgo:** ❌ CERO - por defecto usa código actual

---

### Testing de Fase 1

```bash
# 1. Desarrollo local
npm run dev

# 2. Probar endpoint existente (debe funcionar igual)
curl http://localhost:3000/api/resorts/cerro-catedral/forecast

# 3. Activar feature flag
export USE_FORECAST_HISTORY=true

# 4. Probar nuevamente (debe funcionar con mejora)
curl http://localhost:3000/api/resorts/cerro-catedral/forecast

# 5. Si falla, desactivar
export USE_FORECAST_HISTORY=false
```

---

## 📋 FASE 2: Temperature 850 hPa (PRIORIDAD MEDIA)

### Objetivo
Mejorar estimación de fase nieve/lluvia con temperatura a 850 hPa

### Cambios Necesarios

#### 2.1. Agregar T850 al adapter (CAMBIO SEGURO)
**Archivo:** `backend/src/providers/open-meteo/adapter.ts`

**Cambio en línea 34-50:**
```typescript
// ANTES:
hourly: [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'snowfall',
  // ... resto
].join(','),

// DESPUÉS:
hourly: [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'snowfall',
  'temperature_850hPa', // NUEVO - opcional
  // ... resto
].join(','),
```

**Riesgo:** ✅ BAJO
- Variable opcional
- Si no existe, código actual sigue funcionando
- Backward compatible

---

#### 2.2. Usar T850 en Phase Classifier (CAMBIO SEGURO)
**Archivo:** `backend/src/engine/phase-classifier.ts`

**Cambio:**
```typescript
classifyPhase(
  temperature: number,
  humidity: number,
  freezingLevel: number,
  elevation: number,
  temperature850?: number // OPCIONAL - backward compatible
): PhaseResult {
  
  // Código actual sigue funcionando
  const wetBulb = calculateWetBulbTemperature(temperature, humidity);
  
  // NUEVO: Si tenemos T850, mejorar estimación
  if (temperature850 !== undefined && FEATURES.USE_T850) {
    // Usar T850 para mejor estimación de masa de aire
    const adjustedFreezingLevel = this.adjustFreezingLevelWithT850(
      freezingLevel, 
      temperature850
    );
    // ... lógica mejorada
  }
  
  // Código actual continúa...
}
```

**Riesgo:** ❌ CERO
- Parámetro opcional
- Feature flag protege cambio
- Si falla, usa código actual

---

### Testing de Fase 2

```bash
# 1. Probar sin T850 (debe funcionar igual)
export USE_T850=false
npm run dev

# 2. Probar con T850
export USE_T850=true
npm run dev

# 3. Comparar resultados
# Debe mejorar precisión pero no romper nada
```

---

## 🚀 DEPLOYMENT SEGURO

### Estrategia de Rollout

#### Paso 1: Desarrollo Local
```bash
cd /Users/juanomountford/ANDES-POWDER/backend
npm run dev
# Probar todo localmente
```

#### Paso 2: Railway Staging (si existe)
```bash
# Deploy a staging con feature flags OFF
git push origin feature/forecast-improvements

# En Railway, configurar:
USE_FORECAST_HISTORY=false
USE_T850=false
```

#### Paso 3: Activar Features Gradualmente
```bash
# Día 1: Activar solo ForecastHistory
USE_FORECAST_HISTORY=true
USE_T850=false

# Monitorear logs y errores

# Día 2-3: Si todo OK, activar T850
USE_FORECAST_HISTORY=true
USE_T850=true
```

#### Paso 4: Rollback Inmediato si Falla
```bash
# Si algo falla, desactivar features
USE_FORECAST_HISTORY=false
USE_T850=false

# App vuelve a comportamiento original
```

---

## 📊 MONITOREO

### Logs a Revisar
```typescript
// Agregar logs en código nuevo
console.log('[ForecastHistory] Trend calculated:', trend);
console.log('[T850] Using T850 for phase classification');
console.log('[T850] Freezing level adjusted:', adjustedFL);
```

### Métricas a Monitorear
- Tiempo de respuesta de endpoints (no debe aumentar)
- Errores en logs (debe ser cero)
- Precisión de pronósticos (debe mejorar)

---

## ✅ CHECKLIST DE SEGURIDAD

Antes de cada deploy:

- [ ] Código nuevo tiene feature flags
- [ ] Parámetros opcionales (backward compatible)
- [ ] Valores por defecto si falla
- [ ] Logs para debugging
- [ ] Testing local exitoso
- [ ] Feature flags OFF en producción inicialmente
- [ ] Plan de rollback claro

---

## 🎯 TIMELINE PROPUESTO

### Semana 1: ForecastRunHistory
- Día 1-2: Implementar servicio de historial
- Día 3: Integrar en Storm Crossing
- Día 4-5: Testing y ajustes

### Semana 2: Temperature 850 hPa
- Día 1: Agregar T850 al adapter
- Día 2: Integrar en Phase Classifier
- Día 3-5: Testing y validación

### Semana 3: Deploy Gradual
- Día 1: Deploy con features OFF
- Día 2-3: Activar ForecastHistory
- Día 4-5: Activar T850

---

## 🚨 PLAN DE ROLLBACK

Si algo falla:

1. **Inmediato:** Desactivar feature flags
   ```bash
   USE_FORECAST_HISTORY=false
   USE_T850=false
   ```

2. **Si persiste:** Revertir commit
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Última opción:** Rollback en Railway
   - Volver a versión anterior estable

**Tiempo de rollback:** < 5 minutos

---

## 📝 NOTAS FINALES

- ✅ Todo cambio es backward compatible
- ✅ Feature flags permiten rollback inmediato
- ✅ No requiere cambios en frontend
- ✅ No requiere cambios en base de datos (tabla forecast_runs ya existe)
- ✅ Costo: $0 (todo gratis con Open-Meteo)
- ✅ Riesgo: BAJO (múltiples capas de seguridad)

**Versión Android en testing NO SE VERÁ AFECTADA**
