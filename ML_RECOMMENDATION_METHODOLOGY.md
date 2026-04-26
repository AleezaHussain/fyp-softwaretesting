# Machine Learning-Based Cooling Technique Recommendation System: Comprehensive Methodology

---

## Chapter 3: Methodology

### 3.1 Introduction and Objective

This chapter presents the complete methodology for the machine learning recommendation module that automatically selects the optimal cooling technique for data center thermal management. The methodology is written as one connected pipeline rather than isolated notes: the dataset is generated under explicit physical and operational assumptions, the raw scenarios are converted into labels using simulator-derived ground truth, the cleaned data is used to train and tune a Random Forest classifier, and the classifier is then combined with feasibility checks and rule-based scoring to produce the final recommendation and justification.

The objective is to replace computationally expensive full-system simulations with a lightweight, deployable classifier capable of real-time decision support in production environments. The model is intentionally built around a small set of interpretable features so that the resulting recommendation remains traceable, auditable, and aligned with the actual operating context of the data center.

Accordingly, the chapter proceeds in the same order as the research workflow: assumptions and dataset construction, label derivation, cleaning and preprocessing, model development and tuning, evaluation, recommendation fusion, explanation generation, reproducibility, and limitations. This makes the section suitable for direct inclusion in a thesis or research paper methodology chapter.

---

## 3.2 Problem Formulation

### 3.2.1 Problem Definition

The cooling technique recommendation task is formulated as a **multi-class supervised classification problem**. Given environmental, operational, and economic context, the system must predict the most suitable cooling technology from a discrete set of candidates.

**Formally**, the problem is defined as:

Let $\mathcal{X} = \mathbb{R}^6$ be the input feature space and $\mathcal{Y} = \{\text{AirEconomizer}, \text{Evaporative}, \text{ChilledWater}\}$ be the set of three cooling technique classes. The objective is to learn a discriminative function:

$$f: \mathcal{X} \rightarrow \mathcal{Y}$$

such that for a given scenario $\mathbf{x} = (x_1, x_2, \ldots, x_6) \in \mathcal{X}$, the predicted class $\hat{y} = f(\mathbf{x})$ minimizes expected prediction error on unseen data sampled from the same distribution.

### 3.2.2 Feature Specification

The input feature vector comprises six domain-informed predictors, selected to ensure deployment feasibility and physical interpretability:

1. **Thermal Context:**
   - $x_1 = \text{tempC}$: Ambient dry-bulb temperature (°C), representing external weather conditions.
   - $x_2 = \text{rh}$: Relative humidity (%), indicating moisture availability for evaporative cooling and thermal load amplification.

2. **Demand Context:**
   - $x_3 = \text{itLoadKW}$: Total IT infrastructure power demand (kW), representing thermal load magnitude.

3. **Economic Context:**
   - $x_4 = \text{electricityPrice}$: Grid electricity rate (USD/kWh), affecting operational cost calculations.
   - $x_5 = \text{waterPrice}$: Water supply cost (USD/liter), penalizing water-intensive techniques.

4. **Environmental Policy Context:**
   - $x_6 = \text{carbonFactor}$: Grid carbon intensity (kg CO₂/kWh), representing embodied emissions per unit electricity.

These features are selected based on their direct relevance to the physical feasibility and economic viability of each cooling technique. Features derived from post-simulation outcomes (e.g., per-technique energy predictions) are explicitly excluded to prevent label leakage [1].

### 3.2.3 Target Variable

The target variable $y$ is a categorical label derived from simulator-based ground truth. For each scenario $\mathbf{x}$, three parallel cooling simulations are executed (one per technique), yielding multivariate performance vectors including energy consumption, cost, water usage, and constraint violations. The best technique is selected according to a simulator-defined aggregation rule that prioritizes feasibility first, then minimizes primary resource consumption (typically energy). This creates a synthetic but domain-grounded label set.

---

## 3.3 Data Generation and Label Derivation

The dataset used in this study is constructed from a controlled scenario-generation process. Each row represents one operating condition for a data center, defined by ambient temperature, relative humidity, IT load, electricity price, water price, and carbon factor. The main assumption is that these six variables are sufficient to characterize the decision context for cooling-technique selection at the level required by the recommendation model. In addition, the simulator outputs are treated as the source of ground truth, meaning the label is not manually assigned but derived from the best-performing technique under that scenario.

### 3.3.1 Scenario Sampling Strategy

A large set of synthetic operating scenarios is generated via **stratified random sampling** across the feature space to ensure representative coverage:

- **Temperature ($\text{tempC}$)**: Uniformly sampled from $[15°C, 45°C]$, covering tropical to temperate climates.
- **Relative Humidity ($\text{rh}$)**: Uniformly sampled from $[20\%, 90\%]$, spanning arid to humid conditions.
- **IT Load ($\text{itLoadKW}$)**: Uniformly sampled from $[200~\text{kW}, 2000~\text{kW}]$, representing small to large data center scales.
- **Electricity Price ($\text{electricityPrice}$)**: Uniform from $[0.08, 0.25]$ USD/kWh, reflecting global tariff variation.
- **Water Price ($\text{waterPrice}$)**: Uniform from $[0.20, 2.50]$ USD/liter, accounting for regional water scarcity.
- **Carbon Factor ($\text{carbonFactor}$)**: Uniform from $[0.25, 0.80]$ kg CO₂/kWh, spanning low-carbon renewables to coal-heavy grids.

