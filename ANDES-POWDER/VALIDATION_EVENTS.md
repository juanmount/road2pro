# ANDES POWDER - VALIDATION EVENTS

## Event 1: Micro Snow Event - April 21-22, 2026

**Date:** April 21-22, 2026  
**Location:** Cerro Catedral, Bariloche  
**Reporter:** User observation  

### Observed Conditions
- ❄️ **Snow:** Light dusting (traces) on summit
- 📏 **Snow line:** Down to ~1700m elevation
- 🏔️ **Affected areas:** Summit (2100m) to mid-mountain (1700m)
- 📅 **Time:** Night of April 21-22

### Model Forecast (Open-Meteo)
- **Precipitation:** 0.0mm (NO precipitation detected)
- **Snowfall:** 0.0cm
- **Freezing level:** 2130-2290m
- **Temperature at base (~1030m):** 2.6-3.0°C
- **Wind:** 9-11 km/h from W/SW (240-252°)

### Analysis
**Model Performance:**
- ❌ **Failed to detect:** Micro-scale precipitation event
- ❌ **Freezing level error:** -430 to -590m (overestimated)
- ✅ **Wind direction:** Correct (W/SW = Pacific moisture)

**Event Type:**
- Likely convective/localized shower
- Too small for global models to capture
- Common in Patagonian spring conditions

### Calibration Insights

**1. Freezing Level Adjustment**
```
Model: 2200m
Observed: 1700m
Error: -500m (23% overestimation)
```
**Recommendation:** Apply conservative 0.75x multiplier for Bariloche spring events

**2. Micro-Event Detection**
Add logic to flag potential snow when:
- Temperature 2-4°C at base
- Humidity >70%
- Wind from W/NW/SW
- Even if models show 0mm precipitation

**3. Lapse Rate Validation**
```
Standard lapse rate: 6.5°C/1000m
If base temp = 3°C:
  Calculated freezing: 1030 + (3/6.5)*1000 = 1491m
  Observed freezing: 1700m
  Error: +209m
```
**Possible causes:**
- Temperature inversion
- Local microclimate effects
- Moisture layer altitude

### Action Items
- [ ] Install weather station at base (1030m)
- [ ] Compare real temperature vs model during next event
- [ ] Calibrate lapse rate specific to Bariloche
- [ ] Add micro-event detection algorithm
- [ ] Integrate webcam validation

### Photos/Evidence
- User reported visual confirmation of snow on summit
- No precipitation recorded by models
- Classic "surprise snow" event

---

**Validation Philosophy:**  
Events like this are why we need local observations. Global models miss micro-scale precipitation that matters to skiers. Our weather station + calibrated algorithms will catch what others miss.
