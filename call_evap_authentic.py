import json
from pathlib import Path
import requests

config = {
    "simulation": {"time_horizon_hours": 8760, "time_step_seconds": 3600},
    "it_load": {"total_it_power_kw": 42.0, "servers": 96, "racks": 6, "power_utilization_model": "linear"},
    "cooling_system": {
        "type": "direct_evaporative",
        "max_airflow_cfm": 10000.0,
        "fan_efficiency": 0.8,
        "saturation_effectiveness": 90.0,
        "face_velocity_ms": 2.5,
        "wetting_efficiency": 95.0,
        "media_type": "cellulose",
        "has_dx_backup": True,
        "dx_cop": 4.0,
        "water_source": "municipal",
        "cycles_of_concentration": 6.0,
        "tank_volume_l": 3000.0,
        "refill_rate_l_per_day": 0.0,
        "low_water_cutoff_percent": 15.0,
    },
    "rates": {"electricity_usd_per_kwh": 0.145, "water_usd_per_liter": 0.002},
    "emissions": {"grid_kgco2_per_kwh": 0.46},
    "constraints": {"max_inlet_temp_c": 27.0, "max_relative_humidity": 80.0, "max_pue": 1.5},
}

csv_path = Path("year_weather_8760.csv")
if not csv_path.exists():
    raise SystemExit("year_weather_8760.csv not found")

url = "http://localhost:8082/api/simulations/evaporative-cooling"
with csv_path.open("rb") as f:
    files = {"weatherFile": (csv_path.name, f, "text/csv")}
    data = {"config": json.dumps(config)}
    resp = requests.post(url, files=files, data=data, timeout=180)

print(resp.status_code)
text = resp.text
Path("evap_live_8760_output.json").write_text(text, encoding="utf-8")
print("saved evap_live_8760_output.json")
