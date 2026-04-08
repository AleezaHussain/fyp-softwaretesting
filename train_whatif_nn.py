import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow import keras
from tensorflow.keras import layers

# Load data
df = pd.read_csv('synthetic_simulation_data.csv')
targets = ['power_kw', 'efficiency_percent', 'cost_per_hr', 'wue_l_per_kwh']
features = [col for col in df.columns if col not in targets]
X = df[features].values
y = df[targets].values

# Split
test_size = 0.15
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

# Build model
model = keras.Sequential([
    layers.Input(shape=(X.shape[1],)),
    layers.Dense(128, activation='relu'),
    layers.Dense(64, activation='relu'),
    layers.Dense(32, activation='relu'),
    layers.Dense(y.shape[1])
])
model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# Train
history = model.fit(X_train, y_train, epochs=80, batch_size=32, validation_split=0.1, verbose=2)

# Evaluate
loss, mae = model.evaluate(X_test, y_test, verbose=0)
print(f"Test MAE: {mae:.4f}")

# Save model
model.save('whatif_nn_model.keras')
print('Model saved as whatif_nn_model.keras')
