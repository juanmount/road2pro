# Storm Crossing Probability Engine - Design Document

## Overview

The Storm Crossing Probability Engine is a specialized forecasting module designed to address a unique challenge in Patagonian ski forecasting: **many Pacific storm systems appear in global weather models but weaken or dissipate before crossing the Andes mountains**.

This results in storms that dump heavy snow on the Chilean side but produce little to no snowfall on Argentine resorts like Cerro Catedral, Chapelco, and Las Leñas.

---

## Problem Statement

### The Andes Rain Shadow Effect

The Andes create a massive rain shadow effect:

1. **Pacific storms** approach from the west
2. **Orographic lift** forces air upward on the Chilean (western) side
3. **Precipitation falls** primarily on Chilean slopes
4. **Dry air descends** on the Argentine (eastern) side
5. **Result:** Forecast shows snow, but Argentine resorts get nothing

### Current Forecasting Gap

Global models (ECMWF, GFS) show precipitation in the region, but they don't explicitly indicate:

- Whether the storm will maintain intensity crossing the Andes
- Whether precipitation will reach the Argentine side
- Whether the storm is weakening across successive model runs

---

## Solution: Storm Crossing Probability

A **derived probabilistic metric** that estimates the likelihood a forecast storm will:

1. Successfully cross the Andes
2. Maintain precipitation intensity
3. Produce measurable snowfall on Argentine resorts

---

## Architecture

### Module Structure

```
backend/src/engine/
├── storm-crossing-engine.ts    # Main engine (NEW)
├── snow-engine.ts              # Existing forecast processor
├── confidence-service.ts       # Model agreement calculator
└── ...
```

### Integration Points

The Storm Crossing Engine integrates with:

1. **SnowEngine** - receives multi-model forecast data
2. **ConfidenceService** - uses existing model agreement calculations
3. **ProcessedForecast** - outputs crossing probability alongside snow totals

---

## Algorithm Design

### Scoring Components

The algorithm evaluates **6 key signals**:

| Component | Weight | Description |
|-----------|--------|-------------|
| Model Agreement | 35% | ECMWF vs GFS agreement on timing, location, magnitude |
| Ensemble Spread | 25% | GEFS spread indicates forecast uncertainty |
| Precipitation Persistence | 15% | Trend across successive model runs |
| Freezing Level Suitability | 15% | Freezing level relative to resort elevations |
| Wind Direction Suitability | 10% | Westerly flow = favorable crossing |
| Precipitation Bias | Penalty | Detects rain shadow (heavy west, weak east) |

### Scoring Formula

```typescript
totalScore = 
  modelAgreement * 0.35 +
  ensembleSpread * 0.25 +
  persistence * 0.15 +
  freezingLevel * 0.15 +
  windDirection * 0.10

finalScore = totalScore - precipitationBiasPenalty
```

### Category Mapping

| Score Range | Category | Interpretation |
|-------------|----------|----------------|
| 70-100 | HIGH | Strong confidence storm will cross |
| 40-69 | MEDIUM | Moderate confidence, watch closely |
| 0-39 | LOW | Storm likely to weaken or miss Argentine side |

---

## Component Details

### 1. Model Agreement (35%)

**Input:** `ModelAgreement` from `ConfidenceService`

**Logic:**
- High agreement (ECMWF ≈ GFS) → high score
- Low agreement (models diverge) → low score

**Scoring:**
```typescript
score = modelAgreement.confidenceScore * 10  // Convert 0-10 to 0-100
```

---

### 2. Ensemble Spread (25%)

**Input:** GEFS ensemble forecast

**Logic:**
- Low spread → high confidence → high score
- High spread → high uncertainty → low score

**Scoring:**
```typescript
if (spread < 5mm)  return 90
if (spread < 15mm) return 60
else               return 30
```

---

### 3. Precipitation Persistence (15%)

**Input:** Historical forecast runs (last 3-4 runs)

