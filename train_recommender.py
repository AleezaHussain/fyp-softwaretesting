# train_recommender.py
# Python script that loads dataset.csv, trains a classifier, and saves a model file.

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

# 1) Load data
print("Loading dataset.csv")
df = pd.read_csv("dataset.csv")

# 2) Select features and label
features = ["tempC", "rh", "itLoadKW"]
if "electricity" in df.columns:
    features.append("electricity")
if "water" in df.columns:
    features.append("water")

X = df[features]
y = df["bestTechnique"]

# 3) Split into training/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 4) Train
print("Training model")
model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)

# 5) Evaluate
pred = model.predict(X_test)
print(classification_report(y_test, pred))

# 6) Save model
joblib.dump(model, "cooling_recommender.pkl")
print("✅ saved cooling_recommender.pkl")
