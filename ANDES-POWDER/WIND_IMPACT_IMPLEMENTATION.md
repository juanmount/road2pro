# Wind Impact Engine - Implementation Summary

## 🎯 Objetivo
Mejorar el análisis y exposición del viento al usuario, considerando:
- Ajuste de viento por elevación
- Categorización de severidad
- Sensación térmica (wind chill)
- Riesgo de cierre de lifts
- Recomendaciones y alertas

## ✅ Backend Implementado

### 1. Wind Impact Engine (`/backend/src/engine/wind-impact-engine.ts`)

**Funcionalidades:**
- **Ajuste por elevación**: Viento aumenta ~40% por cada 1000m
- **Categorías de viento**: CALM, MODERATE, STRONG, EXTREME
- **Wind chill**: Cálculo de sensación térmica
- **Riesgo de lifts**: OPEN, CAUTION, HIGH_RISK, CLOSED
- **Skiability score**: 0-100 considerando viento y temperatura
- **Recomendaciones**: Texto contextual según condiciones
- **Warnings**: Alertas automáticas para condiciones peligrosas

**Umbrales:**
```
CALM:     0-15 km/h   → Condiciones ideales
MODERATE: 15-30 km/h  → Esquiable con precaución
STRONG:   30-50 km/h  → Difícil, lifts en riesgo
EXTREME:  50+ km/h    → Peligroso, cerrado
```

**Lift Closure Risk:**
```
OPEN:      < 30 km/h  → Operación normal
CAUTION:   30-45 km/h → Posibles demoras
HIGH_RISK: 45-60 km/h → Pueden cerrar
CLOSED:    60+ km/h   → Cerrado
```

### 2. Integración en SnowEngine

- Agregado `WindImpactEngine` al constructor
- Procesamiento para todas las elevaciones (base, mid, summit)
- Agregación diaria de datos horarios
- Logging de alertas de viento extremo

### 3. Tipos en Models (`/backend/src/domain/models.ts`)

```typescript
export type WindCategory = 'CALM' | 'MODERATE' | 'STRONG' | 'EXTREME';
export type LiftRisk = 'OPEN' | 'CAUTION' | 'HIGH_RISK' | 'CLOSED';

export interface WindImpactAnalysis {
  windSpeedKmh: number;        // Viento base
  adjustedWindKmh: number;     // Ajustado por elevación
  category: WindCategory;       // Categoría de severidad
  windChill: number;           // Sensación térmica
  liftRisk: LiftRisk;          // Riesgo de cierre
  skiability: number;          // Score 0-100
  recommendation: string;       // Recomendación textual
  warnings: string[];          // Alertas activas
}

export interface WindImpactForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  elevationMeters: number;
  analysis: WindImpactAnalysis;
}
```

### 4. API Endpoint

**Endpoint:** `GET /api/resorts/:id/wind-impact`

**Response:**
```json
{
  "resortId": "uuid",
  "resortName": "Cerro Catedral",
  "issuedAt": "2026-03-11T...",
  "totalForecasts": 21,
  "forecasts": [
    {
      "validTime": "2026-03-13T12:00:00.000Z",
      "elevation": "summit",
      "elevationMeters": 2100,
      "analysis": {
        "windSpeedKmh": 12,
        "adjustedWindKmh": 25,
        "category": "MODERATE",
        "windChill": -8.5,
        "liftRisk": "OPEN",
        "skiability": 85,
        "recommendation": "Viento moderado. Condiciones esquiables con precaución.",
        "warnings": []
      }
    }
  ]
}
```

## 📋 Próximos Pasos - Frontend

### 1. Fetch Wind Impact Data
- Agregar servicio en `/mobile/services/resorts.ts`
- Llamar endpoint en `resort/[id]/index.tsx`
- Mapear datos a componentes

### 2. Actualizar LIVE Card
- Mostrar viento ajustado por elevación
- Agregar categoría con color
- Mostrar wind chill si es relevante
- Alertas visuales para viento fuerte

### 3. Actualizar Daily Forecast Cards
- Viento con color según categoría
- Icono de alerta si STRONG/EXTREME
- Tooltip con más info al tocar

### 4. Modal de Análisis Detallado
- Similar a Snow Reality modal
- Mostrar todos los detalles:
  - Viento base vs ajustado
  - Categoría y explicación
  - Wind chill
  - Riesgo de lifts
  - Skiability score
  - Recomendaciones
  - Warnings activas

## 🎨 Diseño Visual Propuesto

### Colores por Categoría:
- **CALM**: Verde (#22c55e)
- **MODERATE**: Azul (#3b82f6)
- **STRONG**: Naranja (#fb923c)
- **EXTREME**: Rojo (#ef4444)

### Iconos:
- 🌬️ Viento general
- ⚠️ Alerta
- 🚡 Lifts
- 🥶 Frío extremo
- 💨 Visibilidad reducida

## 📊 Ejemplo de Uso

**Escenario: Summit con viento fuerte**
```
Viento Base: 35 km/h (aeropuerto 840m)
Summit: 2100m
Ajustado: 52 km/h
Categoría: EXTREME
Temp: -5°C
Wind Chill: -18°C

Warnings:
⚠️ VIENTO EXTREMO - Condiciones peligrosas
🚡 ALTO RIESGO - Lifts pueden cerrar
🥶 SENSACIÓN TÉRMICA EXTREMA - Riesgo de congelamiento
💨 Visibilidad reducida por nieve volando

Recommendation:
"Condiciones extremas. Buscar zonas protegidas o considerar no esquiar."

Skiability: 20/100
Lift Risk: HIGH_RISK
```

## 🔧 Testing

Para probar:
1. Iniciar backend: `npm run dev`
2. Llamar: `http://localhost:3001/api/resorts/cerro-catedral/wind-impact`
3. Verificar datos de viento ajustados por elevación
4. Confirmar categorías y warnings

## 📝 Notas Técnicas

- **Ajuste de elevación**: Basado en estudios meteorológicos estándar
- **Wind chill**: Fórmula North American estándar
- **Umbrales de lifts**: Basados en operación típica de ski resorts
- **Agregación diaria**: Usa condiciones peak (peor caso) para seguridad
