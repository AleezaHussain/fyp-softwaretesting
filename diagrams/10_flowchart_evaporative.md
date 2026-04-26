# Flowchart — Evaporative Cooling Engine (Per Hour)

```mermaid
flowchart TD
    A([Hour h Input]) --> B[Read: T_drybulb, T_wetbulb, RH, IT_load]
    B --> C[PsychrometricCalculator:\nStull 2011 formula for T_wetbulb]
    C --> D{T_wetbulb ≤ DEC_threshold?}

    D -->|Yes| E[Mode: DEC\nDirect Evaporative Cooling]
    D -->|No| F{T_wetbulb ≤ IEC_threshold?}

    F -->|Yes| G[Mode: IEC\nIndirect Evaporative Cooling]
    F -->|No| H[Mode: DX\nMechanical Cooling Backup]

    E --> E1[Effectiveness: 85%\nT_supply = T_drybulb - 0.85×(T_drybulb - T_wetbulb)\nWater: 4.5 L/kWh]
    G --> G1[Effectiveness: 70%\nT_supply = T_drybulb - 0.70×(T_drybulb - T_wetbulb)\nWater: 3.0 L/kWh]
    H --> H1[Effectiveness: 100%\nT_supply = T_setpoint\nWater: 0.5 L/kWh]

    E1 --> I[Validate ASHRAE compliance:\nT_supply ≤ 27°C?]
    G1 --> I
    H1 --> I

    I --> J{T_supply > 27°C?}
    J -->|Yes| J1[Flag: THERMAL_VIOLATION\nEscalate to DX mode]
    J -->|No| K[Compliance OK]
    J1 --> K

    K --> L[Calculate cooling capacity:\nQ_cooling = ṁ_air × Cp × ΔT]
    L --> M[Water consumption:\nV_water = IT_load × water_rate]
    M --> N[WUE = V_water / P_IT_energy]
    N --> O[Fan + pump power calculation]
    O --> P[PUE = (P_IT + P_cooling) / P_IT]
    P --> Q[CO₂ + Cost calculation]
    Q --> R([Return HourlyResult])
```
