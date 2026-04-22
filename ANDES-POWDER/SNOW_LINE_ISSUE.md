# Problema: Snow Line y Phase Classification Incorrectos

## Reporte del Usuario

**Fecha:** 10 de marzo, 2026
**Forecast extendido dice:** Sábado 14 de marzo
- **Summit (2100m):** Nieve ❄️
- **Mid (1600m):** Lluvia 🌧️
- **Base (1030m):** Lluvia 🌧️

**Freezing level real:** 2200m

**Nuestro sistema muestra:**
- **Todas las elevaciones:** Snow ❄️ (INCORRECTO)
- **Freezing level:** null
- **Snow line:** -340m (sin sentido)

---

## Análisis del Problema

### 1. Freezing Level No Se Está Calculando
```json
{
  "freezingLevel": null,  // ← PROBLEMA
  "snowLine": -340        // ← PROBLEMA
}
```

### 2. Phase Classification Incorrecta
Con freezing level a 2200m:
- **Base (1030m):** 1170m por debajo → Debería ser LLUVIA
- **Mid (1600m):** 600m por debajo → Debería ser LLUVIA
- **Summit (2100m):** 100m por debajo → Debería ser MIXTO

Pero el sistema muestra "snow" en todas partes.

### 3. Forecasts Solo Cubren 72 Horas
```sql
count |          min           |          max           
-------+------------------------+------------------------
  432 | 2026-03-10 00:00:00-03 | 2026-03-12 23:00:00-03
```

Usuario pregunta por el 14 de marzo (sábado) pero solo tenemos hasta el 12.

---

## Causas Raíz

### Causa 1: Freezing Level de Open-Meteo
Open-Meteo proporciona `freezinglevel_height` pero puede venir en null o con valores incorrectos.

```typescript
// En open-meteo/adapter.ts línea 97-100
const freezingLevels = times.map((time: Date, i: number) => ({
  time,
  heightM: data.hourly.freezinglevel_height?.[i] || 
           this.estimateFreezingLevel(data.hourly.temperature_2m[i])
}));
```

Si `freezinglevel_height` es null, estima basándose solo en temperatura de superficie, lo cual es impreciso.

### Causa 2: Estimación de Freezing Level Simplista
```typescript
// En snow-engine.ts línea 337-340
private estimateFreezingLevel(temperature: number): number {
  const lapseRate = 0.0065; // °C per meter
  return Math.max(0, temperature / lapseRate);
}
```

Con temp = 3.7°C → freezing level = 569m (INCORRECTO)
Real debería ser ~2200m

### Causa 3: Snow Line Calculation Incorrecta
```typescript
// En phase-classifier.ts
estimateSnowLine(freezingLevel, temperature, humidity) {
  const baseOffset = 300;
  const humidityAdjust = (humidity - 70) * 2;
  const tempAdjust = temperature > 0 ? temperature * 50 : 0;
  
  snowLine = freezingLevel - baseOffset + humidityAdjust + tempAdjust;
}
```

Si freezing level está mal, snow line también estará mal.

---

## Solución

### Opción 1: Usar Datos de Open-Meteo Correctamente

Open-Meteo proporciona `freezinglevel_height` que debería ser confiable. El problema es que:
1. A veces viene null
2. No estamos interpolando correctamente por elevación

**Fix:**
```typescript
// Usar freezing level directamente de Open-Meteo
const freezingLevel = data.hourly.freezinglevel_height?.[i];

if (freezingLevel && freezingLevel > 0) {
  // Usar el valor real
  forecast.freezingLevelM = freezingLevel;
} else {
  // Fallback: estimar usando temperatura a múltiples alturas
  forecast.freezingLevelM = this.estimateFreezingLevelAdvanced(
    data.hourly.temperature_2m[i],
    elevation,
    data.hourly.temperature_850hPa?.[i]  // Si disponible
  );
}
```

### Opción 2: Mejorar Estimación de Freezing Level

```typescript
private estimateFreezingLevelAdvanced(
  surfaceTemp: number,
  surfaceElevation: number,
  temp850hPa?: number
): number {
  // Si tenemos temperatura a 850 hPa (~1500m), usar eso
  if (temp850hPa !== undefined) {
    const lapseRate = 0.0065;
    const elevation850 = 1500;
    
    if (temp850hPa < 0) {
      // Freezing level está por debajo de 1500m
      return elevation850 + (temp850hPa / lapseRate);
    } else {
      // Freezing level está por encima de 1500m
      return elevation850 + (temp850hPa / lapseRate);
    }
  }
  
  // Fallback: usar temperatura de superficie con ajuste
  // Pero agregar offset porque superficie puede estar calentada por sol
  const apparentLapseRate = 0.0055; // Más conservador
  const solarOffset = 500; // metros de offset por calentamiento solar
  
  return Math.max(0, (surfaceTemp / apparentLapseRate) + solarOffset);
}
```