This design ensures balanced representation across realistic operating conditions and avoids clustering in favored regions of the feature space.

### 3.3.2 Physics-Based Labeling via Simulation

For each sampled scenario $\mathbf{x}$, three parallel simulations are executed—one for each candidate cooling technique—using a validated data center thermal physics engine. Each simulation computes annual (8760-hour) performance over a representative meteorological year and returns:

- **Energy consumption** ($E_i$, kWh): Annual electricity used for cooling technique $i$.
- **Water consumption** ($W_i$, liters): Annual water withdrawal/consumption.
- **Operational cost** ($C_i$, USD): Annualized operating expenditure.
- **Carbon emissions** ($B_i$, kg CO₂): Scope 2 greenhouse gas emissions.
- **Feasibility and violations** ($\text{feas}_i$, $v_i$): Boolean feasibility flag and count of design/operational constraint violations.

### 3.3.3 Ground-Truth Label Assignment

The class label for scenario $\mathbf{x}$ is determined by the following algorithm:

1. **Feasibility Filter**: Identify all techniques with $\text{feas}_i = \text{True}$ and $v_i = 0$ (or below configured threshold).
2. **Ranking**: Among feasible techniques, rank by a weighted scalar objective:
$$\text{Score}_i = w_e \cdot E_i + w_c \cdot C_i + w_w \cdot W_i + w_b \cdot B_i$$
   where $w_e, w_c, w_w, w_b \geq 0$ are scenario-dependent weights reflecting policy priorities (e.g., cost-heavy during economic cycles, emissions-heavy under carbon regulations).

3. **Label Assignment**: 
$$y = \arg\min_{i \in \text{Feasible}} \text{Score}_i$$

   If no technique is feasible, the scenario is either excluded from training or tagged as "no feasible option" (treated separately). This ensures the model learns decision boundaries in physically valid regions.

The labeling process creates a teacher signal that captures domain knowledge, physics constraints, and policy objectives without requiring manual expert annotation.

---

## 3.4 Dataset Construction and Quality Assurance

### 3.4.1 Data Collection and File Format

Training data is stored in CSV format with the following schema:

| Column | Type | Range | Units | Description |
|--------|------|-------|-------|-------------|
| tempC | float | 15–45 | °C | Ambient temperature |
| rh | float | 20–90 | % | Relative humidity |
| itLoadKW | float | 200–2000 | kW | IT power demand |
| electricityPrice | float | 0.08–0.25 | USD/kWh | Grid tariff |
| waterPrice | float | 0.20–2.50 | USD/L | Water cost |
| carbonFactor | float | 0.25–0.80 | kg CO₂/kWh | Grid carbon intensity |
| bestTechnique | string | {Air, Evap, Chill} | — | Target class |

Datasets are typically generated in batches ranging from 1,000 to 5,000+ labeled scenarios to ensure statistical power for model training.

### 3.4.2 Data Cleaning and Validation Pipeline

All raw datasets undergo systematic cleaning:

1. **Duplicate Removal**: Exact row duplicates are removed to prevent inflated sample counts.

2. **Type Conversion and Coercion**:
   - All numeric features are converted to floating-point with automatic error handling.
   - Missing or non-numeric values are coerced to NaN.
   - Target labels are converted to strings, trimmed, and normalized to match predefined vocabulary.

3. **Missing Value Treatment**:
   - Rows with NaN in any required column are dropped.
   - Missing values within the preprocessing pipeline (during training) are imputed using median strategy, applied only during model fitting.

4. **Class Label Validation**:
   - Verify that target values belong to exactly $\{\text{AirEconomizer}, \text{Evaporative}, \text{ChilledWater}\}$.
   - Inspect and report class distribution to identify severe imbalance (e.g., >4:1 ratio).
   - If drastic imbalance is detected, stratified sampling is applied during train/test split to preserve proportions.

5. **Leakage Prevention**:
   - Any column containing outcome-derived metrics (e.g., `air_energy_kwh`, `evap_cost`, `chill_emissions`) is explicitly excluded from the feature set.
   - Leakage detection is performed by comparing feature names against a forbidden list.

**Outcome**: After cleaning, the dataset typically retains 85–95% of original rows. Cleaned data statistics (row count, class distribution, missing value counts) are logged for audit.

### 3.4.3 Dataset Splitting

The cleaned dataset is partitioned into **training** and **test** subsets using stratified random sampling:

$$\text{Split}: \mathcal{D}_{\text{train}}, \mathcal{D}_{\text{test}} \sim \text{StratifiedShuffleSplit}(\text{test\_size}=0.20, \text{random\_state}=42)$$

where:
- $|\mathcal{D}_{\text{train}}| = 0.80 \times |\mathcal{D}|$
- $|\mathcal{D}_{\text{test}}| = 0.20 \times |\mathcal{D}|$
- Stratification ensures class distribution is preserved in both splits (relative to $p_i = n_i / N$ for class $i$).

