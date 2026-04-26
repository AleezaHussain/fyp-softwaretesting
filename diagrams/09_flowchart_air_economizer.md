# Flowchart — Air-Side Economizer Engine (Per Hour)

```mermaid
flowchart TD
    A([Hour h Input]) --> B[Read: T_outdoor, RH, T_supply_setpoint]
    B --> C[Psychrometrics:\nCompute T_wetbulb, Enthalpy]
    C --> D{T_outdoor ≤ T_supply_setpoint?}

    D -->|Yes — Free Cooling Available| E[Mode: FULL_ECONOMIZER]
    D -->|No| F{T_outdoor ≤ T_supply_setpoint + ΔT_trim?}

    F -->|Yes — Partial Assist| G[Mode: PARTIAL_TRIM]
    F -->|No — Too Hot| H[Mode: MECHANICAL_ONLY]

    E --> E1[Free cooling fraction = 1.0\nMechanical load = 0]
    G --> G1[Free cooling fraction = partial\nMechanical load = remainder]
    H --> H1[Free cooling fraction = 0\nMechanical load = full IT load]

    E1 --> I[Calculate required airflow:\nQ_air = IT_load / ρ_air × Cp × ΔT]
    G1 --> I
    H1 --> I

    I --> J{Q_air > Q_max_airflow?}
    J -->|Yes| J1[Flag: AIRFLOW_VIOLATION\nLog thermal violation]
    J -->|No| K[Airflow within limits]
    J1 --> K

    K --> L[Fan power:\nP_fan = f(Q_air, static_pressure)]
    L --> M[Apply 15% filter penalty\nfor outdoor air filtration]
    M --> N[Mechanical cooling power:\nP_mech = mechanical_load / COP_dx]
    N --> O[Total power:\nP_total = P_fan + P_mech]
    O --> P[PUE = (P_IT + P_total) / P_IT]
    P --> Q[CUE = CO₂_emissions / P_IT_energy]
    Q --> R[Cost = P_total × TOU_rate[h]]
    R --> S([Return HourlyResult])
```
