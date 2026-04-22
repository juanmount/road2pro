# CONFIDENCE SCORING - INTEGRATION GUIDE

## ✅ IMPLEMENTADO

### Backend
- ✅ `ConfidenceService` calcula score 0-10
- ✅ Factores: Model Agreement (50%), Lead Time (30%), Ensemble Spread (20%)
- ✅ Categorías: HIGH (≥7.5), MEDIUM (≥5.0), LOW (<5.0)
- ✅ Mensajes en español contextualizados

### Frontend
- ✅ `ConfidenceBadge` component con modo compacto y expandido
- ✅ Integrado en `DailyForecastCard`
- ✅ Color coding: Verde/Naranja/Rojo

---

## 🔧 CÓMO USAR

### En el Backend (cuando esté conectado)

El `ConfidenceService` ya calcula el score automáticamente en el forecast engine:

```typescript
// En snow-engine.ts
const confidence = this.confidenceService.calculateConfidence(
  ecmwf,
  gfs,
  gefs,
  timeIndex,
  elevationBand
);

// Retorna:
// {
//   score: 8.2,
//   agreement: 0.92,
//   spread: 0.15,
//   horizon: 0.10,
//   reason: "Alta confianza - Modelos coinciden, pronóstico de corto plazo"
// }
```

### En el Frontend

**Modo Compacto (en cards):**
```tsx
<ConfidenceBadge 
  score={7.8} 
  compact={true} 
/>
// Muestra: ✅ Alta
```

**Modo Expandido (en modales):**
```tsx
<ConfidenceBadge 
  score={7.8}
  reason="Alta confianza - Modelos coinciden"
  compact={false}
/>
// Muestra: Emoji + "Confianza Alta" + razón
```

---

## 📊 EJEMPLOS DE SCORES

### HIGH Confidence (7.5-10)
```
Score: 8.5
- ECMWF y GFS coinciden (diferencia <10%)
- Pronóstico 24-48h
- Mensaje: "Alta confianza - Modelos coinciden"
- Color: Verde ✅
```

### MEDIUM Confidence (5.0-7.4)
```
Score: 6.2
- ECMWF y GFS difieren 20-30%
- Pronóstico 72-120h
- Mensaje: "Confianza moderada - Revisá más cerca de la fecha"
- Color: Naranja ⚠️
```

### LOW Confidence (0-4.9)
```
Score: 3.8
- ECMWF y GFS difieren >50%
- Pronóstico 168h+
- Mensaje: "Baja confianza - Modelos no coinciden"
- Color: Rojo ❌
```

---

## 🎯 PRÓXIMOS PASOS

### Para que funcione en producción:

1. **Backend debe exponer confidence en API:**
   ```typescript
   // En /api/resorts/:id/forecast
   {
     "date": "2026-03-20",
     "snowfall": 12,
     "confidenceScore": 8.2,
     "confidenceReason": "Alta confianza - Modelos coinciden"
   }
   ```

2. **Frontend debe pasar confidence a DailyForecastCard:**
   ```tsx
   <DailyForecastCard
     day="SAT"
     date="Mar 20"
     snowfall={12}
     confidenceScore={8.2}
     confidenceReason="Alta confianza - Modelos coinciden"
     // ... otros props
   />
   ```

3. **Testear con datos reales de Catedral**

---

## 🧪 TESTING

### Datos Mock para Testing:
```typescript
// Alta confianza
const mockHighConfidence = {
  score: 8.5,
  reason: "Alta confianza - Modelos coinciden, pronóstico de corto plazo"
};

// Confianza moderada
const mockMediumConfidence = {
  score: 6.0,
  reason: "Confianza moderada - Modelos difieren levemente"
};

// Baja confianza
const mockLowConfidence = {
  score: 3.5,
  reason: "Baja confianza - Modelos no coinciden"
};
```

### Cómo testear visualmente:
1. Abrir app en simulador
2. Ver forecast de Catedral
3. Las cards con nieve deberían mostrar badge de confianza
4. Tocar card para ver modal con detalles expandidos

---

## 📱 VISUAL REFERENCE

### Card Compacta:
```
┌─────────────────────┐
│ SAT                 │
│ Mar 20              │
│                     │
│ 🌨️                  │
│                     │
│ 25 km/h             │
│ 8°/-2°              │
│                     │
│ ┌─────────────────┐ │
│ │ SNOWFALL        │ │
│ │ 12 cm           │ │
│ └─────────────────┘ │
│                     │
│ ✅ Alta             │  ← CONFIDENCE BADGE
│                     │
└─────────────────────┘
```

### Modal Expandido:
```
┌──────────────────────────────────┐
│ SÁBADO                           │
│ Mar 20                      ✕    │
├──────────────────────────────────┤
│                                  │
│ ❄️ Great powder day!             │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Confianza del Pronóstico     │ │
│ │                              │ │
│ │        ✅                    │ │
│ │   Confianza Alta             │ │
│ │                              │ │
│ │ Alta confianza - Modelos     │ │
│ │ coinciden, pronóstico de     │ │
│ │ corto plazo                  │ │
│ └──────────────────────────────┘ │
│                                  │
│ Hourly Forecast...               │
│                                  │
└──────────────────────────────────┘
```

---

## ✨ BENEFICIOS

1. **Transparencia:** Usuario sabe cuándo confiar
2. **Honestidad:** Admitimos incertidumbre
3. **Acción clara:** ¿Planificar ahora o esperar?
4. **Diferenciación:** Otros apps no muestran confianza

---

## 🚀 LISTO PARA USAR

El sistema está **100% implementado** en frontend.

Solo falta que el backend exponga `confidenceScore` y `confidenceReason` en el API de forecast.

Cuando eso esté listo, el confidence badge aparecerá automáticamente en todas las cards con nieve.
