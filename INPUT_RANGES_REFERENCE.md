# Evaporative Cooling Form - Input Ranges Reference

## Quick Reference: All Input Ranges

---

## 📊 SERVER CONFIGURATION

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Number of Servers | 1 | 100 | 1 | 50 | servers |
| Servers per Rack | 1 | 42 | 1 | 10 | servers |
| Rack Count | - | - | - | auto | racks |

---

## 🤖 AI WORKLOAD MODULE

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Average IT Utilization | 10 | 100 | 1 | 60 | % |
| Peak IT Utilization | 50 | 100 | 1 | 90 | % |
| Rack Power Density | 5 | 150 | 0.1 | 0 (auto) | kW/rack |

**Rack Density Warnings:**
- ✅ **Green**: < 40 kW/rack (Air/evap suitable)
- ⚠️ **Yellow**: 40-50 kW/rack (Moderate stress)
- 🔴 **Red**: ≥ 80 kW/rack (Liquid cooling recommended)

---

## 🌡️ WEATHER DATA (CSV)

| Field | Min | Max | Unit | Notes |
|-------|-----|-----|------|-------|
| Dry Bulb Temperature | -50 | 60 | °C | Required column |
| Relative Humidity | 0 | 105 | % | Required, capped at 100% |
| Pressure | 80 | 110 | kPa | Optional, default: 101.325 |
| Wind Speed | 0 | - | m/s | Optional, default: 0 |
| Hour | 0 | 8759 | - | Optional, auto-generated |

**CSV Format:**
- Accepts flexible column names: `dry_bulb`, `drybulb`, `temp`, `drytemp`
- Accepts flexible humidity names: `relative_h`, `humidity`, `rh`, `relativehumidity`
- Auto-generates hour numbers if missing

---

## 🔮 FUTURE SCENARIO SETTINGS

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Temperature Offset | -2 | +4 | 0.1 | +1.0 | °C |
| Humidity Adjustment | -10 | +10 | 1 | 0 | % |

---

## 📦 RACK GEOMETRY

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Rack Height | 24 | 48 | 1 | 42 | U |

---

## 🌀 AIRFLOW DISTRIBUTION

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Air Bypass Fraction | 0 | 30 | 1 | 10 | % |
| Hot Air Recirculation | 0 | 25 | 1 | 5 | % |

**Warning Threshold:**
- 🔴 Alert if (Bypass + Recirculation) > 40%

**Presets:**
- **Excellent**: Bypass 3%, Recirc 2%
- **Typical**: Bypass 10%, Recirc 5%
- **Poor**: Bypass 20%, Recirc 15%

---

## 🔥 THERMAL MASS

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Rack Thermal Mass | 5 | 50 | 1 | 15 | kJ/K |
| Enclosure Thermal Mass | 20 | 150 | 5 | 30 | kJ/K |

**Note:** Only editable if "Manual Thermal Override" is enabled

---

## 🏢 ENCLOSURE TYPE (Auto-mapped values)

| Type | Thermal Mass Range | Air Leakage Range | Insulation |
|------|-------------------|-------------------|------------|
| Outdoor Container | 20-40 kJ/K | 0.3-0.8 ACH | Low-Medium |
| Indoor Closet | 30-60 kJ/K | 0.1-0.3 ACH | Medium |
| Prefab Micro-DC | 50-100 kJ/K | 0.05-0.2 ACH | High |
| Custom | 20-150 kJ/K | 0.05-1.0 ACH | Custom |

---

## 💨 INFILTRATION

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Custom ACH | 0.05 | 2.0 | 0.05 | 0.25 | ACH |

**Presets:**
- **Sealed**: 0.1 ACH
- **Standard**: 0.25 ACH
- **Leaky**: 0.7 ACH

---

## ❄️ COOLING SYSTEM - EVAPORATIVE PHYSICS

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Saturation Effectiveness | 60 | 95 | 1 | 85 | % |
| Face Velocity | 1.0 | 3.0 | 0.1 | 2.0 | m/s |
| Wetting Efficiency | 80 | 100 | 1 | 95 | % |

