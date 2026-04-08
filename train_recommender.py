# train_recommender.py
# Python script that loads dataset.csv, trains a classifier, and saves a model file.

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

# 1) Load data
candidate_files = [
    Path("dataset.csv"),
    Path("dataset - Copy.csv"),
    Path("dataset_full.csv"),
    Path("dataset_full - Copy.csv"),
]

df = None
source_path = None
for candidate in candidate_files:
    if candidate.exists():
        candidate_df = pd.read_csv(candidate)
        if not candidate_df.empty:
            df = candidate_df
            source_path = candidate
            break

if df is None:
    raise FileNotFoundError("No populated dataset CSV found for training")

print(f"Loading {source_path}")

# 2) Select features and label
features = ["tempC", "rh", "itLoadKW"]
for optional_feature in ["electricityPrice", "waterPrice", "carbonFactor", "electricity", "water"]:
    if optional_feature in df.columns:
        features.append(optional_feature)

if "bestTechnique" not in df.columns:
    raise KeyError("Expected target column 'bestTechnique' was not found in the dataset")

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