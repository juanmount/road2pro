# SNOW CALCULATION AUDIT - Complete Data Flow

## CRITICAL ISSUE FOUND (April 23, 2026)
Frontend was calculating snow based ONLY on temperature, ignoring freezing level.
This caused snow to show in BASE even when freezing level was 380m above.

---

## 1. FRONTEND CALCULATIONS

### A. Hourly Forecast (PRIMARY SOURCE)
**File:** `mobile/services/resorts.ts` - `getHourlyForecast()`
**Status:** ✅ FIXED (April 23, 2026)

**Data Source:** Open-Meteo API direct call
**Calculation Logic:**
```typescript
const freezingLevel = data.hourly.freezinglevel_height[idx];
const elevationMargin = freezingLevel - elevationMeters;

// STRICT: If >300m above freezing level, it's all rain
if (elevationMargin > 300) {
  snowfall = 0;
  phase = 'rain';
}
```

**Used By:**
- Resort detail screen (hourly forecast)
- Daily forecast cards (aggregates hourly data)
- Live conditions display
- Snowfall charts

---

### B. Daily Forecast
**File:** `mobile/services/resorts.ts` - `getDailyForecast()`
**Status:** ⚠️ NEEDS VERIFICATION

**Data Source:** Backend API `/resorts/:id/forecast/daily`
**Calculation:** Backend-side (should use phase-classifier)

**Action Required:** Verify backend daily endpoint uses corrected engines

---

### C. Current Conditions
**File:** `mobile/services/resorts.ts` - `getCurrentConditions()`
**Status:** ⚠️ NEEDS VERIFICATION

**Data Source:** Backend API `/resorts/:id/forecast/current`
**Calculation:** Backend-side

**Action Required:** Verify uses corrected phase-classifier

---

### D. Satellite Analysis
**File:** `mobile/services/satelliteAnalysis.ts`
**Status:** ✅ FIXED (uses hourly forecast data)

**Data Source:** `resortsService.getHourlyForecast()` → uses corrected frontend calculation
**Used For:** Regional weather pattern interpretation

---

## 2. BACKEND CALCULATIONS

### A. Phase Classifier
**File:** `backend/src/engine/phase-classifier.ts`
**Status:** ✅ FIXED (April 23, 2026)

**Logic:**
```typescript
// Line 98-100: Strict elevation margin check
if (elevationMargin > 300) {
  ratio = 0.0;  // No snow
}
```

**Used By:**
- Hourly forecast processing
- Daily forecast processing
- Current conditions

---

### B. Snow Accumulation Calculator
**File:** `backend/src/engine/snow-accumulation.ts`
**Status:** ✅ FIXED (April 23, 2026)

**Logic:**
```typescript
// Line 16: Threshold check
if (snowRatio < 0.15) return 0;  // No snow if ratio too low
```

**Used By:**
- All backend forecast endpoints

---

### C. Snow Reality Engine
**File:** `backend/src/engine/snow-reality-engine.ts`
**Status:** ✅ FIXED (April 23, 2026)

**Logic:**
```typescript
// Line 128-129: Rain contamination
if (elevationMargin > 300) {
  return 100;  // 100% rain, no snow
}
```

**Used By:**
- Daily forecast adjustments
- Reality vs forecast comparisons

---

## 3. DATA FLOW PATHS

### Path 1: Hourly Forecast Display
```
Open-Meteo API 
  → mobile/services/resorts.ts (getHourlyForecast)
  → Applies freezing level check ✅
  → Resort detail screen
```

### Path 2: Daily Forecast Display
```
Backend API (/resorts/:id/forecast/daily)
  → backend/src/engine/snow-engine.ts
  → phase-classifier.ts ✅
  → snow-accumulation.ts ✅
  → snow-reality-engine.ts ✅
  → DailyForecastCard component
```

### Path 3: Live Conditions
```
Backend API (/resorts/:id/forecast/current)
  → backend/src/engine/snow-engine.ts
  → phase-classifier.ts ✅
  → Home screen display
```

### Path 4: Satellite Analysis
```
mobile/services/satelliteAnalysis.ts
  → resortsService.getHourlyForecast() ✅
  → Regional pattern interpretation
  → SatelliteImageCard component
```

---

## 4. CRITICAL RULES (MUST BE CONSISTENT EVERYWHERE)

### Freezing Level Thresholds
- **Margin > 300m:** 0% snow (all rain) ✅
- **Margin 150-300m:** 10-30% snow (mostly rain)
- **Margin 50-150m:** 40-60% snow (mixed)
- **Margin < 50m:** 70-100% snow (mostly/all snow)

### Temperature Thresholds (Secondary)
- **Temp > 2°C:** Rain (even if near freezing level)
- **Temp -1°C to 2°C:** Mixed (if near freezing level)
- **Temp < -1°C:** Snow (if below freezing level)

### Snow Ratio Minimum
- **snowRatio < 0.15 (15%):** Display as 0cm ✅

---

## 5. VERIFICATION CHECKLIST

- [x] Frontend hourly forecast uses freezing level
- [ ] Backend daily forecast uses corrected engines
- [ ] Backend current conditions uses corrected engines
- [x] Satellite analysis uses corrected data source
- [ ] All thresholds are consistent (>300m = rain)
- [ ] No other frontend calculations bypass backend
- [ ] Snow map uses correct data source
- [ ] Weather station data is independent (OK)

---

## 6. REMAINING TASKS

1. **Verify Backend Endpoints:**
   - Check `/resorts/:id/forecast/daily` uses corrected engines
   - Check `/resorts/:id/forecast/current` uses corrected engines
   - Confirm all use phase-classifier → snow-accumulation → snow-reality

2. **Test All Display Paths:**
   - Hourly forecast modal (BASE with FRZ >300m should show 0cm)
   - Daily forecast cards (should aggregate correctly)
   - Live conditions (should match hourly)
   - Satellite analysis (should use hourly data)

3. **Document Data Sources:**
   - Create clear diagram of all data flows
   - Mark which use frontend vs backend calculations
   - Ensure no duplicate/conflicting calculations

---

## 7. LESSONS LEARNED

**Root Cause:** Frontend was doing its own snow calculation ignoring freezing level.

**Why It Happened:** 
- Frontend needed quick hourly data from Open-Meteo
- Implemented simple temp-based calculation
- Didn't account for freezing level margin

**Fix:**
- Added freezing level check to frontend calculation
- Made it consistent with backend thresholds
- Now frontend and backend use same logic

**Prevention:**
- All snow calculations must check freezing level
- Use >300m margin as strict rain threshold
- Document all data sources and calculations
- Regular audits of calculation consistency

---

## 8. DEPLOYMENT STATUS

**Files Modified (April 23, 2026):**
- ✅ `mobile/services/resorts.ts` (frontend hourly)
- ✅ `backend/src/engine/phase-classifier.ts`
- ✅ `backend/src/engine/snow-accumulation.ts`
- ✅ `backend/src/engine/snow-reality-engine.ts`

**Deployment:**
- Frontend: Requires app reload
- Backend: Requires Railway redeploy

**Testing:**
- Test case: BASE (1030m) with FRZ 1410m (+380m) should show 0cm
- Expected: All displays show 0cm (rain)
- Previous: Showed 1.3cm (incorrect)
