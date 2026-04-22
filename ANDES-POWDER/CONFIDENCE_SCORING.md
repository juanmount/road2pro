# CONFIDENCE SCORING - ANDES POWDER

## 🎯 Objetivo

**Mostrar al usuario cuándo puede confiar en el pronóstico.**

No todos los pronósticos son iguales. Algunos son más confiables que otros.

---

## 📊 Cómo se Calcula (0-10)

### Fórmula:
```
Confidence = (Model Agreement × 50%) + (Lead Time × 30%) + (Ensemble Spread × 20%)
```

### 1. Model Agreement (50% peso)
**¿Los modelos coinciden?**

- ECMWF vs GFS snowfall
- ECMWF vs GFS temperature  
- ECMWF vs GFS freezing level

**Scoring:**
- Diferencia <10% en nieve = 1.0 (excelente)
- Diferencia 10-30% = 0.7 (bueno)
- Diferencia >50% = 0.3 (pobre)

### 2. Lead Time Factor (30% peso)
**¿Qué tan lejos está el pronóstico?**

| Horizonte | Factor | Confianza |
|-----------|--------|-----------|
| 0-24h | 1.0 | Excelente |
| 24-48h | 0.9 | Muy buena |
| 48-72h | 0.8 | Buena |
| 72-120h | 0.7 | Aceptable |
| 120-168h | 0.6 | Moderada |
| 168h+ | 0.5 | Baja |

### 3. Ensemble Spread (20% peso)
**¿Qué tan dispersos están los miembros del ensemble?**

- Spread bajo = alta confianza
- Spread alto = baja confianza

*(Por implementar cuando tengamos GEFS ensemble members)*

---

## 🎨 Categorías de Confianza

### HIGH (7.5-10)
- ✅ **Color:** Verde
- **Mensaje:** "Alta confianza - Modelos coinciden"
- **Acción:** Podés planificar con confianza

### MEDIUM (5.0-7.4)
- ⚠️ **Color:** Naranja
- **Mensaje:** "Confianza moderada - Revisá más cerca de la fecha"
- **Acción:** Monitoreá el pronóstico

### LOW (0-4.9)
- ❌ **Color:** Rojo
- **Mensaje:** "Baja confianza - Mucha incertidumbre"
- **Acción:** No tomes decisiones todavía

---

## 💬 Mensajes al Usuario (Español)

### Alta Confianza (≥7.5)
- **0-24h:** "Alta confianza - Modelos coinciden, pronóstico de corto plazo"
- **24-72h:** "Alta confianza - Modelos coinciden"
- **72h+:** "Buena confianza - Modelos coinciden, pero pronóstico lejano"

### Confianza Moderada (5.0-7.4)
- **Modelos difieren:** "Confianza moderada - Modelos difieren levemente"
- **Pronóstico lejano:** "Confianza moderada - Pronóstico muy lejano"
- **General:** "Confianza moderada - Revisá más cerca de la fecha"

### Baja Confianza (<5.0)
- **Modelos no coinciden:** "Baja confianza - Modelos no coinciden"
- **Muy lejano:** "Baja confianza - Pronóstico demasiado lejano"
- **General:** "Baja confianza - Mucha incertidumbre"

---

## 📱 Display en Frontend

### Versión Compacta (Card)
```
┌─────────────────────────┐
│ 12cm                    │
│ Confianza: Alta ✅      │
└─────────────────────────┘
```

### Versión Expandida (Modal)
```
┌─────────────────────────────────────────┐
│ CONFIANZA DEL PRONÓSTICO                │
├─────────────────────────────────────────┤
│                                         │
│ ✅ Alta confianza                       │
│                                         │
│ Los modelos coinciden y el pronóstico  │
│ es de corto plazo. Podés planificar    │
│ con confianza.                          │
│                                         │
│ Score: 8.2/10                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementación

### Backend
- ✅ `ConfidenceService.calculateConfidence()` - Calcula score 0-10
- ✅ `ConfidenceService.getConfidenceLevel()` - Retorna HIGH/MEDIUM/LOW
- ✅ Mensajes en español contextualizados

### Frontend (Por hacer)
- ⏳ Badge de confianza en DailyForecastCard
- ⏳ Explicación detallada en modal
- ⏳ Color coding (verde/naranja/rojo)

---

## 📈 Próximos Pasos

### Temporada 2026
1. ✅ Implementar cálculo básico
2. ⏳ Mostrar en UI
3. ⏳ Validar con usuarios reales
4. ⏳ Ajustar thresholds basado en feedback

### Temporada 2027
1. Agregar historical accuracy (cuando tengamos datos)
2. Implementar ensemble spread real (GEFS members)
3. Calibración automática de thresholds

---

## 🎯 Objetivo Final

**El usuario debe saber:**
- ✅ Cuándo puede confiar en el pronóstico
- ✅ Cuándo debe esperar y revisar más tarde
- ✅ Cuándo hay demasiada incertidumbre

**Sin mostrar complejidad técnica:**
- ❌ No mostramos "model agreement 0.87"
- ❌ No mostramos "ensemble spread 0.23"
- ❌ No mostramos "lead time penalty 0.3"

**Solo mostramos:**
- ✅ "Alta confianza" o "Baja confianza"
- ✅ Razón simple en español
- ✅ Acción recomendada
