# Deployment Guide: ForecastRunHistory Feature

**Fecha:** 20 Mayo 2026
**Feature:** Detección de tendencias en modelos meteorológicos

---

## 🎯 QUÉ HACE ESTA FEATURE

Detecta si un sistema meteorológico se está **fortaleciendo** o **debilitando** comparando las últimas 4-6 corridas del modelo ECMWF.

**Ejemplo:**
- Corrida 1 (hace 24h): 15mm precipitación
- Corrida 2 (hace 18h): 18mm precipitación  
- Corrida 3 (hace 12h): 22mm precipitación
- Corrida 4 (hace 6h): 25mm precipitación
- **Resultado:** Sistema fortaleciéndose → Score 85/100

**Impacto:** Mejora el Storm Crossing Engine (componente "Precipitation Persistence")

---

## 🛡️ SEGURIDAD

### Feature Flag
La feature está **DESACTIVADA por defecto** y se controla con variable de entorno:

```bash
USE_FORECAST_HISTORY=true   # Activar feature
USE_FORECAST_HISTORY=false  # Desactivar feature (default)
```

### Backward Compatibility
- ✅ Si feature flag = `false` → Usa código legacy (actual)
- ✅ Si feature flag = `true` pero falla → Fallback a código legacy
- ✅ Si no hay historial suficiente → Usa valor por defecto (score 50)
- ✅ **NO rompe nada existente**

---

## 📦 ARCHIVOS NUEVOS

### 1. `/backend/src/services/forecast-history-service.ts`
Servicio que:
- Obtiene últimas corridas de modelos desde DB
- Calcula tendencia de precipitación
- Retorna score 0-100 y explicación

### 2. `/backend/src/config/features.ts`
Sistema de feature flags:
```typescript
export const FEATURES = {
  USE_FORECAST_HISTORY: process.env.USE_FORECAST_HISTORY === 'true',
  USE_T850: process.env.USE_T850 === 'true',
};
```

---

## 📝 ARCHIVOS MODIFICADOS

### 1. `/backend/src/engine/storm-crossing-engine.ts`
**Cambios:**
- Import de `FEATURES` y `forecastHistoryService`
- Método `calculatePrecipitationPersistence()` ahora es `async`
- Usa nuevo servicio si feature flag está activo
- Fallback a código legacy si falla

**Líneas modificadas:** 12-17, 90, 200-250

### 2. `/backend/src/index.ts`
**Cambios:**
- Import de `logFeatureFlags`
- Log de feature flags en startup

**Líneas modificadas:** 21, 306

---

## 🚀 DEPLOYMENT PASO A PASO

### Paso 1: Deploy a Railway (Feature OFF)

```bash
# Desde /backend
git add .
git commit -m "feat: Add ForecastRunHistory service with feature flag"
git push origin main
```

**En Railway:**
- NO agregar variable `USE_FORECAST_HISTORY` todavía
- Deploy se ejecuta automáticamente
- Feature queda DESACTIVADA (comportamiento actual)

### Paso 2: Verificar Deploy

```bash
# Verificar que el servidor arrancó correctamente
curl https://tu-app.railway.app/health

# Verificar logs en Railway
# Debe aparecer:
# [Features] Feature flags status:
#   - USE_FORECAST_HISTORY: false
#   - USE_T850: false
```

### Paso 3: Activar Feature Gradualmente

**Opción A: Activar en Railway (Recomendado)**
1. Ir a Railway → Variables
2. Agregar: `USE_FORECAST_HISTORY=true`
3. Redeploy automático
4. Monitorear logs

**Opción B: Activar localmente primero**
```bash
# En .env local
USE_FORECAST_HISTORY=true

# Probar localmente
npm run dev

# Verificar endpoint
curl http://localhost:3000/api/resorts/cerro-catedral/forecast
```

### Paso 4: Monitorear

**Logs a buscar:**
```
[StormCrossing] ForecastHistory trend for Cerro Catedral: {
  trend: 'strengthening',
  score: 85,
  confidence: 'high',
  explanation: 'Sistema fortaleciéndose: +35% en últimas corridas'
}
```

