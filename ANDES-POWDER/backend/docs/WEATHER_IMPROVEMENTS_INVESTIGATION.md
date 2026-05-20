# Investigación: Mejoras de Pronóstico de Nieve
**Fecha:** 20 Mayo 2026
**Objetivo:** Verificar qué variables meteorológicas adicionales están disponibles en Open-Meteo (gratuito)

---

## ✅ RESULTADOS DE INVESTIGACIÓN

### 1. Temperature 850 hPa (T850)
**Estado:** ✅ DISPONIBLE en GFS API

**Endpoint probado:**
```
https://api.open-meteo.com/v1/gfs?latitude=-41.15&longitude=-71.31&hourly=temperature_850hPa
```

**Respuesta:**
- Variable: `temperature_850hPa`
- Unidad: °C
- Datos: Array horario con temperaturas a nivel 850 hPa (~1500m)

**Valor para pronóstico de nieve:**
- Indica masa de aire fría/cálida a nivel medio de atmósfera
- Mejora estimación de freezing level
- Ayuda a predecir calidad de nieve (seca vs húmeda)

**Implementación:**
- Agregar a `open-meteo/adapter.ts` en hourly params
- Usar en `phase-classifier.ts` para mejor estimación de fase
- **Esfuerzo:** Bajo (2-3 horas)
- **Riesgo:** Bajo (backward compatible)

---

### 2. Temperature 500 hPa (T500)
**Estado:** ✅ DISPONIBLE en GFS API

**Endpoint probado:**
```
https://api.open-meteo.com/v1/gfs?latitude=-41.15&longitude=-71.31&hourly=temperature_500hPa
```

**Respuesta:**
- Variable: `temperature_500hPa`
- Unidad: °C
- Datos: Array horario con temperaturas a nivel 500 hPa (~5500m)

**Valor para pronóstico de nieve:**
- Indica estructura de atmósfera superior
- Útil para análisis de sistemas sinópticos
- **MENOS RELEVANTE** para pronóstico de nieve en superficie (demasiado alto)

**Implementación:**
- Disponible pero NO prioritario
- Dejar para validación cruzada con @greenguru (que usa mapas 500 hPa)

---

### 3. Precipitable Water (PWAT)
**Estado:** ❌ NO DISPONIBLE directamente en Open-Meteo

**Variables probadas:**
- `precipitable_water` → Error
- `column_integrated_water_vapour` → No existe
- `total_column_water` → No existe

**Alternativas:**
- GFS GRIB2 directo (complejo, requiere parsing)
- Usar humedad relativa como proxy (ya disponible)

**Decisión:** ❌ DESCARTAR por ahora - complejidad vs valor incierto

---

### 4. GEFS Ensemble Members
**Estado:** ❌ NO DISPONIBLE en formato esperado

**Ensemble API probada:**
```
https://ensemble-api.open-meteo.com/v1/ensemble?models=gefs
```

**Resultado:**
- Error: "Cannot initialize MultiDomains from invalid String value gefs"
- GEFS no está disponible en Ensemble API
- Solo disponibles: ICON, GEM, otros modelos europeos

**Alternativa actual:**
- Usamos GEM (modelo canadiense) como proxy
- GEM SÍ tiene ensemble pero es diferente a GEFS

**Decisión:** ⚠️ Continuar con GEM, investigar si tiene miembros individuales

---

## 📊 RESUMEN DE HALLAZGOS

| Variable | Disponible | Valor para Nieve | Esfuerzo | Prioridad |
|----------|-----------|------------------|----------|-----------|
| T850 | ✅ Sí | Alto | Bajo | **ALTA** |
| T500 | ✅ Sí | Bajo | Bajo | Baja |
| PWAT | ❌ No | Medio | Alto | Descartado |
| GEFS Ensemble | ❌ No | Alto | N/A | Descartado |
| ForecastRunHistory | ✅ Ya existe | Alto | Medio | **ALTA** |

---

## 🎯 RECOMENDACIONES FINALES

### Implementar (Alto valor, bajo riesgo):

1. **ForecastRunHistory** (Prioridad 1)
   - Infraestructura ya existe
   - Detecta tendencias en modelos
   - Mejora Storm Crossing Engine
   - **Esfuerzo:** 2-3 días

2. **Temperature 850 hPa** (Prioridad 2)
   - Variable disponible gratis
   - Mejora estimación de fase nieve/lluvia
   - Mejora estimación de calidad de nieve
   - **Esfuerzo:** 2-3 horas

### Descartar:

- ❌ PWAT: No disponible sin GRIB2 complejo
- ❌ GEFS Ensemble: No disponible en Open-Meteo
- ❌ Chilean data: Requiere APIs externas inexistentes
- ❌ T500: Disponible pero poco relevante para superficie

---

## 🛠️ PRÓXIMOS PASOS

1. Implementar ForecastRunHistory (esta semana)
2. Agregar T850 a GFS adapter (próxima semana)
3. Validar mejoras con observaciones reales
4. Monitorear impacto en precisión de pronósticos

**Costo total:** $0 (todo gratis con Open-Meteo)
**Riesgo:** Bajo (cambios backward compatible)
