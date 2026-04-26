# Flowchart — Core 8760-Hour Simulation Engine

```mermaid
flowchart TD
    A([Start Simulation]) --> B[Load SimulationRequest\nIT Load, Racks, Technique, Params]
    B --> C[Load 8760-Hour Weather Data]
    C --> D[ChillerAutoSizer: Calculate system capacity\nwith safety margins]
    D --> E[Initialize BayesianCalibrator\nwith prior parameters]
    E --> F{Technique?}

    F -->|Chilled Water| G1[ChilledWaterPhysics Engine]
    F -->|Air-Side| G2[AirEconomizerModel Engine]
    F -->|Evaporative| G3[EvaporativeCoolingModel Engine]

    G1 --> H[Hour Loop: h = 1 to 8760]
    G2 --> H
    G3 --> H

    H --> I[Read weather[h]:\nDry Bulb, Wet Bulb, Humidity]
    I --> J[Calculate IT Load[h]\nfrom CloudSim workload profile]
    J --> K{Technique-specific\nphysics calculation}

    K -->|Chilled Water| K1[Compute COP from EIR curve\nApply fouling factor\nCalculate pump + tower power\nCompute water usage]
    K -->|Air-Side| K2[Determine mode:\nFULL_ECON / PARTIAL_TRIM / MECHANICAL\nCalculate fan power + filter penalty\nCheck airflow violations]
    K -->|Evaporative| K3[Compute wet bulb temp\nSelect DEC / IEC / DX mode\nCalculate water consumption\nValidate ASHRAE T ≤ 27°C]

    K1 --> L[Calculate hourly metrics:\nPUE, WUE, CUE, COP]
    K2 --> L
    K3 --> L

    L --> M[Apply TOU electricity pricing]
    M --> N[Calculate hourly cost + CO₂ emissions]
    N --> O[Store HourlyResultDTO[h]]
    O --> P{h < 8760?}
    P -->|Yes| H
    P -->|No| Q[Aggregate Annual Results]

    Q --> R[BayesianCalibrator:\nAdjust params if telemetry available]
    R --> S[ClimateRiskAssessor:\n2050 thermal stress test]
    S --> T[ProjectionEngine:\n5-year financial projections]
    T --> U[Phase4Gates Validation:\nThermal / Water / Carbon / Economic]
    U --> V[Build SimulationResponse:\nAnnual + Hourly + Climate + Financial]
    V --> W([Return Results])
```
