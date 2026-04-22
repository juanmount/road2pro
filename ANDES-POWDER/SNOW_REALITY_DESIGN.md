# Snow Reality Engine Design

## Purpose
Estimate real snow accumulation after atmospheric and environmental effects.

Raw snowfall forecast ≠ snow that remains on the ground.

## Adjustment Factors

### 1. Wind Redistribution Loss (0-40% loss)
Wind removes snow from exposed areas and deposits it in sheltered zones.

**Inputs:**
- Average wind speed
- Wind gusts
- Elevation (summit more exposed)

**Algorithm:**
```
windLossFactor = min(40, (avgWind / 50) * 30 + (gustWind / 80) * 10)
summitMultiplier = 1.5
midMultiplier = 1.2
baseMultiplier = 1.0
```

**Categories:**
- 0-10%: Minimal wind loss
- 10-20%: Moderate wind loss
- 20-30%: High wind loss
- 30-40%: Extreme wind loss

### 2. Rain Contamination (0-50% loss)
Rain mixed with snow reduces accumulation quality and causes compaction/melt.

**Inputs:**
- Freezing level
- Resort elevation
- Temperature
- Precipitation type

**Algorithm:**
```
elevationMargin = freezingLevel - elevation
if elevationMargin < 200m: HIGH risk (30-50% loss)
if elevationMargin < 500m: MEDIUM risk (15-30% loss)
if elevationMargin < 800m: LOW risk (5-15% loss)
else: MINIMAL risk (0-5% loss)

Additional factor: if temp > -2°C, add 10% loss
```

### 3. Snow Density Adjustment (-10% to +15%)
Light powder vs heavy wet snow affects depth.

**Inputs:**
- Temperature
- Humidity
- Elevation

**Algorithm:**
```
if temp < -8°C: Light powder (+15% depth)
if temp -8°C to -4°C: Normal powder (+5% depth)
if temp -4°C to 0°C: Normal snow (0% adjustment)
if temp 0°C to 2°C: Heavy snow (-10% depth)
```

### 4. Solar Melt (0-25% loss)
Daytime solar radiation melts surface snow.

**Inputs:**
- Time of day
- Cloud cover
- Aspect (N/S/E/W facing)
- Season

**Algorithm:**
```
solarFactor = 0
if cloudCover < 50%:
  if hour between 10:00-16:00:
    solarFactor = 15% (peak hours)
  if hour between 08:00-10:00 or 16:00-18:00:
    solarFactor = 8% (shoulder hours)

Aspect multiplier:
- North facing (Patagonia): 0.6x (less sun)
- South facing: 1.4x (more sun)
- East/West: 1.0x
```

### 5. Temperature Sublimation (0-15% loss)
Very cold, dry conditions cause snow to sublimate (solid → vapor).

**Inputs:**
- Temperature
- Humidity
- Wind

**Algorithm:**
```
if temp < -10°C and humidity < 40% and wind > 30km/h:
  sublimationLoss = 10-15%
else if temp < -5°C and humidity < 50%:
  sublimationLoss = 5-10%
else:
  sublimationLoss = 0-5%
```

## Combined Reality Score

**Formula:**
```typescript
realAccumulation = forecastSnowfall 
  × (1 - windLoss/100)
  × (1 - rainContamination/100)
  × (1 + densityAdjustment/100)
  × (1 - solarMelt/100)
  × (1 - sublimation/100)
```

## Output Structure

```typescript
interface SnowRealityForecast {
  validTime: string;
  elevation: 'base' | 'mid' | 'summit';
  
  // Raw forecast
  forecastSnowfall: number; // cm
  
  // Adjusted reality
  realAccumulation: number; // cm
  
  // Adjustment breakdown
  adjustments: {
    windLoss: number; // percentage
    rainContamination: number; // percentage
    densityAdjustment: number; // percentage (can be negative)
    solarMelt: number; // percentage
    sublimation: number; // percentage
  };
  
  // Quality indicators
  snowQuality: 'POWDER' | 'GOOD' | 'FAIR' | 'POOR';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Explanation
  explanation: string;
}
```

## Snow Quality Categories

**POWDER:**
- Temp < -5°C
- Wind < 20 km/h
- No rain contamination
- Light density

**GOOD:**
- Temp -5°C to 0°C
- Wind < 30 km/h
- Minimal rain contamination

**FAIR:**
- Temp 0°C to 2°C
- Wind 30-40 km/h
- Some rain contamination

**POOR:**
- Temp > 2°C
- Wind > 40 km/h
- Significant rain contamination

## Example Output

```
Friday 12:00

Forecast: 22 cm
Real accumulation: 16 cm

Adjustments:
- Wind loss: -18%
- Rain contamination: -6%
- Density: +5% (light powder)
- Solar melt: -3%

Snow quality: GOOD
Confidence: HIGH

Explanation: Light powder conditions with moderate wind redistribution. 
Minimal rain risk. Expect good coverage at mid-mountain and above.
```

## Integration Points

1. **SnowEngine** calls SnowRealityEngine after computing raw snowfall
2. **API** returns both forecast and reality values
3. **UI** displays comparison: "22 cm forecast → 16 cm real"
4. **Daily cards** show adjusted accumulation with quality badge
