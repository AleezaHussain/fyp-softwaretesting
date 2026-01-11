# Air Side Economization Component Implementation

## Overview
Created a comprehensive Air Side Economization form component (`src/components/simulation/AirSideEconomization.tsx`) that provides detailed configuration for air cooling simulations.

## Features Implemented

### 1. Server Configuration
- **Server Dropdown**: 6 US-based server models with auto-fill specifications:
  - Dell PowerEdge R750 (650W max, 180W idle)
  - HP ProLiant DL380 Gen10 (600W max, 170W idle)
  - Lenovo ThinkSystem SR550 (700W max, 200W idle)
  - IBM Power System E1050 (750W max, 220W idle)
  - Supermicro SYS-1124US-TNRT (580W max, 160W idle)
  - Cisco UCS C480 M5 (800W max, 240W idle)

- **Input Fields**:
  - Number of Racks (1-100)
  - Servers per Rack (1-50)
  - Average Utilization (0-100%)
  - Peak Utilization (0-100%)

- **Auto-filled Specs**: Max Power, Idle Power displayed from server library

### 2. Fan Configuration
Three fan efficiency categories with quantity inputs:
- **Best-in-class Fans**: 0.30–0.40 W/CFM (VFD optimized, modern cooling)
- **Average Fans**: 0.50–0.70 W/CFM (VFD retrofit, mid-tier performance)
- **Legacy Fans**: 0.80–1.20 W/CFM (Constant speed, older installations)

Fan power is calculated based on:
- Estimated CFM (10 CFM per kW of IT load)
- Fan efficiency range (W/CFM)
- Proportional distribution among fan types

### 3. Regional Tariff Configuration
US tariff ranges by region:
- **US Northeast**: $0.13–$0.18/kWh (typical: $0.15)
- **US Midwest**: $0.10–$0.14/kWh (typical: $0.12)
- **US South**: $0.10–$0.13/kWh (typical: $0.11)
- **US West**: $0.12–$0.16/kWh (typical: $0.14)
- **California**: $0.14–$0.22/kWh (typical: $0.18)

### 4. Real-time Calculations
Live metrics displayed in summary box:
- **Total Servers**: Racks × Servers/Rack
- **Average Power per Server**: Idle + (Max - Idle) × (Avg Util%)
- **Total IT Power**: Average Power × Total Servers (in kW)
- **Estimated CFM**: IT Power (kW) × 10 CFM/kW
- **Total Fan Power**: Sum of all fan categories' power consumption (in kW)
- **Total Cooling Power**: IT Power + Fan Power (in kW)
- **Annual Cost**: Total Power × 24 hours × 365 days × Tariff ($/year)

## Component Architecture

### Props Interface (AirSideConfig)
```typescript
interface AirSideConfig {
  serverType: keyof typeof SERVER_LIBRARY
  numberOfRacks: number
  serversPerRack: number
  averageUtilization: number
  peakUtilization: number
  fans: FanConfig
  region: 'us_northeast' | 'us_midwest' | 'us_south' | 'us_west' | 'california'
  onConfigChange: (config: any) => void
}
```

### Return Data from onConfigChange()
```typescript
{
  serverType: string
  numberOfRacks: number
  serversPerRack: number
  averageUtilization: number
  peakUtilization: number
  fans: { bestFans: number, averageFans: number, oldFans: number }
  region: string
  calculations: {
    totalServers: number
    avgPowerPerServer: number (W)
    peakPowerPerServer: number (W)
    totalITPowerKW: number
    totalFanPowerKW: number
    totalCoolingPowerKW: number
    annualCostUSD: number
  }
}
```

## Integration

### Updated Files
1. **src/components/simulation/AirSideEconomization.tsx** (NEW)
   - 445 lines of TypeScript/React code
   - Comprehensive form with auto-calculations

2. **src/components/simulation/CoolingSelection.tsx** (MODIFIED)
   - Added import: `import { AirSideEconomization } from './AirSideEconomization'`
   - Replaced basic air cooling inputs with full AirSideEconomization component
   - Conditional rendering: Air cooling → full form; Water/Evaporative → simple parameters
   - Fixed comparison data structure to match CoolingEfficiencyPreview interface

### Integration Point
In `/simulation/new` → Step 2 (Cooling Technique Selection):
1. User selects "Air Cooling" technique card
2. Component automatically renders AirSideEconomization form below
3. Form includes:
   - Section 1: Server Configuration (numbered indicator)
   - Section 2: Fan Configuration (numbered indicator)
   - Section 3: Regional Tariff (numbered indicator)
   - Summary box with annual power and cost metrics
4. onConfigChange callback updates parent state with all calculations

## UI/UX Details

### Color Scheme
- Cyan accent (#5ce1e5) for primary inputs and "Best" fans
- Red accent (#fd5757) for secondary buttons and "Legacy" fans
- Section numbering with colored badges (cyan, red, amber)
- Conditional background colors for fan categories:
  - Best fans: Green (green-50)
  - Average fans: Yellow (yellow-50)
  - Legacy fans: Red (red-50)

### Visual Hierarchy
- Numbered sections for clear progression
- Auto-filled specs in blue highlight box (Info icon)
- Summary metrics in gradient background (blue-to-cyan)
- Input fields with focus ring effects
- Responsive grid layouts (2-4 columns)

### Accessibility
- Semantic HTML labels with input associations
- Descriptive help text for tariff ranges
- Info icons for auto-filled specs
- Clear visual distinction between input types

## Testing Checklist
- ✅ Dev server running at http://localhost:3000/
- ✅ Navigate to `/simulation/new` → Step 2
- ✅ Select "Air Cooling" technique
- ✅ Verify all form sections render
- ✅ Test server dropdown auto-fill
- ✅ Test racks and servers/rack inputs
- ✅ Verify fan quantity inputs
- ✅ Test tariff region dropdown
- ✅ Confirm live calculations update on input changes
- ✅ Check annual cost calculation accuracy
- ✅ Verify onConfigChange callback fires

## Next Steps
1. Test form submission and data flow to next step
2. Validate calculations against domain expertise
3. Add form validation (min/max constraints)
4. Integrate with simulation results display
5. Test edge cases (zero servers, extreme utilization values)
6. Performance optimization if needed

## File Statistics
- **New File**: AirSideEconomization.tsx (445 lines)
- **Modified File**: CoolingSelection.tsx (+1 import, ~30 line changes)
- **No breaking changes**: All existing functionality preserved

## Deployment Notes
- Component uses only existing dependencies (React, TypeScript, Tailwind CSS, Lucide icons)
- No new npm packages required
- TypeScript compilation verified
- Dev server running successfully