**Auto-Calculated:**
- **Max Airflow Capacity**: Total Servers × Server Max Airflow CFM × 1.2
- **Typical Range**: 5,000 - 20,000 CFM (for 20-100 servers)
- **Rule of Thumb**: 150-200 CFM per server

**Fixed (Backend):**
- **Fan Efficiency**: 65%
- **Enable Mechanical Backup**: true
- **DX COP**: 3.5
- **DX Max Capacity**: 0 (auto)

---

## 💧 WATER SYSTEM

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Cycles of Concentration | 3 | 12 | 1 | 5 | - |
| Tank Volume | 500 | 50,000 | 100 | 5,000 | L |
| Refill Rate | 0 | 50,000 | 100 | 0 | L/day |
| Low-Water Cutoff | 5 | 30 | 1 | 10 | % |

**Note:** Tank fields only shown if Water Source = "On-site tank"

---

## 💰 COST & ENVIRONMENTAL IMPACT

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Electricity Rate | 0.01 | 1.0 | 0.01 | 0.12 | $/kWh |
| Water Rate | 0.0001 | 0.01 | 0.0001 | 0.001 | $/L |
| Grid Emissions Factor | 0.1 | 1.0 | 0.01 | 0.45 | kg CO₂/kWh |

**Reference Values:**
- **Electricity**: US avg = $0.12/kWh
- **Water**: Municipal avg = $0.001/L
- **Emissions**: 
  - 0.1 = Clean grid (renewables)
  - 0.45 = Mixed grid (US avg)
  - 1.0 = Coal-heavy grid

---

## 📈 FINANCIAL PROJECTION (2025-2030)

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Annual Electricity Inflation | 0 | 15 | 0.1 | 4 | % |
| Annual Water Cost Inflation | 0 | 15 | 0.1 | 3 | % |
| Carbon Price | 0 | 200 | 1 | 50 | $/ton CO₂ |
| Carbon Price Growth | 0 | 15 | 0.1 | 5 | %/year |

---

## 🌍 CARBON ACCOUNTING MODE

| Field | Min | Max | Step | Default | Unit |
|-------|-----|-----|------|---------|------|
| Renewable Energy % | 0 | 100 | 1 | 0 | % |

**Note:** Only shown if Emissions Accounting Method = "Market-Based"

**Effective Emissions Calculation:**
```
Effective Emissions = Grid Emissions Factor × (1 - Renewable % / 100)
```

**Example:**
- Grid Factor: 0.45 kg CO₂/kWh
- Renewable: 50%
- Effective: 0.45 × (1 - 0.5) = 0.225 kg CO₂/kWh

---

## 📋 DROPDOWN OPTIONS

### Workload Type
- Traditional IT
- AI Training
- AI Inference
- Mixed AI + Traditional

### Power-Utilization Model
- Linear
- Non-linear (AI/GPU)

### Scenario Type
- Baseline (2025)
- Moderate Growth (2030)
- AI Growth
- Energy & Carbon Pressure

### Front-to-Back Airflow
- Yes
- No

### Airflow Quality Preset
- Excellent Containment (Bypass: 3%, Recirc: 2%)
- Typical Edge Micro-DC (Bypass: 10%, Recirc: 5%)
- Poor Airflow Management (Bypass: 20%, Recirc: 15%)
- Custom (Manual)

### Enclosure Type
- Outdoor Container
- Indoor Closet
- Prefab Micro-DC
- Custom (Advanced)

### Infiltration Level
- Sealed / Weather-tight (0.1 ACH)
- Standard Enclosure (0.25 ACH)
- Leaky Enclosure (0.7 ACH)
- Custom (Advanced)

### Cooling Architecture
- Direct Evaporative (DEC)
- Indirect Evaporative (IEC)
- Dew-point / M-cycle IEC
- Hybrid IEC + DX

### Media Type
- Cellulose Pad
- Polymer Membrane