**Logic:**
- Increasing precipitation → strengthening storm → high score
- Stable precipitation → steady storm → medium score
- Decreasing precipitation → weakening storm → low score

**Example:**
```
Run 1: 25cm → Run 2: 18cm → Run 3: 10cm → Run 4: 2cm
Trend: -92% → Score: 20 (LOW)
```

**Scoring:**
```typescript
if (trend > +50%)  return 100  // Strengthening
if (trend > +10%)  return 85   // Growing
if (trend > -10%)  return 70   // Stable
if (trend > -50%)  return 40   // Weakening
else               return 20   // Collapsing
```

---

### 4. Freezing Level Suitability (15%)

**Input:** Freezing level from ECMWF/GFS

**Logic:**
- Freezing level below base elevation → excellent (all snow)
- Freezing level between base and mid → very good
- Freezing level above summit → poor (all rain)

**Example (Cerro Catedral):**
```
Base: 1030m, Mid: 1600m, Summit: 2100m

Freezing at 800m  → Score: 95 (deep cold)
Freezing at 1400m → Score: 85 (cold)
Freezing at 1900m → Score: 60 (marginal)
Freezing at 2400m → Score: 30 (rain at summit)
Freezing at 3000m → Score: 10 (all rain)
```

---

### 5. Wind Direction Suitability (10%)

**Input:** Wind direction at mid-level (700mb)

**Logic:**
- Westerly flow (240-300°) → favorable for crossing → high score
- Easterly flow (0-180°) → blocked or wrong direction → low score

**Scoring:**
```typescript
if (240° ≤ dir ≤ 300°)  return 95  // WSW-WNW (optimal)
if (210° ≤ dir ≤ 330°)  return 75  // SW-NW (good)
if (180° ≤ dir ≤ 210°)  return 50  // S (neutral)
if (330° ≤ dir ≤ 30°)   return 50  // N (neutral)
else                     return 25  // E (blocked)
```

---

### 6. Precipitation Bias (Penalty)

**Input:** Precipitation comparison west vs east of Andes

**Logic:**
- Heavy precipitation on Chilean side, weak on Argentine side → rain shadow → penalty

**Future Enhancement:**
- Compare Chilean resort forecasts vs Argentine resort forecasts
- Detect asymmetric precipitation patterns

---

## Data Structures

### Input

```typescript
interface StormCrossingInput {
  resort: Resort;
  validTime: Date;
  ecmwf?: NormalizedForecast;
  gfs?: NormalizedForecast;
  gefs?: NormalizedForecast;
  modelAgreement?: ModelAgreement;
  forecastHistory?: ForecastRunHistory[];
}
```

### Output

```typescript
interface StormCrossingProbability {
  score: number;                    // 0-100
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  
  components: {
    modelAgreement: number;
    ensembleSpread: number;
    precipitationPersistence: number;
    freezingLevelSuitability: number;
    windDirectionSuitability: number;
    precipitationBias: number;
  };
  
  validTime: Date;
  computedAt: Date;
}
```

---

## Integration with Snow Engine

### Current Flow

```
SnowEngine.processResortForecast()
  ↓
1. Fetch ECMWF, GFS, GEFS
2. Calculate model agreements
3. Process elevation forecasts
4. Calculate snow totals
5. Return ProcessedForecast
```

### Enhanced Flow

```
SnowEngine.processResortForecast()
  ↓
1. Fetch ECMWF, GFS, GEFS
2. Calculate model agreements
3. *** Compute storm crossing probabilities ***  ← NEW
4. Process elevation forecasts
5. Calculate snow totals
6. Return ProcessedForecast + crossing probabilities
```

### Code Integration

```typescript
// In SnowEngine.processResortForecast()

// After calculating model agreements
const crossingEngine = new StormCrossingEngine();
const crossingProbabilities = crossingEngine.computeBatchCrossingProbabilities(
  resort,
  multiModel.ecmwf,
  multiModel.gfs,
  multiModel.gefs,
  modelAgreements,
  forecastHistory
);

// Add to ProcessedForecast
const processed: ProcessedForecast = {
  // ... existing fields
  stormCrossingProbabilities: crossingProbabilities  // NEW
};
```

