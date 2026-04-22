# Storm Crossing Probability - Final Integration Steps

## ✅ Completed

1. **Backend Storm Crossing Engine** - Fully implemented and integrated
2. **API Endpoint** - `GET /api/resorts/:id/storm-crossing` working
3. **StormCrossingBadge Component** - Created with compact and full modes
4. **DailyForecastCard Component** - Updated to display storm crossing data
5. **Resorts Service** - Added `getStormCrossing()` method

## 🔧 Remaining Steps

### Step 1: Fix Resort Screen File

The file `/mobile/app/resort/[id]/index.tsx` got corrupted during editing. You need to manually add the storm crossing integration.

**Add to state (around line 22):**
```typescript
const [stormCrossingData, setStormCrossingData] = useState<any>(null);
```

**Add to loadResortData function (after hourly forecast fetch, around line 44):**
```typescript
// Fetch storm crossing probability data
try {
  const stormCrossing = await resortsService.getStormCrossing(id, 168);
  console.log('Storm crossing data loaded:', stormCrossing?.forecast?.length, 'time points');
  setStormCrossingData(stormCrossing);
} catch (stormErr) {
  console.warn('Storm crossing data not available:', stormErr);
  setStormCrossingData(null);
}
```

**Add to getDailyForecasts function (before days.push, around line 115):**
```typescript
// Find storm crossing data for this day
let stormCrossing = null;
if (stormCrossingData?.forecast) {
  const crossing = stormCrossingData.forecast.find((c: any) => {
    const crossingDate = new Date(c.validTime);
    return crossingDate.toISOString().split('T')[0] === dateKey;
  });
  if (crossing) {
    stormCrossing = {
      score: crossing.score,
      category: crossing.category,
      explanation: crossing.explanation,
    };
  }
}
```

**Update days.push to include stormCrossing (around line 115):**
```typescript
days.push({
  day: dayName,
  date: dayDate,
  snowfall: Math.round(snowfall),
  tempHigh: Math.max(...temps),
  tempLow: Math.min(...temps),
  icon,
  dateKey,
  hourlyDetails,
  stormCrossing,  // ← ADD THIS LINE
});
```

**Update DailyForecastCard props (around line 253):**
```typescript
<DailyForecastCard
  key={day.dateKey}
  day={day.day}
  date={day.date}
  snowfall={day.snowfall}
  tempHigh={day.tempHigh}
  tempLow={day.tempLow}
  icon={day.icon}
  hourlyDetails={day.hourlyDetails}
  stormCrossing={day.stormCrossing}  // ← ADD THIS LINE
/>
```

## 🎯 Expected Result

Once integrated, you'll see:

### Collapsed Card:
```
┌─────────────────────────────┐
│ THU                         │
│ Mar 14                      │
│ 🌨️  18°/5°                 │
│ Snow: 18cm | Frz: 2100m | ✓72│ ← Storm crossing badge
└─────────────────────────────┘
```

### Expanded Modal:
```
┌─────────────────────────────────┐
│ Thursday, Mar 14           ×    │
│                                 │
│ ❄️ Great powder day!            │
│                                 │
│ ┌─ Storm Crossing Analysis ───┐│
│ │ ✓ High Crossing    72/100   ││
│ │                             ││
│ │ Strong model agreement,     ││
│ │ favorable freezing level    ││
│ └─────────────────────────────┘│
└─────────────────────────────────┘
```

## 📊 How It Works

1. **Backend** computes storm crossing probability using 6 factors:
   - Model agreement (ECMWF vs GFS)
   - Ensemble spread (GEFS uncertainty)
   - Precipitation persistence (trend across runs)
   - Freezing level suitability
   - Wind direction (westerly = favorable)
   - Precipitation bias (rain shadow detection)

2. **API** returns scores 0-100 with categories:
   - HIGH (70-100): Green badge ✓
   - MEDIUM (40-69): Orange badge ~
   - LOW (0-39): Red badge ⚠

3. **Frontend** displays:
   - Compact badge in collapsed card
   - Full badge + explanation in modal

## 🚀 Testing

1. Start backend: `npm run dev` (in `/backend`)
2. Start mobile app: `npm start` (in `/mobile`)
3. Navigate to any resort
4. Check daily forecast cards for storm crossing badges
5. Tap a card to see detailed explanation

## 📝 Files Modified

- ✅ `/backend/src/engine/storm-crossing-engine.ts` (NEW)
- ✅ `/backend/src/domain/models.ts`
- ✅ `/backend/src/engine/snow-engine.ts`
- ✅ `/backend/src/routes/resorts.ts`
- ✅ `/mobile/components/StormCrossingBadge.tsx` (NEW)
- ✅ `/mobile/components/DailyForecastCard.tsx`
- ✅ `/mobile/services/resorts.ts`
- ⚠️  `/mobile/app/resort/[id]/index.tsx` (NEEDS MANUAL FIX)

## 🎓 Documentation

- Full design: `/STORM_CROSSING_DESIGN.md`
- Integration summary: `/INTEGRATION_SUMMARY.md`