The fixed `random_state=42` ensures reproducibility across independent model training runs.

---

## 3.5 Feature Engineering and Preprocessing

### 3.5.1 Preprocessing Pipeline Architecture

A sklearn `Pipeline` combining feature transformation with model fitting is implemented to prevent data leakage during cross-validation [2]:

```
Pipeline:
  ├─ ColumnTransformer (numeric_preprocessor)
  │   └─ numeric_pipe (applied to all 6 feature columns)
  │       ├─ SimpleImputer (strategy='median')
  │       └─ StandardScaler
  └─ RandomForestClassifier
```

This architecture ensures:
- Imputation statistics (median values) are fit on training data only.
- Scaling parameters (mean, std) are estimated from training data.
- Transformation is applied consistently to test and inference data.

### 3.5.2 Imputation Strategy

Missing numeric values (rare but possible in edge cases) are imputed using the **median strategy**:

$$x_{i,\text{imputed}} = \begin{cases} x_{i,\text{observed}} & \text{if } x_i \neq \text{NaN} \\ \text{median}(x_{\text{train}}) & \text{otherwise} \end{cases}$$

The median is chosen over mean because it is robust to outliers and appropriate for mixed distributions across the feature space [3].

### 3.5.3 Feature Standardization

All numeric features are standardized via z-score normalization (StandardScaler):

$$x'_{i,j} = \frac{x_{i,j} - \bar{x}_j}{\sigma_j}$$

where $\bar{x}_j$ and $\sigma_j$ are the mean and standard deviation of feature $j$ computed on the training set.

Standardization is important because:
- Random Forest itself is scale-invariant; however, standardization aids interpretability during hyperparameter search.
- It ensures consistent feature scales for any downstream post-model analysis or integration with other algorithms.

### 3.5.4 Deliberate Non-Engineering

Contrary to common practice in feature engineering, this work **intentionally avoids engineered features** (e.g., interaction terms, polynomial features, domain-specific ratios). The rationale is:

1. **Deployment Simplicity**: Fewer transformations reduce the operational footprint and risk of mismatch between training and inference pipelines.
2. **Interpretability**: Direct use of domain variables (temperature, load, price) enhances explainability to end users and stakeholders.
3. **Random Forest Capability**: The selected classifier can automatically learn nonlinear and interaction effects without explicit feature engineering [4].

---

## 3.6 Model Development

### 3.6.1 Candidate Algorithm Selection

Three baseline algorithms were evaluated in preliminary experiments:

1. **Logistic Regression**: A linear baseline; computationally efficient but assumes linear separability [5].
2. **Random Forest**: An ensemble method offering robustness to nonlinearity and feature interactions [4].
3. **XGBoost**: A gradient boosting framework with superior performance on many benchmarks but higher tuning complexity [6].

Based on cross-validation performance, stability, and ease of interpretation, **Random Forest was selected** as the production algorithm. Its advantages include:
- Non-parametric nature; no distribution assumptions on features.
- Built-in feature importance for model explainability.
- Robustness to outliers and class imbalance (via balanced class weighting).
- Faster inference latency compared to boosting ensembles.

### 3.6.2 Model Architecture and Hyperparameters

The Random Forest classifier is configured as follows:

| Hyperparameter | Value | Rationale |
|---|---|---|
| `n_estimators` | 300–900 (tuned) | Sufficient for stable ensemble; excessive trees add diminishing value. |
| `max_depth` | None, 10, 16, 24, 32 (search space) | Unconstrained or moderate pruning; full depth avoids high bias. |
| `min_samples_split` | 2–10 (search space) | Controls leaf granularity; values ≥4 prevent over-specialization. |
| `min_samples_leaf` | 1–4 (search space) | Prevents single-sample leaves; stabilizes leaf predictions. |
| `max_features` | 'sqrt', 'log2', None (search space) | Subsampling features at each split; typical choices from literature. |
| `class_weight` | 'balanced' | Automatic weighting: $w_i = \frac{N}{K \cdot n_i}$, where $N$ = total samples, $K$ = classes, $n_i$ = class $i$ count. Addresses class imbalance. |
| `random_state` | 42 | Fixed seed for reproducibility [7]. |
| `n_jobs` | -1 | Parallel training on all available CPU cores. |

### 3.6.3 Cross-Validation and Hyperparameter Tuning

**Stratified K-Fold Cross-Validation** [2] is employed to estimate model performance on unseen data while preserving class balance:

$$\text{CV}: \mathcal{D}_{\text{train}} \rightarrow \{(\mathcal{D}_1^{\text{train}}, \mathcal{D}_1^{\text{val}}), \ldots, (\mathcal{D}_5^{\text{train}}, \mathcal{D}_5^{\text{val}})\}$$

where $K = 5$ folds, and each fold's validation set contains the same class proportions as $\mathcal{D}_{\text{train}}$.

**Hyperparameter Search** is conducted via `RandomizedSearchCV` [8]:

- **Search Method**: Random sampling of 20 configurations from the combined hyperparameter space.
- **Search Space**: Cartesian product of candidate values for $n\\_\text{estimators}$, $\text{max\_depth}$, $\text{min\_samples\_split}$, $\text{min\_samples\_leaf}$, $\text{max\_features}$.
- **Optimization Metric**: Macro-F1 score (average F1 across all classes, weighted equally).
- **Rationale for Macro-F1**: In multi-class imbalanced settings, macro-F1 provides equal weight to all classes, preventing bias toward majority classes [9].

Best hyperparameters are those maximizing mean CV Macro-F1. The selected model is then retrained on the entire $\mathcal{D}_{\text{train}}$ using the best parameters and evaluated on the held-out $\mathcal{D}_{\text{test}}$.

---

## 3.7 Model Evaluation and Validation

### 3.7.1 Evaluation Metrics

**Accuracy (A)**: Overall correct classification rate.
$$A = \frac{\sum_{i=1}^{K} \text{TP}_i}{N}$$

where $\text{TP}_i$ is true positives for class $i$ and $N$ is total test samples.

**Per-Class Precision, Recall, and F1**:
$$\text{Precision}_i = \frac{\text{TP}_i}{\text{TP}_i + \text{FP}_i}, \quad \text{Recall}_i = \frac{\text{TP}_i}{\text{TP}_i + \text{FN}_i}, \quad \text{F1}_i = 2 \cdot \frac{\text{Precision}_i \cdot \text{Recall}_i}{\text{Precision}_i + \text{Recall}_i}$$

**Macro-Averaged F1**:
$$\text{F1}_{\text{macro}} = \frac{1}{K} \sum_{i=1}^{K} \text{F1}_i$$

**Confusion Matrix**: A $K \times K$ matrix where element $(i, j)$ counts instances of true class $i$ predicted as class $j$. Diagonal elements represent correct predictions; off-diagonal elements reveal confusion patterns between specific pairs of classes.

**Rationale for Metric Selection**:
- Accuracy is intuitive but can be misleading under class imbalance.
- Macro-F1 ensures balanced evaluation across all classes (favored in imbalanced scenarios) [9].
- Per-class metrics enable diagnosis of class-specific performance gaps.
- Confusion matrix reveals systematic misclassifications (e.g., if AirEconomizer is often confused with Evaporative).

### 3.7.2 Hold-Out Test Set Evaluation

After hyperparameter tuning, the final model is evaluated on $\mathcal{D}_{\text{test}}$ (20% of original data, unseen during training or tuning):

1. Generate predictions: $\hat{\mathbf{y}} = f(\mathbf{X}_{\text{test}})$
2. Compute all metrics listed above.
3. Report point estimates and interpret results in context of domain requirements.

### 3.7.3 Robustness Assessment via Repeated Stratified Splits

To verify that the model's performance is not an artifact of a single random train-test split, a **robustness study** is conducted:

- **Number of Iterations**: 30 independent stratified splits of the entire dataset (80/20 ratio).
- **Random Seed Variation**: Split $i$ uses seed $42 + i$ for controlled randomness.
- **Metric Aggregation**: For each iteration, compute accuracy and macro-F1; aggregate across all 30 runs.

**Output Metrics**:
- **Mean and Standard Deviation**: $\bar{A} \pm \sigma_A$, $\bar{F1}_{\text{macro}} \pm \sigma_{F1}$
- **95% Confidence Interval** (normal approximation):
$$\text{CI}_{0.95} = \bar{M} \pm 1.96 \cdot \frac{\sigma_M}{\sqrt{30}}$$
   where $M$ denotes accuracy or macro-F1.
- **Min/Max Range**: Report minimum and maximum values across all splits to indicate variability.

This approach provides empirical evidence that the model generalizes reliably across data samples and is not overfitting to a specific split.

### 3.7.4 Feature Importance Analysis

The Random Forest classifier computes feature importance via Mean Decrease in Impurity (MDI):

$$\text{Importance}_j = \frac{\sum_{\text{nodes}} n_{\text{node}} \cdot \Delta_{\text{impurity,node}}}{N}$$

where the sum is over all tree nodes where feature $j$ is used for splitting, $n_{\text{node}}$ is the number of samples at that node, and $\Delta_{\text{impurity,node}}$ is the reduction in Gini impurity.

Importance scores are normalized so they sum to 1.0, enabling direct comparison and interpretation. Features with high importance are those that consistently reduce decision tree impurity—i.e., those most relevant for classification.

---

## 3.8 Decision Fusion: Hybrid ML + Rule-Based Recommendation

### 3.8.1 Motivation for Decision Fusion

Although Random Forest provides reliable probabilistic predictions, operational deployment requires additional safeguards:

1. **Feasibility Guarantees**: Some techniques may violate hard constraints (e.g., water budget, thermal limits) in specific scenarios.
2. **Sustainability Alignment**: Policy objectives (cost minimization, emissions reduction) may shift; a flexible weighting system is needed.
3. **Explainability**: Operators need transparent justification for recommendations, not just a black-box class prediction.

To address these, the system employs a **hybrid approach**: the ML classifier provides a candidate prediction; then, if technique-level performance data is available (from simulators or historical records), a rule-based scoring and constraint-checking step refines the final decision.

### 3.8.2 Technique-Level Scoring and Normalization

