# Guía de Observaciones - Andes Powder

## 📊 Sistema de Aprendizaje Automático

El sistema **ya tiene** la capacidad de aprender de observaciones reales y ajustar automáticamente los factores de corrección.

---

## 🎯 Cómo Funciona

### 1. Registras Observación Real
Cuando ocurre un evento meteorológico (lluvia, nieve, etc.), registras lo que realmente pasó.

### 2. Sistema Compara con Forecast
El sistema busca qué había pronosticado para ese momento.

### 3. Calcula Error (Bias)
```
Bias = Observación Real - Forecast
Ejemplo: 18mm (real) - 16.6mm (forecast) = +1.4mm
```

### 4. Ajusta Factores Automáticamente
El sistema actualiza `precipitation_bias_factor` para mejorar futuros forecasts.

---

## 📝 Métodos para Registrar Observaciones

### Método 1: API REST (Recomendado)

**Endpoint:**
```
POST http://localhost:3000/api/observations
```

**Body:**
```json
{
  "resortSlug": "cerro-catedral",
  "observationType": "precipitation",
  "value": 18.0,
  "elevationBand": "mid",
  "observedAt": "2026-03-14T20:00:00Z",
  "notes": "Lluvia intensa tarde/noche"
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{
    "resortSlug": "cerro-catedral",
    "observationType": "precipitation",
    "value": 18.0,
    "elevationBand": "mid",
    "observedAt": "2026-03-14T20:00:00Z"
  }'
```

### Método 2: Script de Línea de Comandos

```bash
cd backend
npx tsx src/scripts/record-observation.ts
```

**Prompts interactivos:**
```
Resort slug: cerro-catedral
Observation type: precipitation
Value: 18.0
Elevation band: mid
Date/time: 2026-03-14T20:00:00Z
```

### Método 3: Interfaz Web (Futuro)

Crear una página simple en la app móvil:
```
📊 Registrar Observación
- Resort: [Cerro Catedral]
- Tipo: [Precipitación ▼]
- Cantidad: [18] mm
- Elevación: [Mid ▼]
- [Enviar]
```

---

## 📊 Tipos de Observaciones

### 1. Precipitación
```json
{
  "observationType": "precipitation",
  "value": 18.0,  // mm
  "notes": "Lluvia intensa"
}
```

### 2. Temperatura
```json
{
  "observationType": "temperature",
  "value": 5.2,  // °C
  "elevationBand": "mid"
}
```

### 3. Nieve Acumulada
```json
{
  "observationType": "snowfall",
  "value": 25.0,  // cm
  "elevationBand": "summit"
}
```

### 4. Viento
```json
{
  "observationType": "wind_speed",
  "value": 45.0,  // km/h
  "elevationBand": "summit"
}
```

---

## 🎯 Ejemplo Completo: 14 Marzo 2026

### Situación
- **Forecast:** 16.6mm de lluvia
- **Realidad:** Llovió 18mm (observado)

### Paso 1: Registrar Observación
```bash
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{
    "resortSlug": "cerro-catedral",
    "observationType": "precipitation",
    "value": 18.0,
    "elevationBand": "mid",
    "observedAt": "2026-03-14T23:00:00Z",
    "notes": "Medición real - lluvia intensa tarde/noche"
  }'
```

### Paso 2: Sistema Calcula Automáticamente
```
Bias = 18.0mm - 16.6mm = +1.4mm
Error relativo = +8.4%
```

### Paso 3: Ajuste Automático
```
Nuevo precipitation_bias_factor = 2.0 * 1.084 = 2.17
```

### Paso 4: Próximo Forecast
El sistema ahora usará factor 2.17 en lugar de 2.0, mejorando precisión.

---

## 📈 Monitoreo de Aprendizaje

### Ver Observaciones Recientes
```bash
curl http://localhost:3000/api/observations/cerro-catedral/recent
```

### Ver Bias Actual
```bash
curl http://localhost:3000/api/observations/cerro-catedral/bias
```

**Respuesta:**
```json
{
  "resort": "Cerro Catedral",
  "biases": {
    "temperature": {
      "base": +2.3,
      "mid": +1.8,
      "summit": +0.5
    },
    "precipitation": {
      "overall": +1.4
    }
  },
  "sampleSize": 5,
  "lastUpdated": "2026-03-14T23:30:00Z"
}
```

---

## 🔄 Flujo de Aprendizaje

```
1. Forecast Generado
   ↓
2. Evento Ocurre (lluvia, nieve, etc.)
   ↓
3. Observación Registrada (manual o automático)
   ↓
4. Sistema Compara
   ↓
5. Calcula Bias
   ↓
6. Actualiza Correction Profile
   ↓
7. Próximo Forecast Más Preciso
```

---

## 🎯 Recomendaciones

### Para Mejorar Precisión Rápidamente

**Registra observaciones de:**
1. **Eventos significativos** (>10mm lluvia, >10cm nieve)
2. **Diferentes elevaciones** (base, mid, summit)
3. **Diferentes condiciones** (lluvia, nieve, mixto)
4. **Temperatura** cuando haya discrepancia notable

**Frecuencia:**
- Mínimo: 1 observación por evento significativo
- Ideal: 1 observación por semana
- Óptimo: Conexión automática con estación meteorológica

---

## 🚀 Futuro: Conexión Automática

### Fuentes Potenciales

1. **Estación de Cerro Catedral**
   - Requiere: Acceso a API o datos
   - Beneficio: Datos cada hora automáticamente

2. **SMN Argentina**
   - API pública disponible
   - Estaciones cercanas a Bariloche

3. **Weather Underground**
   - Estaciones amateur
   - API gratuita (limitada)

4. **Scraping Snow-Forecast**
   - Comparación automática
   - Requiere: Scraper cuidadoso

---

## 📝 Estado Actual

**Sistema de Observaciones:** ✅ Implementado
**API REST:** ✅ Funcionando
**Cálculo de Bias:** ✅ Automático
**Ajuste de Factores:** ✅ Automático
**Conexión Automática:** ❌ No implementada (manual por ahora)

---

## 💡 Próximo Paso

**Para el 14 de Marzo:**
1. Observa cuánto llovió realmente
2. Registra la observación (API o script)
3. Sistema ajustará automáticamente
4. Próximos forecasts serán más precisos

**Comando rápido:**
```bash
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{"resortSlug":"cerro-catedral","observationType":"precipitation","value":18.0,"elevationBand":"mid","observedAt":"2026-03-14T23:00:00Z"}'
```

---

**El sistema aprende, solo necesita que le digas qué pasó realmente.** 🎿