---

## UI Integration

### Daily Forecast Card

**Before:**
```
Thursday, Mar 14
Expected Snowfall: 18 cm
```

**After:**
```
Thursday, Mar 14
Expected Snowfall: 18 cm
Storm Crossing: HIGH ✓

Strong model agreement, favorable freezing level
```

### Storm Alert Example

**High Probability:**
```
┌─────────────────────────────────┐
│ Thursday, Mar 14                │
│                                 │
│ Expected Snowfall: 18 cm       │
│ Storm Crossing: HIGH ✓         │
│                                 │
│ Strong model agreement,         │
│ favorable freezing level,       │
│ low ensemble spread             │
└─────────────────────────────────┘
```

**Low Probability:**
```
┌─────────────────────────────────┐
│ Tuesday, Mar 12                 │
│                                 │
│ Expected Snowfall: 15 cm       │
│ Storm Crossing: LOW ⚠          │
│                                 │
│ Forecast weakening across runs, │
│ precipitation mainly on         │
│ Chilean side                    │
└─────────────────────────────────┘
```

---

## Future Enhancements

### Phase 2: Resort-Specific Corrections

```typescript
interface ResortCrossingProfile {
  resortId: string;
  corrections: {
    nwFlowPenalty: number;      // Catedral underperforms with NW flow
    strongWesterlyBonus: number; // Las Leñas overperforms with strong W
  };
}
```

### Phase 3: Historical Validation

- Compare forecast crossing probability vs actual snowfall
- Build correction factors based on historical performance
- Machine learning to refine weights

### Phase 4: Real-Time Observations

- Integrate Chilean resort snow reports
- Use webcams to detect precipitation patterns
- Adjust crossing probability based on current conditions

---

## Testing Strategy

### Unit Tests

```typescript
describe('StormCrossingEngine', () => {
  it('should return HIGH for strong westerly with good agreement', () => {
    const result = engine.computeCrossingProbability(/* ... */);
    expect(result.category).toBe('HIGH');
    expect(result.score).toBeGreaterThan(70);
  });
  
  it('should return LOW for weakening forecast', () => {
    const history = [
      { runTime: t1, precipitation: 25 },
      { runTime: t2, precipitation: 18 },
      { runTime: t3, precipitation: 10 },
      { runTime: t4, precipitation: 2 },
    ];
    const result = engine.computeCrossingProbability(/* ... */, history);
    expect(result.category).toBe('LOW');
  });
});
```

### Integration Tests

- Test with real ECMWF/GFS data
- Validate against known storm events
- Compare with meteorologist assessments

---

## API Endpoints

### Get Storm Crossing Forecast

```
GET /api/resorts/:id/storm-crossing
```

**Response:**
```json
{
  "resortId": "cerro-catedral",
  "forecast": [
    {
      "validTime": "2026-03-14T12:00:00Z",
      "score": 72,
      "category": "HIGH",
      "explanation": "Strong model agreement, favorable freezing level, low ensemble spread",
      "components": {
        "modelAgreement": 85,
        "ensembleSpread": 90,
        "precipitationPersistence": 70,
        "freezingLevelSuitability": 85,
        "windDirectionSuitability": 75,
        "precipitationBias": 70
      }
    }
  ]
}
```

---

## Conclusion

The Storm Crossing Probability Engine provides a **critical missing piece** in Patagonian ski forecasting by explicitly addressing the Andes rain shadow effect.

By combining multiple forecast signals into a single probabilistic metric, we help skiers quickly understand whether a forecast storm will actually deliver snow on the Argentine side.

This is **not just another forecast variable** - it's a **derived intelligence layer** that interprets complex meteorological patterns specific to the Andes region.
