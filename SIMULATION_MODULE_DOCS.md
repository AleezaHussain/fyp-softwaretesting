# New Simulation Module Documentation

## Overview

The New Simulation module is a comprehensive, step-by-step interface for creating and analyzing data center cooling simulations. It guides users through configuration, technique selection, environmental setup, and provides detailed results with comparative analysis.

## Features

### 1. Data Center Configuration (Step 1)
- **Component Management**: Add/remove data center equipment with quantity controls
- **Component Types**:
  - Server Racks (1U, 2U, 4U sizes)
  - Routers/Switches
  - Cooling Pumps
  - PDUs (Power Distribution Units)
  - Storage Arrays
  - Backup Generators
- **Real-time Metrics**: 
  - Total component count
  - Estimated heat load calculation
- **3D Visualization**: Interactive Three.js isometric view of components as they're added

### 2. Cooling Technique Selection (Step 2)
Three cooling methods with parameter configuration:

**Air Cooling**
- Supply Air Temperature (°C)
- Airflow Rate (CFM)
- Economizer Mode toggle

**Liquid Cooling**
- Coolant Type (Water, Glycol Mix, Dielectric)
- Flow Rate (GPM)
- Heat Exchanger Efficiency (%)

**Evaporative Cooling**
- Water Source (Mains, Recycled, Rainwater)
- Evaporation Rate (kg/s)
- Humidity Limits (%)

### 3. Location & Environmental Data (Step 3)
- **Location Selection**:
  - Preset locations (New York, London, Tokyo, Singapore, Frankfurt)
  - Custom coordinates input
- **Weather Data**: Temperature and humidity inputs
- **ASHRAE Standards**: Standard (18-27°C) or Extended (15-32°C)
- **Electricity Cost**: $/kWh with regional defaults

### 4. Simulation & Results (Step 4)
- **Progress Tracking**: Real-time progress bar with status updates
- **Key Metrics Dashboard**:
  - PUE (Power Usage Effectiveness)
  - WUE (Water Usage Effectiveness)
  - Total Energy Consumption
  - Estimated Annual Cost
  - Carbon Footprint
- **Interactive Charts**:
  - Hourly Energy Consumption (Line chart)
  - Temperature Trends (Line chart)
  - Technique Comparison (Bar charts)
  - Cost Breakdown (Pie chart)
- **Thermal Visualization**: Heat map overlay with cool/optimal/hot zones
- **Recommendation Engine**: Automatic best-practice selection with justification
- **Export Options**: PDF, CSV, Share functionality

## File Structure

```
src/
├── types/
│   └── simulation.ts              # Type definitions
├── components/simulation/
│   ├── DataCenterConfig.tsx       # Step 1 component
│   ├── DataCenterVisualizer.tsx   # 3D visualization wrapper
│   ├── ThreeJSVisualization.tsx   # Three.js 3D scene
│   ├── CoolingSelection.tsx       # Step 2 component
│   ├── LocationEnvironment.tsx    # Step 3 component
│   └── SimulationResults.tsx      # Step 4 component
├── components/
│   └── ReportsModule.tsx          # Reports and history
├── utils/
│   └── simulationUtils.ts         # Simulation calculations
└── pages/
    └── NewSimulation.tsx          # Main orchestrator page
```

## Component APIs

### DataCenterConfig
```tsx
<DataCenterConfig
  components={components}
  onAddComponent={handleAddComponent}
  onRemoveComponent={handleRemoveComponent}
  totalHeatLoad={totalHeatLoad}
  onProceed={handleProceed}
/>
```

### CoolingSelection
```tsx
<CoolingSelection
  onSelect={handleCoolingSelect}
  onBack={handleBack}
/>
```

### LocationEnvironment
```tsx
<LocationEnvironment
  onConfirm={handleLocationConfirm}
  onBack={handleBack}
/>
```

### SimulationResults
```tsx
<SimulationResults
  results={simulationResults}
  onNewSimulation={handleNewSimulation}
/>
```

### ThreeJSVisualization
```tsx
<ThreeJSVisualization
  components={components}
  width="100%"
  height="500px"
/>
```

## Routing

Navigate to the simulation module:
```
/simulation/new - Create new simulation
/simulations    - View all simulations
/reports        - View and compare reports
```

## State Management

The NewSimulation page manages:
- Current step (1-4)
- Data center components
- Cooling configuration
- Location data
- Simulation results

Example state structure:
```tsx
{
  currentStep: 2,
  components: [...],
  coolingConfig: { technique: 'water', ... },
  locationData: { city: 'New York', ... },
  results: { ... }
}
```

## Styling

Uses Tailwind CSS with custom brand colors:
- **Primary Red**: #fd5757
- **Cyan Accent**: #5ce1e5
- **Dark Gray**: #1a1a2e
- **Light Gray**: #f5f7fa

## Dependencies

- **React 18.2+**: UI framework
- **React Router**: Navigation
- **Three.js**: 3D visualization
- **Recharts**: Data visualization
- **Lucide React**: Icons
- **Tailwind CSS**: Styling

## Features Implemented

✅ Multi-step wizard interface
✅ Component configuration with modal
✅ Real-time heat load calculation
✅ 3D interactive visualization
✅ Cooling technique comparison
✅ Dynamic parameter forms
✅ Environmental data integration
✅ Comprehensive results dashboard
✅ Export functionality
✅ Responsive design
✅ Progress tracking
✅ Recommendation engine
✅ Reports module with comparison

## Future Enhancements

- [ ] Real API integration
- [ ] User simulation history persistence
- [ ] Advanced thermal modeling
- [ ] Machine learning recommendations
- [ ] Custom cooling technique modeling
- [ ] Real-time weather API integration
- [ ] Mobile app optimization
- [ ] Collaborative simulation sharing
- [ ] Cost-benefit analysis tools
- [ ] Integration with actual data center systems
