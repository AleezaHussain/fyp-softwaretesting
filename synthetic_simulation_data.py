import numpy as np
import pandas as pd

# Number of synthetic samples to generate
N = 2000

# Parameter ranges
airflow_range = (50, 200)  # percent
inlet_temp_range = (15, 45)  # Celsius
humidity_range = (20, 80)  # percent
cooling_setpoint_range = (18, 30)  # Celsius
workload_range = (10, 1000)  # kW

# Generate random scenarios
airflow = np.random.uniform(*airflow_range, N)
inlet_temp = np.random.uniform(*inlet_temp_range, N)
humidity = np.random.uniform(*humidity_range, N)
cooling_setpoint = np.random.uniform(*cooling_setpoint_range, N)
workload = np.random.uniform(*workload_range, N)

# Simple outcome models (add noise for realism)
power = workload * (1 + (inlet_temp - cooling_setpoint) * 0.01 + (airflow - 100) * 0.002) + np.random.normal(0, 10, N)
efficiency = 100 - (inlet_temp - cooling_setpoint) * 1.5 - (airflow - 100) * 0.2 + np.random.normal(0, 2, N)
cost = power * 0.12 + np.random.normal(0, 1, N)
wue = np.clip(0.5 + (humidity / 100) * 1.5 + np.random.normal(0, 0.1, N), 0.3, 3.0)

# Build DataFrame
df = pd.DataFrame({
    'airflow_percent': airflow,
    'inlet_temp_c': inlet_temp,
    'humidity_percent': humidity,
    'cooling_setpoint_c': cooling_setpoint,
    'workload_kw': workload,
    'power_kw': power,
    'efficiency_percent': efficiency,
    'cost_per_hr': cost,
    'wue_l_per_kwh': wue
})

# Save to CSV
df.to_csv('synthetic_simulation_data.csv', index=False)

print('Synthetic dataset generated: synthetic_simulation_data.csv')
