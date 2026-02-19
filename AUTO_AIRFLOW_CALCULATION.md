# Auto-Calculated Airflow Feature - Implementation Complete ✅

## Overview
Implemented automatic calculation of `maxAirflowCapacity` based on server count and specifications, eliminating the need for manual airflow input.

## Implementation Details

### Formula
```
Airflow (CFM) = Total Servers × Server Max Airflow CFM × 1.2 (safety margin)
```

### Code Location
- **File**: `src/components/simulation/EvaporativeCooling.tsx`
- **Lines**: ~345-365 (after `selectedServer` definition)

### Key Features
1. **Dynamic Calculation**: Uses `useMemo` to recalculate when server type or count changes
2. **Server-Specific**: Pulls `max_airflow_cfm` from selected server specifications
3. **Safety Margin**: Adds 20% buffer for peak loads and system inefficiencies
4. **Fallback**: Uses 180 CFM/server default if server data unavailable
5. **Console Logging**: Displays calculation details for debugging

### Example Calculation
```
50 servers × 250 CFM/server × 1.2 = 15,000 CFM
```

### Dependencies
```typescript
[selectedServer, totalServers, currentConfig?.maxAirflowCapacity]
```

## Bug Fix - Initialization Order

### Problem
Original implementation had `maxAirflowCapacity` defined at line ~120, but it referenced `selectedServer` which wasn't defined until line ~340, causing:
```
Error: Cannot access 'selectedServer' before initialization
```

### Solution
Moved `maxAirflowCapacity` useMemo to **after** `selectedServer` definition (line ~345).

### Code Structure (Correct Order)
```typescript
// 1. State variables (lines 100-230)
const [serverType, setServerType] = useState(...)
const [totalServers, setTotalServers] = useState(...)

// 2. Fetch servers from database (lines 300-340)
useEffect(() => { fetchServers() }, [])

// 3. Define selectedServer (line 340)
const selectedServer = useMemo(...)

// 4. Calculate maxAirflowCapacity (line 345) ✅
const maxAirflowCapacity = useMemo(...)

// 5. Other derived values
const numberOfRacks = useMemo(...)
```

## UI Display

### Location
Air Handling Unit section, below "Max Airflow Capacity" field

### Display Format
```tsx
<div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
  <p className="text-sm text-blue-800">
    💡 Auto-calculated: {totalServers} servers × {cfmPerServer} CFM/server × 1.2 margin = {maxAirflowCapacity} CFM
  </p>
</div>
```

## Testing

### Test Cases
1. ✅ Change server type → Airflow updates
2. ✅ Change server count → Airflow updates
3. ✅ No server selected → Falls back to 9000 CFM
4. ✅ Console logs calculation details
5. ✅ No initialization errors

### Validation
- Typical range: 5,000 - 20,000 CFM for 20-100 servers
- Rule of thumb: 150-200 CFM per server
- Safety margin: 20% above calculated requirement

## Backend Integration

### API Payload
The calculated `maxAirflowCapacity` is automatically included in the simulation config:
```json
{
  "evaporativeConfig": {
    "maxAirflowCapacity": 15000,
    ...
  }
}
```

### Backend Processing
- Backend receives CFM value
- Converts to m³/s: `airflow_m3s = cfm × 0.000471947`
- Uses in fan power calculation: `P_fan = (V̇ × ΔP) / η`

## Benefits

1. **User Experience**: No manual calculation needed
2. **Accuracy**: Based on actual server specifications
3. **Safety**: Built-in 20% margin prevents undersizing
4. **Transparency**: Shows calculation in UI
5. **Flexibility**: Falls back to defaults if needed

## Related Files
- `src/components/simulation/EvaporativeCooling.tsx` - Frontend implementation
- `evaporative-cooling-api/.../EvaporativeCoolingService.java` - Backend processing
- `FINAL_PHYSICS_FIXES_COMPLETE.md` - Related physics fixes

## Status
✅ **COMPLETE** - Feature implemented, tested, and bug-free
