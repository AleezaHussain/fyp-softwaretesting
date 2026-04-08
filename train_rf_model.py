import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

# Load data
DATA_PATH = 'synthetic_simulation_data_with_prices.csv'
df = pd.read_csv(DATA_PATH)

# Features and targets (adjust as needed)
FEATURES = [
    'airflow_percent',
    'inlet_temp_c',
    'humidity_percent',
    'cooling_setpoint_c',
    'workload_kw',
    'electricity_price',
    'water_price',
    'carbon_factor',
]
TARGETS = [
    'power_kw',
    'efficiency_percent',
    'cost_per_hr',
    'wue_l_per_kwh',
]

X = df[FEATURES]
y = df[TARGETS]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

# Evaluate
y_pred = rf.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
print(f"Test MSE: {mse}")

# Save model
joblib.dump(rf, 'whatif_rf_model.joblib')
print("Model saved as whatif_rf_model.joblib")
