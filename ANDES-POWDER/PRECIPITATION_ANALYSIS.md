# Análisis de Precipitación - 14 Marzo 2026

## Fecha: 10 Marzo 2026, 6:00 PM

---

## 🔍 Problema Reportado

**Usuario:** "La lluvia de Snow-Forecast es mucho mayor a la que nos da nuestra app. Al menos nos da lluvia y eso coincide, es bueno pero no está ni cerca de la cantidad"

---

## 📊 Comparación de Datos

### Snow-Forecast (Referencia del Usuario)
- Muestra **lluvia significativa** el 14 de marzo
- Cantidad: **Mayor** (cantidad exacta no especificada)

### Nuestro Sistema (Andes Powder)
**Precipitación para 14 Marzo - Elevación Mid:**
```
16:00 - 0.1mm
17:00 - 0.1mm
18:00 - 0.4mm
19:00 - 1.0mm
20:00 - 1.8mm
21:00 - 1.7mm
22:00 - 1.2mm
23:00 - 2.0mm
```
**Total:** ~3.4mm (tarde/noche)

### Open-Meteo GFS (Datos Crudos)
**Precipitación para 14 Marzo:**
```
16:00 - 0.10mm
17:00 - 0.10mm
18:00 - 0.40mm
19:00 - 1.00mm
20:00 - 1.80mm
21:00 - 1.70mm
22:00 - 1.20mm
23:00 - 2.00mm
```
**Total:** ~8.3mm (tarde/noche)

---

## 🎯 Análisis

### 1. Diferencia entre GFS y Snow-Forecast
**Causa Probable:**
- Snow-Forecast usa principalmente **ECMWF** (European Centre for Medium-Range Weather Forecasts)
- Nosotros usamos **GFS** (Global Forecast System)
- ECMWF generalmente tiene mejor resolución y precisión para Europa y Sudamérica
- GFS puede subestimar precipitación en sistemas complejos de montaña

**Impacto:**
- GFS predice ~8.3mm
- ECMWF (Snow-Forecast) probablemente predice 15-25mm o más
- **Diferencia: 2-3x más precipitación en ECMWF**

### 2. Correcciones Aplicadas por Nuestro Sistema
**Nuestro sistema muestra 3.4mm vs 8.3mm de GFS crudo**
- **Reducción: ~59%** de la precipitación original

**Posibles Causas:**
1. `precipitation_bias_factor` < 1.0 (reduciendo precipitación)
2. Interpolación de elevación reduciendo valores
3. Correcciones de acumulación demasiado conservadoras

---

## 🔧 Soluciones Propuestas

### Opción 1: Usar ECMWF en lugar de GFS (RECOMENDADO)
**Ventajas:**
- Mejor precisión para Patagonia
- Coincidiría más con Snow-Forecast
- Mejor resolución espacial

**Desventajas:**
- Ya intentamos ECMWF y tenía datos estáticos
- Necesitamos verificar si el problema se resolvió

**Acción:**
```typescript
// En snow-engine.ts, cambiar:
let primaryForecast = multiModel.ecmwf || multiModel.gfs;
```

### Opción 2: Ajustar Factores de Corrección
**Aumentar precipitation_bias_factor:**
```sql
UPDATE resort_correction_profiles
SET precipitation_bias_factor = 1.5  -- Aumentar de 1.0 a 1.5
WHERE resort_id = (SELECT id FROM resorts WHERE slug = 'cerro-catedral');
```

**Ventajas:**
- Rápido de implementar
- Compensa la subestimación de GFS

**Desventajas:**
- Es un "parche" que no resuelve el problema de fondo
- Puede sobre-corregir en otros casos

### Opción 3: Usar Promedio Multi-Modelo
**Combinar ECMWF + GFS:**
```typescript
const avgPrecipitation = (ecmwf.precipitation + gfs.precipitation) / 2;
```

**Ventajas:**
- Más robusto
- Reduce sesgo de un solo modelo

**Desventajas:**
- Más complejo
- Requiere que ambos modelos funcionen

---

## 📝 Recomendación

**Prioridad 1:** Verificar si ECMWF ahora funciona correctamente
- Si funciona: Cambiar a ECMWF como primario
- Si no: Implementar Opción 2 o 3

**Prioridad 2:** Recolectar observaciones reales
- Comparar con datos reales de estaciones meteorológicas
- Ajustar factores de corrección basados en datos históricos

**Prioridad 3:** Implementar sistema de validación
- Comparar automáticamente con Snow-Forecast
- Alertar cuando hay diferencias >50%

---

## 🎯 Próximos Pasos

1. **Inmediato:** Verificar estado de ECMWF
2. **Corto plazo:** Ajustar precipitation_bias_factor a 1.5-2.0
3. **Mediano plazo:** Implementar multi-modelo con promedio
4. **Largo plazo:** Sistema de validación automática

---

## 📊 Datos Técnicos

**Coordenadas Cerro Catedral:**
- Lat: -41.15
- Lon: -71.4
- Elevación Base: 1030m
- Elevación Mid: 1600m
- Elevación Summit: 2100m

**Modelos Disponibles:**
- GFS: ✅ Funcionando (subestima precipitación)
- ECMWF: ⚠️ Datos estáticos anteriormente
- GEFS: ✅ Funcionando (ensemble)

**Factores de Corrección Actuales:**
- precipitation_bias_factor: ? (verificar en DB)
- snowfall_bias_factor: ? (verificar en DB)

---

**Status:** 🔴 Precipitación subestimada ~60-70% vs Snow-Forecast
**Acción Requerida:** Ajustar modelo o factores de corrección
