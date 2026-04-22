# Andes Powder - Quick Start Guide 🎿❄️

## Sistema Completo de Snow Intelligence - Listo para Usar

---

## 🚀 Inicio Rápido

### 1. Backend (Ya corriendo)
```bash
cd backend
npm run dev
```
✅ Backend corriendo en `http://localhost:3000`

### 2. Mobile App
```bash
cd mobile
npm start
# Presiona 'i' para iOS simulator
# O escanea QR con Expo Go en tu teléfono
```

---

## 📱 Nuevas Features en la App

### **Confidence Badges** 🎯
Ahora verás badges de confianza en cada forecast:
- 🟢 **8-10**: High confidence (verde)
- 🔵 **6-8**: Good confidence (azul)
- 🟠 **4-6**: Moderate confidence (naranja)
- 🔴 **0-4**: Low confidence (rojo)

**Ejemplo:** "5.8/10 - Moderate confidence, fair model agreement"

### **Phase Classification** ❄️🌧️
Indica el tipo de precipitación por elevación:
- ❄️ **Snow** (azul) - Nieve
- 🌧️ **Rain** (azul oscuro) - Lluvia
- 🌨️ **Mixed** (naranja) - Mixto
- 🌨️ **Sleet** (naranja claro) - Aguanieve

### **Snow Quality** ⭐
Clasificación de calidad de nieve:
- **Powder** - Polvo perfecto (frío, sin viento)
- **Compact** - Compacta (condiciones normales)
- **Wet** - Húmeda (temperaturas cálidas)
- **Heavy** - Pesada (mucha nieve)

### **Elevation-Specific Data** 🏔️
Datos diferentes para cada elevación:
- **Base** (1030m) - Más cálido
- **Mid** (1600m) - Condiciones medias
- **Summit** (2100m) - Más frío, mejor nieve

---

## 🧪 Cómo Probar

### Paso 1: Ver Lista de Resorts
1. Abre la app
2. Verás 4 resorts argentinos
3. Cada uno muestra su powder score

### Paso 2: Ver Detalles de Resort
1. Toca "Cerro Catedral"
2. Verás:
   - **Powder Score**: 3.0/10
   - **Confidence Badge**: 5.8/10 (Moderate confidence)
   - **Phase Badge**: ❄️ Snow
   - **Snow Quality**: Compact
   - **Temperaturas por elevación**:
     - Base: 3.7°C (más cálido)
     - Mid: 0°C (en el punto de congelación)
     - Summit: -3.25°C (frío, mejor para nieve)

### Paso 3: Comparar Elevaciones
1. Scroll hacia abajo
2. Verás las 3 elevaciones lado a lado
3. Nota cómo cambian:
   - Temperatura (más frío arriba)
   - Powder score (mejor arriba)
   - Snow quality (diferente por elevación)

---

## 🔍 Qué Significa Cada Dato

### Powder Score (0-10)
- **8-10**: Condiciones épicas 🎉
- **6-8**: Muy buenas condiciones ⭐
- **4-6**: Condiciones decentes ✓
- **2-4**: Condiciones regulares 😐
- **0-2**: Condiciones pobres ❌

### Confidence Score (0-10)
Indica qué tan seguros estamos del pronóstico:
- **Alta (8-10)**: Los modelos coinciden perfectamente
- **Buena (6-8)**: Los modelos están de acuerdo
- **Moderada (4-6)**: Hay algo de desacuerdo
- **Baja (0-4)**: Los modelos no coinciden

### Phase Classification
- **Snow**: Toda la precipitación será nieve ❄️
- **Rain**: Toda la precipitación será lluvia 🌧️
- **Mixed**: Mezcla de nieve y lluvia 🌨️

### Snow Quality
- **Powder**: Nieve polvo perfecta para esquiar
- **Compact**: Nieve compacta, buena para esquiar
- **Wet**: Nieve húmeda, más pesada
- **Heavy**: Nieve pesada, más difícil

---

## 📊 Datos Técnicos Disponibles

### Por Elevación
- Temperatura actual
- Snowfall 24h (cm)
- Powder score
- Skiability score
- Wind speed
- Wind impact
- Phase classification
- Snow quality
- Confidence score

### General
- Snow line (línea de nieve)
- Freezing level (nivel de congelación)
- Overall confidence
- Model agreement

---

## 🎯 Casos de Uso

### Planificar un Día de Ski
1. Abre la app
2. Compara powder scores de los 4 resorts
3. Mira el confidence score
4. Si es alto (>7), confía en el pronóstico
5. Si es bajo (<5), verifica más tarde