### Water Source
- Municipal (unlimited)
- On-site tank (limited)

### Emissions Accounting Method
- Location-Based (Grid Average)
- Market-Based (Renewable PPA / REC adjusted)

---

## 🎯 VALIDATION SUMMARY

### Critical Ranges (Hard Limits)
```
Temperature:     -50°C to 60°C
Humidity:        0% to 105% (capped at 100%)
Pressure:        80 kPa to 110 kPa
Servers:         1 to 100
Rack Height:     24U to 48U
Airflow Losses:  ≤ 40% (warning threshold)
```

### Recommended Ranges (Soft Limits)
```
Rack Density:    < 40 kW/rack (air cooling suitable)
Utilization:     50-90% (typical data center)
COC:             4-8 (optimal water efficiency)
Saturation:      80-90% (typical evaporative media)
Face Velocity:   1.5-2.5 m/s (optimal performance)
```

### Auto-Calculated Ranges
```
Rack Count:      1 to 100 (based on servers/rack)
Airflow:         5,000 to 20,000 CFM (typical)
DX Capacity:     Peak IT Load × 1.3 (30% overhead)
```

---

## 🔢 UNIT CONVERSIONS

### Temperature
- Input: °C
- Backend: °C
- No conversion needed

### Airflow
- Input: CFM (Cubic Feet per Minute)
- Backend: m³/s (Cubic Meters per Second)
- Conversion: 1 CFM = 0.000471947 m³/s
- Example: 9000 CFM = 4.25 m³/s

### Pressure
- Input: kPa (Kilopascals)
- Backend: Pa (Pascals)
- Conversion: 1 kPa = 1000 Pa
- Standard: 101.325 kPa = 101,325 Pa

### Power
- Input: W (Watts) or kW (Kilowatts)
- Backend: kW (Kilowatts)
- Conversion: 1000 W = 1 kW

### Water
- Input: L (Liters)
- Backend: L (Liters)
- No conversion needed

---

## 📊 TYPICAL VALUES BY DATA CENTER SIZE

### Small Edge DC (10-20 servers)
```
Servers:         10-20
Rack Count:      1-2
Airflow:         3,000-6,000 CFM
Rack Density:    5-15 kW/rack
Tank Volume:     1,000-2,000 L
```

### Medium Edge DC (30-60 servers)
```
Servers:         30-60
Rack Count:      3-6
Airflow:         7,000-15,000 CFM
Rack Density:    15-30 kW/rack
Tank Volume:     3,000-8,000 L
```

### Large Edge DC (70-100 servers)
```
Servers:         70-100
Rack Count:      7-10
Airflow:         15,000-25,000 CFM
Rack Density:    30-50 kW/rack
Tank Volume:     10,000-20,000 L
```

---

## 🚨 WARNING THRESHOLDS

### Automatic Warnings Displayed:

1. **Rack Density ≥ 40 kW/rack**
   - Yellow warning: "Moderate stress on air/evap cooling"

2. **Rack Density ≥ 80 kW/rack**
   - Red warning: "Liquid cooling recommended"

3. **Airflow Losses > 40%**
   - Red warning: "Combined losses exceed realistic limits"

4. **Humidity > 100%**
   - Auto-capped at 100% with console warning

5. **Pressure out of range (80-110 kPa)**
   - Backend validation error

---

## 📝 NOTES

- All ranges are inclusive (min and max values are valid)
- Step values indicate the increment for sliders
- Default values are recommended starting points
- Auto-calculated fields cannot be manually edited
- Conditional fields only appear based on other selections
- Backend may apply additional validation beyond UI limits

---

## 🔗 RELATED DOCUMENTATION

- `EVAPORATIVE_COOLING_INPUTS_COMPLETE.md` - Full input list with descriptions
- `AUTO_AIRFLOW_CALCULATION.md` - Airflow auto-calculation details
- `FINAL_PHYSICS_FIXES_COMPLETE.md` - Physics methodology and fixes
- `CSV_FORMAT_GUIDE.md` - Weather data CSV format specifications
