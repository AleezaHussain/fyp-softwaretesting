# Air Economizer UI - Missing Projection Fields

## Current Status

### Backend ✅ COMPLETE
The Air Economizer backend has all projection parameters:
- `forecastYears` (default: 5)
- `energyEscalationRate` (default: 0.035 = 3.5%)
- `carbonTaxProjected` (default: 126.0 $/ton)
- `climateChangeOffsetC` (default: 0.0 °C/year)

### Frontend ❌ MISSING
The Air Economizer UI (`src/components/simulation/AirSideEconomization.tsx`) does NOT have input fields for these parameters.

---

## Comparison with Evaporative Cooling UI

### Evaporative Cooling Has:
1. ✅ **Annual Electricity Inflation** (%) - Line 167
2. ✅ **Annual Water Inflation** (%) - Line 170
3. ✅ **Carbon Price** ($ per ton CO₂) - Line 172
4. ✅ **Carbon Price Growth** (% per year) - Line 175
5. ✅ **Temperature Offset** (°C) - Line 192
6. ✅ **Scenario Type** dropdown (Baseline 2025, Moderate Growth 2030, AI Growth, Energy & Carbon Pressure)

### Air Economizer Currently Has:
1. ❌ No electricity inflation field
2. ❌ No carbon price field
3. ❌ No carbon price growth field
4. ❌ No temperature offset field
5. ❌ No scenario selection
6. ✅ Has CloudSim AI workload modes (AI_TRAINING, AI_INFERENCE, MIXED, ENTERPRISE)
7. ✅ Has advanced economizer controls

---

## Fields to Add to Air Economizer UI

### Section: "Financial Projection (2025–2030)"

#### 1. Annual Electricity Inflation (%)
```tsx
const [annualElectricityInflation, setAnnualElectricityInflation] = useState<number>(3.5);
```
- **Range**: 0-15%
- **Default**: 3.5%
- **Description**: Annual electricity cost escalation rate
- **Maps to backend**: `energyEscalationRate` (divide by 100)

#### 2. Carbon Price ($ per ton CO₂)
```tsx
const [carbonPrice, setCarbonPrice] = useState<number>(126.0);
```
- **Range**: 0-200
- **Default**: $126 (EU 2030 target)
- **Description**: Projected carbon tax rate
- **Maps to backend**: `carbonTaxProjected`

#### 3. Carbon Price Growth (% per year)
```tsx
const [carbonPriceGrowth, setCarbonPriceGrowth] = useState<number>(15.0);
```
- **Range**: 0-20%
- **Default**: 15%
- **Description**: Annual carbon price escalation rate
- **Note**: Backend uses fixed 15% in ProjectionEngine, but UI should allow customization

#### 4. Temperature Offset (°C)
```tsx
const [temperatureOffset, setTemperatureOffset] = useState<number>(0.0);
```
- **Range**: 0-5°C
- **Default**: 0°C
- **Description**: Climate change temperature increase over forecast period
- **Maps to backend**: `climateChangeOffsetC` (divide by forecastYears)
- **Effect**: Each 1°C reduces economizer effectiveness by ~3%

#### 5. Forecast Years (Optional - can be hardcoded)
```tsx
const [forecastYears] = useState<number>(5); // Hardcoded to 5 years (2025-2030)
```
- **Fixed**: 5 years
- **Description**: Projection horizon
- **Maps to backend**: `forecastYears`

---

## UI Layout Recommendation

Add a new section after "Advanced Economizer Controls":