### Opción 3: Validar con Observaciones

```typescript
// Después de calcular freezing level, validar con temperatura observada
if (observedTemp && observedElevation) {
  const expectedTempAtElevation = 
    (freezingLevel - observedElevation) * 0.0065;
  
  const diff = Math.abs(expectedTempAtElevation - observedTemp);
  
  if (diff > 5) {
    // Freezing level está muy mal, recalcular
    freezingLevel = observedElevation + (observedTemp / 0.0065);
  }
}
```

---

## Fix Inmediato

### 1. Verificar Datos de Open-Meteo
```bash
# Ver qué datos realmente vienen de Open-Meteo
curl "https://api.open-meteo.com/v1/forecast?latitude=-41.15&longitude=-71.4&hourly=temperature_2m,freezinglevel_height&forecast_days=7" | jq '.hourly.freezinglevel_height[0:24]'
```

### 2. Agregar Logging
```typescript
console.log(`Freezing level from API: ${data.hourly.freezinglevel_height?.[i]}`);
console.log(`Estimated freezing level: ${estimatedLevel}`);
console.log(`Final freezing level: ${forecast.freezingLevelM}`);
```

### 3. Validar Phase Classification
```typescript
console.log(`Elevation: ${elevation}m, Freezing: ${freezingLevel}m, Phase: ${phase}`);
```

---

## Impacto

### Actual (Incorrecto)
```
Base (1030m): Snow ❄️ - temp 3.7°C
Mid (1600m): Snow ❄️ - temp 0°C
Summit (2100m): Snow ❄️ - temp -3.25°C
```
**Problema:** Dice que nevará en base a 3.7°C (imposible)

### Esperado (Correcto con freezing @ 2200m)
```
Base (1030m): Rain 🌧️ - temp 3.7°C (1170m bajo freezing)
Mid (1600m): Rain 🌧️ - temp 0°C (600m bajo freezing)
Summit (2100m): Mixed 🌨️ - temp -3.25°C (100m bajo freezing)
```

---

## Prioridad

**ALTA** - Esto afecta la decisión principal de los usuarios:
- ¿Nevará o lloverá?
- ¿Dónde puedo esquiar?
- ¿Qué elevación tiene nieve?

**Usuarios confiarán en pronósticos incorrectos** si no se arregla.

---

## Próximos Pasos

1. **Investigar datos de Open-Meteo** - Ver qué viene realmente
2. **Mejorar estimación de freezing level** - Usar métodos más robustos
3. **Validar con observaciones** - Comparar con datos reales
4. **Extender forecasts** - Cubrir 7 días en lugar de 3
5. **Agregar tests** - Verificar phase classification con casos conocidos

---

## Test Cases

### Test 1: Freezing Level Alto (2200m)
```
Entrada:
- Freezing level: 2200m
- Base (1030m): temp 8°C
- Mid (1600m): temp 3°C
- Summit (2100m): temp 0°C

Esperado:
- Base: Rain
- Mid: Rain
- Summit: Mixed (cerca del freezing)
```

### Test 2: Freezing Level Bajo (1500m)
```
Entrada:
- Freezing level: 1500m
- Base (1030m): temp 2°C
- Mid (1600m): temp -1°C
- Summit (2100m): temp -5°C

Esperado:
- Base: Mixed (cerca del freezing)
- Mid: Snow
- Summit: Snow
```

### Test 3: Freezing Level Muy Alto (3000m)
```
Entrada:
- Freezing level: 3000m
- Base (1030m): temp 12°C
- Mid (1600m): temp 8°C
- Summit (2100m): temp 5°C

Esperado:
- Base: Rain
- Mid: Rain
- Summit: Rain (todos bajo freezing)
```

---

## Conclusión

El sistema **NO está detectando correctamente** el freezing level y por lo tanto **clasifica mal la fase de precipitación**.

**Acción requerida:**
1. Investigar datos de Open-Meteo
2. Mejorar algoritmo de estimación
3. Validar con observaciones reales
4. Agregar tests

**Hasta que se arregle:**
- Usuarios deben verificar con otras fuentes
- Agregar disclaimer en la app
- Mostrar freezing level explícitamente para que usuarios puedan juzgar
