# Evaporative Cooling API

Spring Boot REST API for 8760-hour weather-driven evaporative cooling simulations with engineering-grade cooling adequacy assessment.

## Features

- **8760-hour simulations** with hourly weather data CSV upload
- **Cooling adequacy assessment** with 4 engineering checks:
  - Heat Balance (cooling capacity vs heat load)
  - Inlet Temperature Compliance (ASHRAE limits)
  - Humidity Feasibility (evaporative cooling effectiveness)
  - Energy Efficiency (PUE thresholds)
- **Professional engineering output** with explanations and recommendations
- **Cost & emissions analysis** with configurable rates and grid factors
- **Multiple cooling modes**: Direct Evaporative (DEC), Indirect Evaporative (IEC), Hybrid

## Quick Start

### 1. Start the API Server

```bash
cd evaporative-cooling-api
mvn spring-boot:run
```

The API will start on `http://localhost:8080`

### 2. Test the API

```bash
# Health check
curl http://localhost:8080/api/simulations/health

# Get sample weather CSV
curl http://localhost:8080/api/test/sample-weather-csv > sample_weather.csv

# Get configuration template
curl http://localhost:8080/api/simulations/config-template
```

### 3. Run a Simulation

Use the frontend form or make a direct API call:

```bash
curl -X POST http://localhost:8080/api/simulations/evaporative-cooling \
  -F "weatherFile=@sample_weather.csv" \
  -F 'config={
    "simulation": {"time_horizon_hours": 8760, "time_step_seconds": 3600},
    "it_load": {"total_it_power_kw": 100, "servers": 100, "racks": 10},
    "cooling_system": {"type": "direct_evaporative", "max_airflow_cfm": 10000},
    "rates": {"electricity_usd_per_kwh": 0.12, "water_usd_per_liter": 0.001},
    "emissions": {"grid_kgco2_per_kwh": 0.45},
    "constraints": {"max_inlet_temp_c": 27.0, "max_pue": 1.5}
  }'
```

## API Endpoints

### POST `/api/simulations/evaporative-cooling`

Run evaporative cooling simulation with weather CSV upload.

**Request:**
- `weatherFile` (multipart file): CSV with 8760 hours of weather data
- `config` (JSON string): Simulation configuration

**Weather CSV Format:**
```csv
Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s
1,25.5,65.2,101.3,2.1
2,24.8,67.1,101.2,1.9
...
```

**Response:**
```json
{
  "status": "success",
  "results": {
    "energy": {"electricity_kwh_total": 876000, "fan_kwh": 87600},
    "water": {"water_liters_total": 450000},
    "cost": {"total_energy_cost_usd": 105120},
    "emissions": {"co2_kg_total": 394200},
    "performance": {"pue_average": 1.25, "availability_percent": 99.2}
  },
  "cooling_assessment": {
    "status": "COOLING_SUFFICIENT",
    "confidence": 0.95,
    "checks": {
      "heat_balance": true,
      "inlet_temperature_ok": true,
      "humidity_ok": true,
      "energy_efficiency_ok": true
    },
    "engineering_notes": [
      "Heat balance maintained - total cooling capacity meets heat generation",
      "Excellent energy efficiency achieved (PUE: 1.25)"
    ],
    "recommendations": [
      "System operating within design parameters",
      "Consider IEC mode during cooler periods to reduce water consumption"
    ]
  }
}
```

### GET `/api/simulations/config-template`

Get default configuration template.

### GET `/api/test/sample-weather-csv`

Download sample 8760-hour weather CSV for testing.

## Configuration Parameters

### Simulation Config
- `time_horizon_hours`: Simulation duration (default: 8760)
- `time_step_seconds`: Time step (default: 3600)

### IT Load Config
- `total_it_power_kw`: Total IT power load
- `servers`: Number of servers
- `racks`: Number of racks
- `power_utilization_model`: "linear" or "nonlinear"

### Cooling System Config
- `type`: "direct_evaporative", "indirect_evaporative", or "hybrid"
- `max_airflow_cfm`: Maximum airflow capacity
- `fan_efficiency`: Fan efficiency (0.3-0.9)
- `saturation_effectiveness`: Evaporative effectiveness (60-95%)
- `has_dx_backup`: Enable DX cooling backup
- `water_source`: "municipal" or "tank"

### Rates & Emissions
- `electricity_usd_per_kwh`: Electricity rate ($0.01-$1.00)
- `water_usd_per_liter`: Water rate ($0.0001-$0.01)
- `grid_kgco2_per_kwh`: Grid emissions factor (0.1-1.0 kg CO₂/kWh)

## Cooling Adequacy Assessment

The API performs 4 engineering checks on every simulation:

1. **Heat Balance**: Cooling capacity ≥ Heat load
2. **Inlet Temperature**: T_inlet ≤ 27°C (ASHRAE Class A1)
3. **Humidity Feasibility**: RH ≤ 80% AND wet-bulb depression > 5°C
4. **Energy Efficiency**: PUE ≤ 1.5

**Status Classifications:**
- `COOLING_SUFFICIENT`: All checks pass
- `LOCAL_HOTSPOTS`: Heat balance OK but temperature violations
- `CLIMATE_LIMITED`: Evaporative cooling ineffective due to humidity
- `INSUFFICIENT_COOLING`: Cooling capacity below heat load

## Integration with Frontend

The React frontend automatically calls this API when the "Run Simulation" button is clicked. Results are displayed with:

- ✅ Status badge (Green/Yellow/Orange/Red)
- 📊 Key performance metrics
- 📝 Engineering analysis notes
- 🔧 Actionable recommendations

## Development

### Requirements
- Java 17+
- Maven 3.6+
- Spring Boot 3.2+

### Build
```bash
mvn clean package
```

### Run Tests
```bash
mvn test
```

### Docker (Optional)
```bash
docker build -t evap-cooling-api .
docker run -p 8080:8080 evap-cooling-api
```

## Architecture

The API integrates with the existing Java evaporative cooling physics model and cooling adequacy assessment system:

- **Controller Layer**: REST endpoints and request validation
- **Service Layer**: Business logic and simulation orchestration  
- **Integration Layer**: Connects to existing `CoolingAdequacyAssessment.java`
- **Data Layer**: Weather CSV parsing and validation

This provides a clean separation between the web API and the core simulation engine.