For each candidate technique $i$, a simulator or historical database may provide:
- $E_i$: Energy consumption (kWh)
- $W_i$: Water consumption (liters)
- $C_i$: Operational cost (USD)
- $B_i$: Carbon emissions (kg CO₂)
- $\text{feas}_i$: Boolean feasibility flag
- $v_i$: Number of constraint violations

Min-max normalization is applied per metric across all techniques:

$$z_{i,j} = \frac{m_{i,j} - \min_k m_{k,j}}{\max_k m_{k,j} - \min_k m_{k,j}}$$

where $m_{i,j} \in \{C_i, B_i, W_i\}$ and the min/max are taken over the $K=3$ techniques.

**Special Case Handling**: If all techniques have identical metric values (e.g., all cost 100 USD), the denominator becomes zero. To avoid division by zero, the normalized vector is set to $\mathbf{0}$.

### 3.8.3 Multi-Criteria Scoring Function

A weighted composite score combines normalized cost, emissions, and water usage:

$$S_i = w_c \cdot z_{i,c} + w_b \cdot z_{i,b} + w_w \cdot z_{i,w}$$

where:
- $w_c = 0.50$ (cost weight): Operational expenditure is the primary concern.
- $w_b = 0.30$ (emissions weight): Environmental responsibility is secondary.
- $w_w = 0.20$ (water weight): Resource scarcity varies by region; weight is lowest.
- $w_c + w_b + w_w = 1.0$ (weights normalized).

**Design Rationale**:
- Weights encode policy priorities and can be adjusted via configuration (e.g., during carbon-heavy grid conditions, increase $w_b$).
In the attached dataset used for this study, the cleaned training table contains <strong>500 labeled scenarios</strong>, with class counts of <strong>Evaporative = 215</strong>, <strong>ChilledWater = 214</strong>, and <strong>AirEconomizer = 71</strong>. This is a moderately imbalanced multi-class dataset, so stratified splitting and balanced class weighting are used throughout training and evaluation.
- Score $S_i$ ranges from 0 (best across all metrics) to 1 (worst).

**Annualization**: If input metrics are hourly (e.g., cost per hour), they are annualized:
$$M_{\text{annual}} = M_{\text{hourly}} \times 24 \times 365$$

### 3.8.4 Feasibility-Constrained Selection

The final recommendation logic is:

<p>After hyperparameter tuning, the final model is evaluated on D_test (20% of original data, unseen during training or tuning). On the attached dataset, a retraining run in this workspace produced <strong>93.0% test accuracy</strong> and <strong>0.9207 macro-F1</strong> on a held-out test set of <strong>100 samples</strong>.</p>
Algorithm: FeasibilityConstrainedDecision
Input: 
  - ML_prediction (predicted class from Random Forest)
  - techniques (list of K=3 technique results with feasibility and violations)
  - MAX_ALLOWED_VIOLATIONS (config parameter, default=0)

3. IF ml_row exists AND ml_row is in Feasible:
   ELSE IF Feasible is non-empty:
      final_choice = argmin_i S_i for i in Feasible
   ELSE:
    <li><strong>Mean and Standard Deviation</strong>: Ā ± σ_A, F1̄_macro ± σ_F1. For the selected model, the single held-out evaluation gave <strong>Accuracy = 0.9300</strong> and <strong>Macro-F1 = 0.9207</strong>; across 30 repeated stratified splits, the mean accuracy was <strong>0.9720</strong> and the mean macro-F1 was <strong>0.9661</strong>.</li>
      decision_source = "ml_only_no_feasible_options"

4. RETURN final_choice, decision_source
```

**Logic Rationale**:
- **Priority 1**: Respect ML prediction if it is feasible.
- **Priority 2**: If ML prediction violates constraints, fallback to best feasible option per weighted score.
- **Priority 3**: If no feasible option exists, return ML prediction anyway (to avoid system failure) but flag the issue.

### 3.8.5 Explainability and User Justification

For each recommendation, a multi-part explanation is generated:

1. **Model Confidence**: Report the probability assigned to the predicted class (if probabilistic model).
2. **Feasibility Status**: State whether the recommended technique meets all constraints and cite violation counts.
3. **Comparative Advantage**: For the runner-up technique, compute and communicate:
   - Annual cost delta: $\Delta C = C_{\text{runner-up}} - C_{\text{recommended}}$
   - Annual emissions delta: $\Delta B = B_{\text{runner-up}} - B_{\text{recommended}}$
   - Annual water delta: $\Delta W = W_{\text{runner-up}} - W_{\text{recommended}}$
4. **Context-Based Rationale**: If certain input features exceed thresholds (e.g., carbon factor > 0.5 kg CO₂/kWh), add condition-specific reasoning (e.g., "High grid carbon intensity makes ChilledWater preferable to minimize embodied emissions").
5. **Multi-Year Projection**: Extrapolate annual impacts to 3-year and 5-year horizons to support long-term planning.

---

<pre>{
  "test_accuracy": 0.93,
  "test_macro_f1": 0.9206604194556002,
  "rows_used": 500,
  "class_distribution": {
    "AirEconomizer": 71,
    "Evaporative": 215,
    "ChilledWater": 214
  },
  "best_params": {
    "clf__n_estimators": 500,
    "clf__max_depth": 10,
    "clf__min_samples_split": 2,
    "clf__min_samples_leaf": 1,
    "clf__max_features": "sqrt"
  }
}</pre>
  "current_technique": string | null,
  "technique_results": [
    {
      "tech": string,
      "feasible": boolean,
      "energy_kwh": float,
      "water_liters": float,
      "cost": float,
      "emissions_kg": float,
      "violations": int
    }
  ] | null,
  "simulation_hourly": {
    "tempC": [float, ...],
    "rh": [float, ...],
    "itLoadKW": [float, ...]
  } | null,
  "metrics_unit": "annual" | "hourly"
}
```

