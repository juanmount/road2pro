# Storm Crossing Probability - Integration Summary

## ✅ Completed Integration

### 1. Domain Models Updated
**File:** `/backend/src/domain/models.ts`

Added new types:
```typescript
export type CrossingCategory = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StormCrossingProbability {
  score: number;                    // 0-100
  category: CrossingCategory;
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

Updated `ProcessedForecast`:
```typescript
export interface ProcessedForecast {
  // ... existing fields
  stormCrossingProbabilities?: StormCrossingProbability[];
}
```

Updated `TimeSeriesPoint`:
```typescript
export interface TimeSeriesPoint {
  // ... existing fields
  windDirection?: number;  // Added for wind analysis
}
```

---

### 2. Storm Crossing Engine Created
**File:** `/backend/src/engine/storm-crossing-engine.ts`

**Features:**
- ✅ Full scoring algorithm with 6 components
- ✅ Configurable weights
- ✅ Automatic explanation generation
- ✅ Batch processing support
- ✅ Category determination (LOW/MEDIUM/HIGH)

**Key Methods:**
```typescript
computeCrossingProbability(
  resort: Resort,
  validTime: Date,
  ecmwf: NormalizedForecast | undefined,
  gfs: NormalizedForecast | undefined,
  gefs: NormalizedForecast | undefined,
  modelAgreement: ModelAgreement | undefined,
  forecastHistory?: ForecastRunHistory[]
): StormCrossingProbability

computeBatchCrossingProbabilities(
  resort: Resort,
  ecmwf: NormalizedForecast | undefined,
  gfs: NormalizedForecast | undefined,
  gefs: NormalizedForecast | undefined,
  modelAgreements: ModelAgreement[],
  forecastHistory?: Map<string, ForecastRunHistory[]>
): StormCrossingProbability[]
```

---

### 3. SnowEngine Integration
**File:** `/backend/src/engine/snow-engine.ts`

**Changes:**
1. Imported `StormCrossingEngine`
2. Added `stormCrossingEngine` instance to class
3. Integrated computation into forecast processing flow:

```typescript
// 7. Compute storm crossing probabilities
console.log('  → Computing storm crossing probabilities...');
const stormCrossingProbabilities = this.stormCrossingEngine.computeBatchCrossingProbabilities(
  resort,
  multiModel.ecmwf,
  multiModel.gfs,
  multiModel.gefs,
  modelAgreements
);

// 8. Build processed forecast
const processed: ProcessedForecast = {
  // ... existing fields
  stormCrossingProbabilities
};
```

**Console Output:**
```
Processing forecast for Cerro Catedral...
  → Fetching ECMWF, GFS, and GEFS models...
  → Calculating model agreement and confidence...
  → Processing forecast data...
  → Applying phase classification and corrections...
  → Computing storm crossing probabilities...
  ✓ Forecast processed (confidence: 7.5/10, 24h snow: 12.3cm)
  ✓ Storm crossing: HIGH (72/100)
```

---

### 4. API Endpoint Created
**File:** `/backend/src/routes/resorts.ts`

**New Endpoint:**
```
GET /api/resorts/:id/storm-crossing?hours=72
```

**Query Parameters:**
- `hours` (optional): Forecast horizon in hours (default: 72)

**Response Format:**
```json
{
  "resortId": "cerro-catedral",
  "resortName": "Cerro Catedral",
  "issuedAt": "2026-03-11T15:00:00Z",
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
      },
      "computedAt": "2026-03-11T15:37:00Z"
    }
  ]
}
```

---

## 📋 Next Steps: UI Integration

### Mobile App Components Needed

#### 1. Storm Crossing Badge Component
**Location:** `/mobile/components/StormCrossingBadge.tsx`

```tsx
interface StormCrossingBadgeProps {
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
}

export function StormCrossingBadge({ category, score }: StormCrossingBadgeProps) {
  const colors = {
    HIGH: { bg: '#10b981', text: '#ffffff' },
    MEDIUM: { bg: '#f59e0b', text: '#ffffff' },
    LOW: { bg: '#ef4444', text: '#ffffff' },
  };
  
  return (
    <View style={[styles.badge, { backgroundColor: colors[category].bg }]}>
      <Text style={[styles.text, { color: colors[category].text }]}>
        Storm Crossing: {category}
      </Text>
      <Text style={styles.score}>{score}/100</Text>
    </View>
  );
}
```

#### 2. Update DailyForecastCard
**Location:** `/mobile/components/DailyForecastCard.tsx`

Add storm crossing badge to collapsed card:
```tsx
<View style={styles.collapsedCard}>
  {/* Existing content */}
  
  {/* Add storm crossing badge */}
  {stormCrossing && (
    <StormCrossingBadge 
      category={stormCrossing.category}
      score={stormCrossing.score}
    />
  )}