**Errores esperados (normales):**
```
[ForecastHistory] Historial insuficiente (menos de 3 corridas)
```
→ Normal en las primeras horas después de activar

---

## 🔄 ROLLBACK

### Si algo falla:

**Opción 1: Desactivar feature flag (< 1 minuto)**
```bash
# En Railway → Variables
USE_FORECAST_HISTORY=false
# O eliminar la variable
```

**Opción 2: Revertir commit (< 5 minutos)**
```bash
git revert HEAD
git push origin main
```

**Opción 3: Rollback en Railway**
- Railway → Deployments → Seleccionar versión anterior
- Click "Redeploy"

---

## 📊 TESTING LOCAL

### Prerequisitos
```bash
cd /Users/juanomountford/ANDES-POWDER/backend
npm install
```

### Test 1: Feature OFF (comportamiento actual)
```bash
# .env
USE_FORECAST_HISTORY=false

# Arrancar
npm run dev

# Probar
curl http://localhost:3000/api/resorts/cerro-catedral/forecast

# Verificar logs - NO debe aparecer "[StormCrossing] ForecastHistory"
```

### Test 2: Feature ON (nuevo comportamiento)
```bash
# .env
USE_FORECAST_HISTORY=true

# Arrancar
npm run dev

# Probar
curl http://localhost:3000/api/resorts/cerro-catedral/forecast

# Verificar logs - DEBE aparecer "[StormCrossing] ForecastHistory trend"
```

### Test 3: Verificar fallback
```bash
# Simular error: renombrar tabla temporalmente
# La feature debe fallar gracefully y usar código legacy

# Verificar logs:
# [StormCrossing] Error using ForecastHistory, falling back to legacy
```

---

## 📈 MÉTRICAS DE ÉXITO

### Día 1-3 (Feature activada)
- ✅ Sin errores 500 en endpoints
- ✅ Tiempo de respuesta < 2 segundos (igual que antes)
- ✅ Logs muestran tendencias calculadas
- ✅ Storm Crossing scores más precisos

### Semana 1
- ✅ Historial de 6+ corridas disponible
- ✅ Confianza "high" en tendencias
- ✅ Comparación con observaciones reales

---

## 🐛 TROUBLESHOOTING

### Error: "Historial insuficiente"
**Causa:** Menos de 3 corridas en DB
**Solución:** Esperar 12-18 horas para acumular historial
**Impacto:** Ninguno (usa valor por defecto)

### Error: "Error using ForecastHistory"
**Causa:** Problema con DB o query
**Solución:** Revisar logs, verificar tabla `forecast_runs`
**Impacto:** Ninguno (fallback a código legacy)

### Tiempo de respuesta lento
**Causa:** Queries adicionales a DB
**Solución:** Verificar índices en tabla `forecast_runs`
**Impacto:** Temporal, optimizar queries

---

## 📋 CHECKLIST PRE-DEPLOY

- [ ] Código compilado sin errores TypeScript
- [ ] Tests locales pasados (feature ON y OFF)
- [ ] Feature flag en `false` por defecto
- [ ] Logs agregados para debugging
- [ ] Documentación actualizada
- [ ] Plan de rollback claro
- [ ] Monitoreo preparado

---

## 📞 CONTACTO

Si algo falla:
1. Desactivar feature flag inmediatamente
2. Revisar logs en Railway
3. Verificar tabla `forecast_runs` en DB
4. Rollback si es necesario

**Tiempo estimado de rollback:** < 5 minutos

---

## 🎉 PRÓXIMOS PASOS

Después de validar ForecastRunHistory (1-2 semanas):
- **Fase 2:** Agregar Temperature 850 hPa
- **Fase 3:** Validación con observaciones reales
- **Fase 4:** Ajuste de pesos en Storm Crossing

**Costo total:** $0 (todo gratis)
**Riesgo:** BAJO (múltiples capas de seguridad)