```tsx
{/* Financial Projection Section */}
<div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
    <DollarSign className="w-6 h-6 text-green-600" />
    <div>
      <h4 className="font-bold text-lg text-gray-900">
        Financial Projection (2025–2030)
      </h4>
      <p className="text-sm text-gray-500">
        Multi-year cost and emissions forecasting
      </p>
    </div>
  </div>
  
  <div className="space-y-6">
    {/* Annual Electricity Inflation */}
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">
        Annual Electricity Inflation (%)
      </label>
      <input
        type="number"
        min={0}
        max={15}
        step={0.1}
        value={annualElectricityInflation}
        onChange={(e) => setAnnualElectricityInflation(Number(e.target.value))}
        className="w-full p-3 border border-gray-300 rounded-lg"
      />
      <p className="text-xs text-gray-500 mt-1">
        Range: 0-15% | Default: 3.5% | Annual electricity cost escalation rate
      </p>
    </div>

    {/* Carbon Price */}
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">
        Carbon Price ($ per ton CO₂)
      </label>
      <input
        type="number"
        min={0}
        max={200}
        step={1}
        value={carbonPrice}
        onChange={(e) => setCarbonPrice(Number(e.target.value))}
        className="w-full p-3 border border-gray-300 rounded-lg"
      />
      <p className="text-xs text-gray-500 mt-1">
        Range: 0-200 | Default: $126 | EU 2030 target carbon tax
      </p>
    </div>

    {/* Carbon Price Growth */}
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">
        Carbon Price Growth (% per year)
      </label>
      <input
        type="number"
        min={0}
        max={20}
        step={0.1}
        value={carbonPriceGrowth}
        onChange={(e) => setCarbonPriceGrowth(Number(e.target.value))}
        className="w-full p-3 border border-gray-300 rounded-lg"
      />
      <p className="text-xs text-gray-500 mt-1">
        Range: 0-20% | Default: 15% | Annual carbon price escalation rate
      </p>
    </div>

    {/* Temperature Offset (Climate Change) */}
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1">
        Temperature Offset (°C)
      </label>
      <input
        type="number"
        min={0}
        max={5}
        step={0.1}
        value={temperatureOffset}
        onChange={(e) => setTemperatureOffset(Number(e.target.value))}
        className="w-full p-3 border border-gray-300 rounded-lg"
      />
      <p className="text-xs text-gray-500 mt-1">
        Range: 0-5°C | Default: 0°C | Climate change temperature increase over 5 years
      </p>
    </div>
  </div>
</div>
```

---

## Backend Mapping in API Call

Update the API request payload to include these fields:

```tsx
const payload = {
  // ... existing fields ...
  
  // Financial Projection Parameters
  forecastYears: 5, // Hardcoded
  energyEscalationRate: annualElectricityInflation / 100, // Convert % to decimal
  carbonTaxProjected: carbonPrice,
  climateChangeOffsetC: temperatureOffset / 5, // Divide by forecast years for annual rate
};
```

---

## Expected API Response

Once these fields are added, the API will return:

```json
{
  "summary": { ... },
  "hourlyResults": [ ... ],
  "projection": {
    "forecastYears": 5,
    "totalEnergy": 125000.0,
    "totalEmissions": 6875.0,
    "totalCost": 18750.0,
    "totalCarbonTax": 866250.0,
    "totalSavings": 45000.0,
    "npvSavings": 38500.0,
    "adjustedPaybackYears": 2.3,
    "yearlyData": [ ... ]
  },
  "climateScenarios": [
    {
      "name": "Conservative (Low Climate Impact)",
      "temperatureIncrease": 0.5,
      "totalEnergy": 126250.0,
      "totalEmissions": 6943.75,
      "totalCost": 18937.5,
      "adjustedPaybackYears": 2.4
    },
    ...
  ]
}
```

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Backend parameters (DONE)
2. ✅ Backend ProjectionEngine (DONE)
3. ✅ API integration (DONE)
4. ❌ **UI input fields** (NEEDED)
5. ❌ **API payload mapping** (NEEDED)

### Medium Priority (Enhanced UX)
1. ❌ Display projection results in UI
2. ❌ Show yearly breakdown chart
3. ❌ Display climate scenarios comparison

### Low Priority (Nice to Have)
1. ❌ Scenario presets (like Evaporative Cooling)
2. ❌ Interactive projection charts
3. ❌ Export projection data

---

## Summary

**Backend**: ✅ Complete - All parameters implemented  
**API**: ✅ Complete - Projection calculations working  
**Frontend**: ❌ Missing - Need to add 4 input fields  

**Next Step**: Add the 4 input fields to `AirSideEconomization.tsx` and map them to the API payload.

---

## Code Location

**File to modify**: `src/components/simulation/AirSideEconomization.tsx`

**Insert location**: After line ~1814 (after "Advanced Economizer Controls" section)

**Estimated effort**: 30-45 minutes to add fields and wire up state management