</View>
```

Add detailed explanation to modal:
```tsx
<Modal visible={modalVisible}>
  {/* Existing modal content */}
  
  {/* Add storm crossing section */}
  {stormCrossing && (
    <View style={styles.stormCrossingSection}>
      <Text style={styles.sectionTitle}>Storm Crossing Analysis</Text>
      <StormCrossingBadge 
        category={stormCrossing.category}
        score={stormCrossing.score}
      />
      <Text style={styles.explanation}>
        {stormCrossing.explanation}
      </Text>
      
      {/* Component breakdown */}
      <View style={styles.components}>
        <ComponentBar 
          label="Model Agreement" 
          value={stormCrossing.components.modelAgreement} 
        />
        <ComponentBar 
          label="Ensemble Spread" 
          value={stormCrossing.components.ensembleSpread} 
        />
        {/* ... other components */}
      </View>
    </View>
  )}
</Modal>
```

#### 3. Fetch Storm Crossing Data
**Location:** `/mobile/app/resort/[id]/index.tsx`

```tsx
const [stormCrossing, setStormCrossing] = useState<any>(null);

useEffect(() => {
  const fetchStormCrossing = async () => {
    try {
      const response = await fetch(
        `${API_URL}/resorts/${id}/storm-crossing?hours=168`
      );
      const data = await response.json();
      setStormCrossing(data);
    } catch (error) {
      console.error('Error fetching storm crossing:', error);
    }
  };
  
  fetchStormCrossing();
}, [id]);
```

---

## 🎨 UI Design Examples

### High Probability Card
```
┌─────────────────────────────────┐
│ Thursday, Mar 14                │
│                                 │
│ Expected Snowfall: 18 cm       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Storm Crossing: HIGH ✓      │ │
│ │ Confidence: 72/100          │ │
│ └─────────────────────────────┘ │
│                                 │
│ Strong model agreement,         │
│ favorable freezing level        │
└─────────────────────────────────┘
```

### Low Probability Warning
```
┌─────────────────────────────────┐
│ Tuesday, Mar 12                 │
│                                 │
│ Expected Snowfall: 15 cm       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Storm Crossing: LOW ⚠       │ │
│ │ Confidence: 28/100          │ │
│ └─────────────────────────────┘ │
│                                 │
│ ⚠️ Forecast weakening across   │
│ runs, precipitation mainly on   │
│ Chilean side                    │
└─────────────────────────────────┘
```

---

## 🧪 Testing

### Unit Tests Needed
```typescript
describe('StormCrossingEngine', () => {
  it('should return HIGH for strong westerly with good agreement');
  it('should return LOW for weakening forecast');
  it('should return MEDIUM for marginal freezing level');
  it('should penalize precipitation bias');
  it('should handle missing GEFS data gracefully');
});
```

### Integration Tests
- Test with real ECMWF/GFS data
- Validate against known storm events
- Compare with meteorologist assessments

---

## 📊 Database Schema (Future)

If we want to persist storm crossing probabilities:

```sql
CREATE TABLE storm_crossing_probabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES resorts(id),
  valid_time TIMESTAMP NOT NULL,
  
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  category VARCHAR(10) NOT NULL CHECK (category IN ('LOW', 'MEDIUM', 'HIGH')),
  explanation TEXT NOT NULL,
  
  -- Component scores
  model_agreement_score INTEGER,
  ensemble_spread_score INTEGER,
  precipitation_persistence_score INTEGER,
  freezing_level_score INTEGER,
  wind_direction_score INTEGER,
  precipitation_bias_score INTEGER,
  
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(resort_id, valid_time)
);

CREATE INDEX idx_storm_crossing_resort_time 
  ON storm_crossing_probabilities(resort_id, valid_time);
```

---

## 🚀 Deployment Checklist

- [x] Domain models updated
- [x] Storm Crossing Engine implemented
- [x] SnowEngine integration complete
- [x] API endpoint created
- [ ] UI components created
- [ ] Mobile app integration
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Documentation updated
- [ ] Database migration (if persisting)

---

## 📝 Notes

### Current Limitations
1. **Precipitation Persistence:** Requires historical forecast run data (not yet implemented)
2. **Precipitation Bias:** Requires Chilean side forecast data (not yet available)
3. **Wind Direction:** Needs to be added to provider data fetching

### Future Enhancements
1. **Resort-Specific Corrections:** Calibration profiles for each resort
2. **Historical Validation:** Compare predictions vs actual outcomes
3. **Machine Learning:** Refine weights based on historical performance
4. **Real-Time Updates:** Adjust probabilities based on current observations

---

## 🎯 Success Metrics

The Storm Crossing Probability feature will be successful if:

1. **Accuracy:** Predictions align with actual storm outcomes
2. **User Trust:** Skiers find the metric helpful for planning
3. **Differentiation:** Correctly identifies storms that will/won't cross
4. **Actionability:** Users make better decisions based on the data

---

**Status:** ✅ Backend Integration Complete | 🔄 UI Integration Pending