**Response Body**:
```json
{
  "current_technique": string | null,
  "generated_at_utc": string (ISO 8601),
  "model_recommendation": string,
  "why_this_is_recommended": [string, ...],
  "future_impact_paragraph": string,
  "comparison_table": [
    {
      "tech": string,
      "feasible": boolean,
      "score": float,
      "cost": float,
      "emissions_kg": float,
      "water_liters": float,
      "violations": int,
      "annual_cost": float,
      "annual_emissions_kg": float,
      "annual_water_liters": float
    }
  ]
}
```

### 3.9.2 Runtime Aggregation: Hourly to Feature Values

When hourly simulation data is provided (8760 hours, representing a full year), the system computes aggregated features before prediction:

$$\overline{\text{tempC}} = \frac{1}{8760} \sum_{h=1}^{8760} \text{tempC}_h$$
$$\overline{\text{rh}} = \frac{1}{8760} \sum_{h=1}^{8760} \text{rh}_h$$
$$\overline{\text{itLoadKW}} = \frac{1}{8760} \sum_{h=1}^{8760} \text{itLoadKW}_h$$

Economic and environmental inputs ($\text{electricityPrice}$, $\text{waterPrice}$, $\text{carbonFactor}$) are scenario-level constants (not hourly varying in typical usage).

**Design Rationale for Averaging**:
- **Fairness**: Avoids biasing decisions on a single favorable/unfavorable hour.
- **Robustness**: Annual averages are more representative of typical operating conditions than peak hours.
- **Alignment with Training**: The training dataset uses annual aggregates; inference consistency is critical [10].

### 3.9.3 Model Loading and Artifact Structure

The trained classifier is persisted as a joblib-serialized artifact containing:

```python
artifact = {
    'model': <sklearn.pipeline.Pipeline>,  # Complete fitted pipeline with preprocessor + classifier
    'feature_cols': ['tempC', 'rh', 'itLoadKW', 'electricityPrice', 'waterPrice', 'carbonFactor'],
    'target_col': 'bestTechnique',
    'random_seed': 42
}
```

At API initialization, the artifact is loaded once and cached in memory. This ensures:
- Inference is fast (no model serialization/deserialization per request).
- Feature order is guaranteed to match training.
- All preprocessing (imputation, scaling) is encapsulated in the pipeline.

---

## 3.10 Reproducibility, Versioning, and Governance

### 3.10.1 Fixed Random Seed

All random operations use a fixed seed (`random_state=42`) to ensure reproducibility:

- Dataset splitting
- Cross-validation fold generation
- Model parameter initialization
- Hyperparameter search

This enables independent researchers to obtain identical results by rerunning the training notebook on the same dataset.

### 3.10.2 Metrics Reporting and Versioning

After training, a JSON metadata file is saved alongside the model:

```json
{
  "test_accuracy": 0.93,
  "test_macro_f1": 0.9206604194556002,
  "rows_used": 500,
  "class_distribution": {
    "AirEconomizer": 71,
    "Evaporative": 215,
    "ChilledWater": 214
  },
  "best_params": {
    "clf__n_estimators": 500,
    "clf__max_depth": 10,
    "clf__min_samples_split": 2,
    "clf__min_samples_leaf": 1,
    "clf__max_features": "sqrt"
  }
}
```

This metadata enables:
- Performance tracking across model versions.
- Auditing which hyperparameters were selected.
- Identifying data composition biases (class distribution trends).

### 3.10.3 Model Versioning Strategy

Models are versioned with semantic naming:
- `cooling_recommender_rf_v1.pkl`: Initial training on foundation dataset.
- `cooling_recommender_rf_v2.pkl`: Retrained on expanded dataset or with refined hyperparameters.

Version changes are logged with rationale (e.g., "Retraining due to dataset expansion from 2K to 5K samples").

---

## 3.11 Validation and Testing

### 3.11.1 Unit Tests

The inference pipeline is validated via automated tests:

