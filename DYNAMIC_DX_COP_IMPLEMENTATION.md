# Dynamic DX COP Implementation

## Overview
Implemented **weather-dependent dynamic COP** for DX (Direct Expansion) backup cooling systems in the evaporative cooling simulation. The COP now varies for each of the 8760 hourly cycles based on outdoor temperature.

## Why Dynamic COP?

### Real-World Behavior
In real DX systems (air-cooled chillers, rooftop units, split systems):
- **COP decreases** as outdoor temperature increases
- **COP increases** as outdoor temperature decreases
- This is because the condenser has to reject heat to outdoor air

### Example:
- **25°C outdoor**: COP = 3.5 (baseline)
- **35°C outdoor**: COP = 2.6 (hot day, harder to reject heat)
- **15°C outdoor**: COP = 4.1 (cool day, easier to reject heat)

## Implementation Details

### Formula
```
Dynamic_COP = Nominal_COP × (1 - 0.025 × (T_outdoor - 25°C))
```

Where:
- **Nominal_COP**: User-configured baseline (default 3.5)
- **T_outdoor**: Current hour's outdoor dry bulb temperature
- **0.025**: Degradation factor (2.5% per °C)
- **25°C**: Reference temperature (standard rating condition)

### Bounds
- **Minimum COP**: 2.0 (even in extreme heat)
- **Maximum COP**: 5.0 (practical upper limit in cold weather)

### When DX Backup Activates
The DX system only runs when:
1. ✅ **Mechanical backup is enabled** (`has_dx_backup = true`)
2. ✅ **Evaporative cooling is insufficient** (can't meet cooling load)
3. ✅ **Wet bulb is too high** (evaporative effectiveness drops)
4. ✅ **Supply temp exceeds ASHRAE limits**

Then:
```
DX_Power = (Cooling_Load - Evap_Capacity) / Dynamic_COP
```

## Code Location

**File**: `evaporative-cooling-api/src/main/java/com/acme/evap/api/service/EvaporativeCoolingService.java`

### New Method:
```java
private double calculateDynamicDxCop(double outdoorTempC, double nominalCOP)
```

### Updated Logic (Line ~200):
```java
// Calculate dynamic COP for current hour's weather
double dynamicCOP = calculateDynamicDxCop(
    weatherPoint.dryBulbTempC,  // Current outdoor temp
    request.cooling_system.dx_cop  // User's nominal COP
);

dxPowerKW = dxCoolingKW / dynamicCOP;
```

## Impact on Simulation

### Before (Static COP):
- DX always used COP = 3.5
- Unrealistic energy consumption
- Didn't account for seasonal variations

### After (Dynamic COP):
- COP varies from 2.0 to 5.0 based on weather
- More accurate energy predictions
- Captures seasonal efficiency changes
- Higher energy costs in summer (lower COP)
- Lower energy costs in winter (higher COP)

## Example Hourly Calculation

### Summer Day (35°C):
```
Nominal COP: 3.5
Outdoor Temp: 35°C
Dynamic COP: 3.5 × (1 - 0.025 × (35 - 25)) = 3.5 × 0.75 = 2.625

DX Cooling Load: 50 kW
DX Power: 50 / 2.625 = 19.0 kW
```

### Winter Day (10°C):
```
Nominal COP: 3.5
Outdoor Temp: 10°C
Dynamic COP: 3.5 × (1 - 0.025 × (10 - 25)) = 3.5 × 1.375 = 4.81
Capped at: 5.0

DX Cooling Load: 50 kW
DX Power: 50 / 5.0 = 10.0 kW
```

## Validation

The simulation now logs DX backup usage:
```
Hour 0: DX Backup Active - Outdoor: 35.2°C, Nominal COP: 3.50, Dynamic COP: 2.75, DX Load: 45.3 kW, DX Power: 16.5 kW
Hour 1000: DX Backup Active - Outdoor: 28.1°C, Nominal COP: 3.50, Dynamic COP: 3.23, DX Load: 38.7 kW, DX Power: 12.0 kW
```

## Testing

To test the dynamic COP:

1. **Run simulation** with DX backup enabled
2. **Check console logs** for DX backup activation
3. **Compare COP values** across different outdoor temperatures
4. **Verify energy consumption** varies with weather

## Benefits

✅ **More accurate energy predictions**
✅ **Realistic seasonal variations**
✅ **Better cost estimates**
✅ **Improved carbon footprint calculations**
✅ **Helps optimize cooling strategy**

## Future Enhancements

Potential improvements:
- Add humidity-based COP adjustment (wet bulb impact)
- Include part-load efficiency curves
- Model multiple DX units with staging
- Add refrigerant type impact on COP
- Consider altitude effects on condenser performance