### Elegir Elevación
1. Entra al resort
2. Compara las 3 elevaciones
3. Si hace calor en base → sube a mid o summit
4. Si hay viento en summit → quédate en mid
5. Usa los powder scores por elevación

### Verificar Tipo de Precipitación
1. Mira el phase badge
2. ❄️ Snow → perfecto para esquiar
3. 🌧️ Rain → mejor quedarse en casa
4. 🌨️ Mixed → verifica la elevación

---

## 🔧 APIs Disponibles

### Get All Resorts
```bash
curl http://localhost:3000/api/resorts | jq '.'
```

### Get Current Conditions
```bash
curl http://localhost:3000/api/resorts/cerro-catedral/forecast/current | jq '.'
```

**Response incluye:**
- Powder score
- Confidence score + reason
- Phase classification
- Snow quality
- Freezing level
- Snow line
- Datos por elevación (base, mid, summit)

---

## 📈 Datos en Tiempo Real

### Cerro Catedral (Ejemplo Actual)
```json
{
  "powderScore": 3,
  "confidence": {
    "score": 5.8,
    "reason": "Moderate confidence, fair model agreement"
  },
  "phase": "snow",
  "snowQuality": "compact",
  "byElevation": {
    "base": {
      "temperature": 3.7,
      "powderScore": 1,
      "phase": "snow",
      "snowQuality": "wet"
    },
    "mid": {
      "temperature": 0,
      "powderScore": 3,
      "phase": "snow",
      "snowQuality": "compact"
    },
    "summit": {
      "temperature": -3.25,
      "powderScore": 3,
      "phase": "snow",
      "snowQuality": "compact"
    }
  }
}
```

**Interpretación:**
- Powder score moderado (3/10)
- Confianza moderada (5.8/10)
- Todo será nieve ❄️
- Base está cálida (3.7°C) → nieve húmeda
- Mid está en punto de congelación (0°C) → nieve compacta
- Summit está frío (-3.25°C) → mejores condiciones

---

## 🎨 UI Components Nuevos

### ConfidenceBadge
```tsx
<ConfidenceBadge score={5.8} size="small" />
```
Muestra el confidence score con color apropiado.

### PhaseBadge
```tsx
<PhaseBadge phase="snow" size="small" />
```
Muestra el tipo de precipitación con emoji.

---

## 🐛 Troubleshooting

### Backend no responde
```bash
cd backend
npm run dev
```

### Mobile app no carga datos
1. Verifica que backend esté corriendo
2. Verifica la IP en `mobile/config/api.ts`
3. Debe ser `http://192.168.1.51:3000/api` (tu IP local)

### No hay datos de forecast
```bash
cd backend
npm run cron:forecast
```

### Datos antiguos
Los forecasts se actualizan cada 6 horas automáticamente.
Para forzar actualización:
```bash
cd backend
npx tsx src/test-multi-model.ts
```

---

## 📚 Documentación Completa

- `PRODUCTION_ARCHITECTURE.md` - Arquitectura completa
- `PHASE1_COMPLETE.md` - Multi-model system
- `PHASE2_COMPLETE.md` - Confidence scoring
- `PHASE3_COMPLETE.md` - Snow intelligence
- `IMPLEMENTATION_COMPLETE.md` - Resumen final

---

## 🚀 Próximos Pasos

1. **Prueba la app** en el simulador
2. **Compara los 4 resorts**
3. **Explora los datos por elevación**
4. **Verifica los confidence scores**
5. **Observa los phase badges**

---

## 💡 Tips

- **Confidence alto (>7)**: Confía en el pronóstico
- **Powder score alto (>6)**: ¡Buen día para esquiar!
- **Phase = Snow**: Perfecto ❄️
- **Snow quality = Powder**: ¡Condiciones épicas!
- **Summit frío + Mid templado**: Sube a summit
- **Base cálido**: Evita base, sube más arriba

---

## ✅ Checklist de Features

- ✅ Multi-model forecasting (ECMWF, GFS, GEFS)
- ✅ Confidence scoring (0-10)
- ✅ Phase classification (snow/rain/mixed)
- ✅ Snow quality classification
- ✅ Elevation-specific data (base/mid/summit)
- ✅ Powder scores por elevación
- ✅ Wind impact assessment
- ✅ Mobile UI con badges
- ✅ APIs completas
- ✅ 216 forecasts por resort

---

**¡Todo listo para usar! 🎿❄️**

Abre la app y explora las nuevas features de snow intelligence.