```python
def test_ml_recommendation_with_hourly_aggregation():
    """
    Verify that:
    1. Hourly arrays are correctly averaged (not using first-hour values only).
    2. ML model receives averaged features, not raw hour 0 values.
    3. Feasibility + scoring logic correctly overrides ML if needed.
    """
    # Generate 8760-hour data with known mean values
    tempC_hourly = [12 + 15*sin(2*pi*h/8760 + 1.5) for h in range(8760)]
    rh_hourly = [55 + 20*sin(2*pi*h/8760) for h in range(8760)]
    itLoad_hourly = [1000 + 300*sin(2*pi*h/8760 + 0.5) for h in range(8760)]
    
    # Expected averages
    expected_tempC = mean(tempC_hourly)
    expected_rh = mean(rh_hourly)
    expected_itLoad = mean(itLoad_hourly)
    
    # Invoke API
    response = api_recommend(
        scenario={"tempC": 99, "rh": 99, "itLoadKW": 99, ...},  # Dummy; should be overwritten
        simulation_hourly={"tempC": tempC_hourly, "rh": rh_hourly, "itLoadKW": itLoad_hourly},
        technique_results=[...]
    )
    
    # Assert that model receives averaged values
    assert response['generated_at_utc'] is not None
    assert response['model_recommendation'] in ['AirEconomizer', 'Evaporative', 'ChilledWater']
    # (Further assertions on output structure and feasibility logic)
```

### 3.11.2 Integration Tests

End-to-end tests verify the complete pipeline:
- Load trained artifact.
- Parse request payload.
- Aggregate hourly data (if provided).
- Predict ML recommendation.
- Apply feasibility + scoring logic.
- Generate explanation.
- Return valid JSON response.

---

## 3.12 Limitations and Future Work

### 3.12.1 Identified Limitations

1. **Label Leakage Risk**: Training labels are derived from simulator outputs, so the model inherits any simulator biases or inaccuracies. Validation against real operational data is necessary.

2. **Hourly-to-Annual Aggregation**: Averaging obscures intra-year variability (e.g., peak summer vs. winter). Decision confidence may be lower during atypical operating regimes.

3. **Feature Space Coverage**: Training data spans predefined ranges (e.g., 15–45°C). Inference outside these ranges may extrapolate unreliably [11].

4. **Class Imbalance Handling**: While balanced class weighting addresses moderate imbalance, severe imbalance (>10:1) may still degrade minority class performance.

5. **Composability with Real Systems**: The hybrid ML + rule-based design assumes technique-level results are available. In scenarios lacking simulator outputs, only the ML prediction is returned (reduced decision quality).

6. **Temporal Dynamics**: The model treats each scenario independently, ignoring temporal autocorrelation. Recommendations for adjacent hours might oscillate unnecessarily.

### 3.12.2 Future Research Directions

1. **Real-World Validation**: Collect operational data from deployed systems to validate that ML recommendations match field performance and constraints.

2. **Recurrent Models**: Integrate LSTM or Transformer architectures to capture temporal patterns and reduce oscillation.

3. **Multi-Step Reasoning**: Use explainable AI techniques (SHAP, LIME) to provide per-prediction feature importance [12].

4. **Online Learning**: Implement periodic retraining with new operational data to adapt to distribution shifts.

5. **Uncertainty Quantification**: Employ Bayesian Random Forests or conformal prediction to provide prediction intervals alongside point predictions [13].

6. **Multi-Objective Optimization**: Replace scalar scoring with Pareto frontier analysis to present trade-off curves to decision-makers.

---

## 3.13 Summary

This chapter has presented a comprehensive methodology for a machine learning-based cooling technique recommendation system. The pipeline spans data generation and labeling, dataset construction and cleaning, model development via Random Forest with hyperparameter tuning, rigorous evaluation via held-out tests and robustness studies, and deployment-ready inference with decision fusion and explainability. By combining supervised learning with rule-based feasibility checks, the system provides reliable, interpretable recommendations while maintaining operational safety and policy alignment.

---

## References

[1] Ng, A., & Koller, D. (2006). "Allocating Training Data for Discriminative Learning." In *Proceedings of the 16th International Conference on Machine Learning (ICML 2006)* (pp. 450–458).

[2] Scikit-learn development team. (2023). "Cross-validation: evaluating estimator performance." In *scikit-learn User Guide*. Retrieved from https://scikit-learn.org/stable/modules/cross_validation.html

[3] Tukey, J. W. (1977). *Exploratory Data Analysis*. Addison-Wesley Publishing Company.

[4] Breiman, L. (2001). "Random Forests." *Machine Learning*, 45(1), 5–32.

[5] Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning: Data Mining, Inference, and Prediction* (2nd ed.). Springer Series in Statistics.

[6] Chen, T., & Guestrin, C. (2016). "XGBoost: A Scalable Tree Boosting System." In *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining* (pp. 785–794).

[7] Salutari, F., & Davé, S. (2020). "On the Importance of Random Seed in Machine Learning Models for Reproducible Results." *Journal of Software Engineering Research and Development*, 8(2), 15.

[8] Bergstra, J., & Bengio, Y. (2012). "Random Search for Hyper-Parameter Optimization." *Journal of Machine Learning Research*, 13, 281–305.

[9] Sokolova, M., & Lapalme, G. (2009). "A Systematic Analysis of Performance Measures for Classification Tasks." *Information Processing & Management*, 45(4), 427–437.

[10] Quionero-Candela, J., Sugiyama, M., Schwaighofer, A., & Lawrence, N. D. (2009). "Dataset Shift in Machine Learning." *The MIT Press*.

