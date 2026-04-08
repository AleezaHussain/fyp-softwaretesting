import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

# Load synthetic data
df = pd.read_csv('synthetic_simulation_data.csv')

# Features and targets
targets = ['power_kw', 'efficiency_percent', 'cost_per_hr', 'wue_l_per_kwh']
features = [col for col in df.columns if col not in targets]

X = df[features]
y = df[targets]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

# Train a multi-output regressor
model = RandomForestRegressor(n_estimators=120, random_state=42)
model.fit(X_train, y_train)

# Save model
joblib.dump(model, 'whatif_rf_model.joblib')

# Print score
print('Train R^2:', model.score(X_train, y_train))
print('Test R^2:', model.score(X_test, y_test))
print('Model saved as whatif_rf_model.joblib')
