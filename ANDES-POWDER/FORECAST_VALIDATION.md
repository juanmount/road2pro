# Validación de Forecast - 11 Marzo 2026

## Datos Esperados (Usuario)

**Miércoles 11 marzo:**
- Máxima al mediodía: **10°C**
- Ligera lluvia por la noche
- Freezing level noche: **3550m**

---

## Datos de Open-Meteo (API Real)

```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=-41.15&longitude=-71.4&hourly=temperature_2m,precipitation,freezinglevel_height&timezone=America/Argentina/Buenos_Aires&forecast_days=3"
```

**Resultados:**
- **Mediodía (12:00):** 18.6°C
- **Noche (20:00):** Freezing level 3460m
- **Precipitación:** 0.0mm

**Análisis:**
- ✅ Freezing level: 3460m vs 3550m esperado = **90m diferencia** (excelente)
- ⚠️ Temperatura: 18.6°C vs 10°C esperado = **+8.6°C diferencia** (alta, pero puede ser correcta)
- ⚠️ Precipitación: 0.0mm vs "ligera lluvia" = Puede ser muy poca o más tarde

---

## Datos en Nuestra Base de Datos

```sql
SELECT valid_time, temperature_c, precipitation_mm, freezing_level_m
FROM elevation_forecasts
WHERE resort_id = (SELECT id FROM resorts WHERE slug = 'cerro-catedral')
AND valid_time::date = '2026-03-11'
AND elevation_band = 'base';
```

**Resultados:**
- **TODO EL DÍA:** 3.7°C constante ❌
- **Precipitación:** 0.0mm
- **Freezing level:** 570m ❌

---

## Comparación

| Métrica | Open-Meteo (Real) | Nuestra DB | Error |
|---------|-------------------|------------|-------|
| **Temp mediodía** | 18.6°C | 3.7°C | **-14.9°C** ❌ |
| **Freezing level** | 3460m | 570m | **-2890m** ❌ |
| **Variación diurna** | Sí | No | **Sin variación** ❌ |

---

## Conclusión

**Open-Meteo tiene datos correctos** ✅

**Nuestro sistema NO está procesando los datos correctamente** ❌

### Problemas Identificados:

1. **Datos estáticos:** Todos los valores son 3.7°C (sin variación horaria)
2. **Datos viejos:** Parece estar usando el primer fetch del 10 marzo
3. **No se actualiza:** Los forecasts no se están reprocesando

---

## Causa Raíz

### Hipótesis 1: Datos Cached
El sistema hizo un fetch inicial y guardó esos datos, pero no se están actualizando.

### Hipótesis 2: Interpolación Incorrecta
El código de interpolación por elevación está usando el mismo valor para todas las horas.

### Hipótesis 3: Procesamiento Incorrecto
El loop que procesa los datos horarios no está iterando correctamente.

---

## Solución

### 1. Reprocesar Forecasts
```bash
cd backend
npx tsx src/test-multi-model.ts
```

Esto debería:
- Fetch datos frescos de Open-Meteo
- Procesar correctamente por hora
- Guardar en la base de datos

### 2. Verificar Código de Procesamiento

**En `snow-engine.ts` línea 166:**
```typescript
for (let i = 0; i < Math.min(forecast.base.length, 72); i++) {
  const basePoint = await this.processTimePoint(
    resort,
    'base',
    resort.baseElevation,
    forecast.base[i],  // ← Verificar que [i] cambia
    i,
    modelAgreements
  );
  base.push(basePoint);
}
```

**Verificar que `forecast.base[i]` tiene datos diferentes por hora.**

### 3. Verificar Normalización en Open-Meteo Adapter

**En `open-meteo/adapter.ts`:**
```typescript
const times = data.hourly.time.map((t: string) => new Date(t));

const baseTimeSeries: TimeSeriesPoint[] = times.map((time: Date, i: number) => ({
  time,
  temperature: data.hourly.temperature_2m[i],  // ← Verificar índice
  precipitation: data.hourly.precipitation[i],
  // ...
}));
```

**Verificar que el índice `i` está funcionando correctamente.**

---

## Test de Validación

### Después de Reprocesar, Verificar:

```sql
-- Debe mostrar variación de temperatura
SELECT 
  TO_CHAR(valid_time, 'HH24:MI') as hora,
  ROUND(temperature_c::numeric, 1) as temp,
  freezing_level_m
FROM elevation_forecasts
WHERE resort_id = (SELECT id FROM resorts WHERE slug = 'cerro-catedral')
AND valid_time::date = '2026-03-11'
AND elevation_band = 'base'
AND EXTRACT(hour FROM valid_time) IN (0, 6, 12, 18, 23)
ORDER BY valid_time;
```

**Esperado:**
```
 hora  | temp  | freezing_level_m
-------+-------+-----------------
 00:00 |  ~8   |     ~2500
 06:00 |  ~6   |     ~2200
 12:00 | ~18   |     ~3500
 18:00 | ~15   |     ~3400
 23:00 | ~10   |     ~2800
```

---

## Acción Inmediata

1. **Reprocesar forecasts ahora:**
```bash
npx tsx src/test-multi-model.ts
```

2. **Verificar datos actualizados:**
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast/current | jq '.byElevation.base.temperature'
```

3. **Si sigue igual, debuggear:**
   - Agregar console.log en processTimePoint
   - Verificar que forecast.base[i] cambia
   - Verificar que se está guardando correctamente

---

## Próximos Pasos

1. ✅ Identificar que Open-Meteo tiene datos correctos
2. ⏳ Reprocesar forecasts
3. ⏳ Verificar que datos se actualizan
4. ⏳ Si no funciona, debuggear código de procesamiento
5. ⏳ Agregar tests automáticos para detectar datos estáticos

---

## Lecciones Aprendidas

1. **Siempre verificar la fuente de datos primero** - Open-Meteo estaba correcto
2. **Datos estáticos = bug en procesamiento** - No es problema de la API
3. **Validación con datos reales es crucial** - Usuario detectó el problema
4. **Necesitamos tests automáticos** - Para detectar esto antes

---

## Estado Actual

- ❌ Sistema muestra datos incorrectos
- ✅ Open-Meteo tiene datos correctos
- ⏳ Necesita reprocesamiento
- ⏳ Posible bug en código de procesamiento