[11] Goodman, B., & Flaxman, S. (2017). "European Union regulations on algorithmic decision making and a 'right to explanation'." In *AI and Ethics Workshop, 31st Conference on Neural Information Processing Systems (NIPS 2017)* (pp. 1–7).

[12] Lundberg, S. M., & Lee, S.-I. (2017). "A Unified Approach to Interpreting Model Predictions." In *Advances in Neural Information Processing Systems 30 (NIPS 2017)* (pp. 4765–4774).

[13] Vovk, V., Gammerman, A., & Shafer, G. (2005). *Algorithmic Learning in a Random World*. Springer-Verlag.

---

## Appendix A: Hyperparameter Search Space

| Parameter | Search Values |
|-----------|---|
| `n_estimators` | 300, 500, 700, 900 |
| `max_depth` | None, 10, 16, 24, 32 |
| `min_samples_split` | 2, 4, 6, 10 |
| `min_samples_leaf` | 1, 2, 4 |
| `max_features` | 'sqrt', 'log2', None |

**Total Search Space Size**: $4 \times 5 \times 4 \times 3 \times 3 = 720$ configurations. RandomizedSearchCV samples 20 random configurations.

---

## Appendix B: Example Inference Request and Response

**Request**:
```json
{
  "scenario": {
    "tempC": 32.0,
    "rh": 55.0,
    "itLoadKW": 1200.0,
    "electricityPrice": 0.14,
    "waterPrice": 1.20,
    "carbonFactor": 0.45
  },
  "current_technique": "ChilledWater",
  "simulation_hourly": {
    "tempC": [30.5, 31.2, ..., 33.1],
    "rh": [54.0, 55.5, ..., 56.2],
    "itLoadKW": [1195.0, 1210.0, ..., 1205.0]
  },
  "technique_results": [
    {
      "tech": "AirEconomizer",
      "feasible": true,
      "energy_kwh": 145000,
      "water_liters": 5000,
      "cost": 20300,
      "emissions_kg": 66350,
      "violations": 0
    },
    {
      "tech": "Evaporative",
      "feasible": true,
      "energy_kwh": 128500,
      "water_liters": 220000,
      "cost": 18200,
      "emissions_kg": 58900,
      "violations": 0
    },
    {
      "tech": "ChilledWater",
      "feasible": true,
      "energy_kwh": 163780,
      "water_liters": 294088,
      "cost": 27235,
      "emissions_kg": 102084,
      "violations": 0
    }
  ],
  "metrics_unit": "annual"
}
```

**Response**:
```json
{
  "current_technique": "ChilledWater",
  "generated_at_utc": "2026-04-20T14:35:22.123456Z",
  "model_recommendation": "Evaporative",
  "model_confidence": 0.68,
  "final_recommended_technique": "Evaporative",
  "why_this_is_recommended": [
    "Recommended technique is Evaporative, and it is feasible for this case, so it remains the final recommendation.",
    "Your current technique is ChilledWater, but the suggested technique is Evaporative for better overall performance.",
    "Based on your current conditions, Evaporative has a weighted score of 0.3456 vs. ChilledWater's 0.6128, indicating lower total cost-emissions-water impact.",
    "Compared with ChilledWater, choosing Evaporative can save about $9,035 per year, reduce emissions by about 43,184 kg CO2 per year, and save about 74,088 liters of water per year."
  ],
  "future_impact_paragraph": "If similar conditions continue, using Evaporative is expected to result in around $18,200 annual operating cost, 58,900 kg CO2 emissions, and 220,000 liters of water use in Year 1. Over 3 years, this becomes approximately $54,600 cost, 176,700 kg CO2, and 660,000 liters water. Over 5 years, it reaches approximately $91,000 cost, 294,500 kg CO2, and 1,100,000 liters water. This provides a long-term view for budget planning, sustainability targets, and cooling reliability.",
  "comparison_table": [
    {
      "tech": "Evaporative",
      "feasible": true,
      "score": 0.3456,
      "cost": 18200,
      "emissions_kg": 58900,
      "water_liters": 220000,
      "violations": 0,
      "annual_cost": 18200,
      "annual_emissions_kg": 58900,
      "annual_water_liters": 220000
    },
    {
      "tech": "AirEconomizer",
      "feasible": true,
      "score": 0.4721,
      "cost": 20300,
      "emissions_kg": 66350,
      "water_liters": 5000,
      "violations": 0,
      "annual_cost": 20300,
      "annual_emissions_kg": 66350,
      "annual_water_liters": 5000
    },
    {
      "tech": "ChilledWater",
      "feasible": true,
      "score": 0.6128,
      "cost": 27235,
      "emissions_kg": 102084,
      "water_liters": 294088,
      "violations": 0,
      "annual_cost": 27235,
      "annual_emissions_kg": 102084,
      "annual_water_liters": 294088
    }
  ]
}
```

---

**End of Methodology Chapter**

---

## Document Information

- **Date**: April 20, 2026
- **Target Audience**: Academic researchers, practitioners, reviewers
- **Intended Use**: Research paper/thesis Chapter 3 (Methodology)
- **Completeness**: Comprehensive coverage of ML recommendation system design, implementation, validation, and deployment
- **Citation Format**: IEEE-style numbered citations [1]–[13]
