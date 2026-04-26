# Flowchart — Chilled Water Physics Engine (Per Hour)

```mermaid
flowchart TD
    A([Hour h Input]) --> B[Read: T_outdoor, T_wetbulb, IT_load_kW]
    B --> C[AirDensityCalculator:\nAltitude-corrected ρ_air]
    C --> D[PsychrometricCalculator:\nDew point, Enthalpy, Humidity ratio]
    D --> E[ChillerUnit: Compute COP]

    E --> E1{T_outdoor > T_design?}
    E1 -->|Yes| E2[Apply EIR degradation curve\nCOP decreases with heat]
    E1 -->|No| E3[Nominal COP from EIR table]
    E2 --> F[Apply fouling factor penalty]
    E3 --> F

    F --> G[Compute chiller power:\nP_chiller = IT_load / COP]
    G --> H[CoolingTower:\nCompute approach temperature\nT_condenser = T_wetbulb + approach]
    H --> I[Compute tower fan power:\nP_tower = f(heat_rejection, airflow)]
    I --> J[PumpSystem:\nP_pump = f(flow_rate, head, efficiency)]
    J --> K[CRAHUnit:\nP_CRAH = f(airflow, static_pressure)]

    K --> L[Total cooling power:\nP_total = P_chiller + P_tower + P_pump + P_CRAH]
    L --> M[PUE = (P_IT + P_total) / P_IT]
    M --> N[Water usage:\nV_water = evaporation + drift + blowdown]
    N --> O[WUE = V_water / P_IT_energy]
    O --> P[CO₂ = P_total × grid_carbon_intensity]
    P --> Q[Cost = P_total × TOU_rate[h]]
    Q --> R([Return HourlyResult])
```
