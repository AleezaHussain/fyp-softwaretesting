# Hot/Cold Aisle Containment Simulation

This module is standalone and separate from the Java-based liquid and evaporative simulations.

- Entry point: `simulations/hot_cold_aisle/hot_cold_aisle_sim.py`
- Optional scenarios file: `simulations/hot_cold_aisle/scenarios.json`
- Outputs (if pandas installed): `simulations/hot_cold_aisle/results/`

## Run
```bash
# (Optional) install pandas for CSV outputs
pip install pandas

# Run
python simulations/hot_cold_aisle/hot_cold_aisle_sim.py
```

If `scenarios.json` is absent, default scenarios from the paper description are used.

## Scenario schema (scenarios.json)
```json
[
  {
    "id": "H1V1_IT_Light_25C_Aisle",
    "hosts": 1,
    "vms": 1,
    "workload_type": "IT",          // IT | Mixed | NonIT
    "ambient_temp_C": 25,
    "airflow_cfm": 600,
    "containment": "Cold",          // Cold | Hot
    "duration_s": 600,
    "dt_s": 5,
    "p_it_per_host_W": 300.0,
    "p_lighting_W": 200.0,
    "p_UPS_loss_W": 150.0,
    "p_fans_W": 250.0,
    "COP": 4.0,
    "containment_eta_guess": 0.85,
    "bypass_air_frac": 0.05,         // BAF
    "recirc_air_frac": 0.05,         // RAF
    "racks": 6
  }
]
```

## Outputs
- Per-timestep metrics:
  - `T_cold_supply_C`, `T_hot_return_C`, `deltaT_C`, `eta_containment`
  - `Q_IT_J`, `Q_nonIT_J`, `airflow_cfm`, `P_cooling_W`, `PUE`, `savings_vs_open_Wh`
  - `BAF`, `RAF`
- Summary per scenario:
  - `Q_IT_MJ`, `Q_nonIT_MJ`, `cooling_Wh`, `savings_vs_open_Wh`
  - `avg_PUE`, `avg_eta_containment`, `T_cold_supply_C`, `T_hot_return_C`, `deltaT_C`

## Notes
- This module does not depend on the Java Maven build and remains isolated.
- Adjust `BAF/RAF` to emulate open vs contained aisles.
- Extend to per-rack modeling by adding a rack loop inside `step()`.
