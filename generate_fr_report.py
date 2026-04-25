"""
Functional Requirements PDF — ML Cooling Recommendation System
Scope: Dataset Generation · Data Quality · Model Training · Recommendation API
       Multi-Criteria Scoring · Justification · Future Impact Projection
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import datetime

# ── Palette ──────────────────────────────────────────────────────────────────
DARK_BLUE    = colors.HexColor("#0D2B55")
MID_BLUE     = colors.HexColor("#1A5276")
ACCENT_BLUE  = colors.HexColor("#2E86C1")
LIGHT_BLUE   = colors.HexColor("#D6EAF8")
ACCENT_GREEN = colors.HexColor("#1E8449")
LIGHT_GREEN  = colors.HexColor("#D5F5E3")
ACCENT_RED   = colors.HexColor("#C0392B")
ACCENT_ORANGE= colors.HexColor("#D35400")
GREY_BG      = colors.HexColor("#F2F3F4")
DARK_GREY    = colors.HexColor("#2C3E50")
MID_GREY     = colors.HexColor("#7F8C8D")
WHITE        = colors.white

# ── Styles ────────────────────────────────────────────────────────────────────
def S(name, **kw): return ParagraphStyle(name, **kw)

COVER_TITLE = S("CT", fontSize=26, textColor=WHITE, fontName="Helvetica-Bold",
                alignment=TA_CENTER, leading=32)
COVER_SUB   = S("CS", fontSize=13, textColor=colors.HexColor("#AED6F1"),
                fontName="Helvetica", alignment=TA_CENTER, leading=18)
COVER_META  = S("CM", fontSize=10, textColor=colors.HexColor("#D6EAF8"),
                fontName="Helvetica", alignment=TA_CENTER, leading=14)
H1   = S("H1",  fontSize=17, textColor=WHITE,     fontName="Helvetica-Bold",
         alignment=TA_LEFT, leading=21, spaceBefore=4, spaceAfter=4)
H2   = S("H2",  fontSize=12, textColor=DARK_BLUE, fontName="Helvetica-Bold",
         alignment=TA_LEFT, leading=16, spaceBefore=10, spaceAfter=4)
H3   = S("H3",  fontSize=10.5, textColor=MID_BLUE, fontName="Helvetica-Bold",
         alignment=TA_LEFT, leading=14, spaceBefore=7, spaceAfter=3)
BODY = S("BD",  fontSize=9.5, textColor=DARK_GREY, fontName="Helvetica",
         alignment=TA_JUSTIFY, leading=14, spaceBefore=3, spaceAfter=3)
BODY_SM = S("BS", fontSize=8.5, textColor=DARK_GREY, fontName="Helvetica",
            alignment=TA_JUSTIFY, leading=12, spaceBefore=2, spaceAfter=2)
CAPTION = S("CAP", fontSize=8, textColor=MID_GREY, fontName="Helvetica-Oblique",
            alignment=TA_CENTER, leading=11, spaceBefore=2, spaceAfter=6)
CODE    = S("CODE", fontSize=8, textColor=DARK_GREY, fontName="Courier",
            alignment=TA_LEFT, leading=11, spaceBefore=2, spaceAfter=2,
            backColor=GREY_BG, leftIndent=10, rightIndent=10)
BULLET  = S("BUL", fontSize=9.5, textColor=DARK_GREY, fontName="Helvetica",
            alignment=TA_LEFT, leading=14, leftIndent=14, spaceBefore=2, spaceAfter=2)
TH  = S("TH",  fontSize=8.5, textColor=WHITE,     fontName="Helvetica-Bold",
        alignment=TA_CENTER, leading=12)
TD  = S("TD",  fontSize=8.5, textColor=DARK_GREY, fontName="Helvetica",
        alignment=TA_LEFT,   leading=12)
TDC = S("TDC", fontSize=8.5, textColor=DARK_GREY, fontName="Helvetica",
        alignment=TA_CENTER, leading=12)
FR_ID_ST = S("FRID", fontSize=9, textColor=WHITE, fontName="Helvetica-Bold",
             alignment=TA_CENTER, leading=13)

# ── Helpers ───────────────────────────────────────────────────────────────────
def sp(h=6):  return Spacer(1, h)
def hr_line(): return HRFlowable(width="100%", thickness=0.5,
                                  color=colors.HexColor("#BDC3C7"),
                                  spaceAfter=4, spaceBefore=4)

def sec_hdr(title, color=DARK_BLUE):
    t = Table([[Paragraph(title, H1)]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), color),
        ("TOPPADDING",    (0,0),(-1,-1), 9),
        ("BOTTOMPADDING", (0,0),(-1,-1), 9),
        ("LEFTPADDING",   (0,0),(-1,-1), 14),
        ("RIGHTPADDING",  (0,0),(-1,-1), 14),
    ]))
    return t

def info_box(text, bg=LIGHT_BLUE, border=ACCENT_BLUE):
    t = Table([[Paragraph(text, BODY_SM)]], colWidths=[17*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), bg),
        ("LINEABOVE",     (0,0),(-1,0),  1.5, border),
        ("LINEBELOW",     (0,-1),(-1,-1),1.5, border),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
    ]))
    return t

def mk_table(headers, rows, col_widths=None, hdr_color=DARK_BLUE):
    hrow  = [Paragraph(h, TH) for h in headers]
    brows = [[Paragraph(str(c), TDC if i > 0 else TD)
              for i, c in enumerate(row)] for row in rows]
    data = [hrow] + brows
    if col_widths is None:
        col_widths = [17*cm / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  hdr_color),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, GREY_BG]),
        ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#BDC3C7")),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))
    return t

def fr_card(fr_id, title, desc, inputs, outputs, priority, source):
    """Render one FR as a structured card."""
    p_color = {"HIGH": ACCENT_RED, "MEDIUM": ACCENT_ORANGE,
               "LOW": ACCENT_GREEN}.get(priority.upper(), MID_GREY)

    # Header row: ID badge + title
    id_t = Table([[Paragraph(fr_id, FR_ID_ST)]], colWidths=[2.4*cm])
    id_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), ACCENT_BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
    ]))
    title_t = Table([[Paragraph(f"<b>{title}</b>", H3)]], colWidths=[14.6*cm])
    title_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LIGHT_BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
    ]))
    hdr = Table([[id_t, title_t]], colWidths=[2.4*cm, 14.6*cm])
    hdr.setStyle(TableStyle([
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ]))

    body_data = [
        [Paragraph("<b>Description</b>", BODY_SM), Paragraph(desc,     BODY_SM)],
        [Paragraph("<b>Inputs</b>",      BODY_SM), Paragraph(inputs,   BODY_SM)],
        [Paragraph("<b>Outputs</b>",     BODY_SM), Paragraph(outputs,  BODY_SM)],
        [Paragraph("<b>Priority</b>",    BODY_SM),
         Paragraph(f'<font color="{p_color.hexval()}"><b>{priority}</b></font>', BODY_SM)],
        [Paragraph("<b>Source</b>",      BODY_SM), Paragraph(source,   BODY_SM)],
    ]
    body = Table(body_data, colWidths=[2.8*cm, 14.2*cm])
    body.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(0,-1), GREY_BG),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#BDC3C7")),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))

    card = Table([[hdr], [body]], colWidths=[17*cm])
    card.setStyle(TableStyle([
        ("BOX",           (0,0),(-1,-1), 1, ACCENT_BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ]))
    return card

def blist(items):
    return ListFlowable(
        [ListItem(Paragraph(i, BULLET), leftIndent=10, bulletColor=ACCENT_BLUE)
         for i in items],
        bulletType="bullet", leftIndent=20, bulletFontSize=9
    )

# ── Document setup ────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    "ML_Recommendation_FR.pdf",
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.2*cm, bottomMargin=2.2*cm,
    title="Functional Requirements – ML Cooling Recommendation System",
    author="FYP Project"
)
story = []

# ═══════════════════════════════════════════════════════════════════════════
# COVER
# ═══════════════════════════════════════════════════════════════════════════
cover = Table([[
    Paragraph("FUNCTIONAL REQUIREMENTS SPECIFICATION", COVER_TITLE),
    Paragraph("ML-Driven Cooling Technique Recommendation System", COVER_SUB),
    Spacer(1, 12),
    Paragraph("Data Centre Cooling Optimiser — FYP Project", COVER_SUB),
    Spacer(1, 20),
    Paragraph(
        "Dataset Generation  ·  Data Quality  ·  Model Training  ·  "
        "Recommendation API  ·  Scoring  ·  Justification  ·  Future Impact",
        COVER_META),
    Spacer(1, 14),
    Paragraph(f"Document Date: {datetime.date.today().strftime('%B %d, %Y')}", COVER_META),
    Spacer(1, 6),
    Paragraph("Version 1.0  |  Status: Final", COVER_META),
]], colWidths=[17*cm])
cover.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,-1), DARK_BLUE),
    ("TOPPADDING",    (0,0),(-1,-1), 40),
    ("BOTTOMPADDING", (0,0),(-1,-1), 40),
    ("LEFTPADDING",   (0,0),(-1,-1), 20),
    ("RIGHTPADDING",  (0,0),(-1,-1), 20),
]))
story.append(cover)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1 – INTRODUCTION
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("1. Introduction & Scope"))
story.append(sp(8))
story.append(Paragraph(
    "This document specifies the Functional Requirements (FRs) for the Machine Learning "
    "Recommendation System that recommends the optimal data centre cooling technique — "
    "Air Economizer, Evaporative Cooling, or Chilled Water — for a given operating scenario. "
    "The system uses a supervised Random Forest classifier trained on simulation-generated "
    "labelled data, combined with multi-criteria scoring and natural-language justification "
    "at inference time.", BODY))
story.append(sp(5))
story.append(Paragraph("The scope of this document covers:", BODY))
story.append(blist([
    "Dataset generation pipeline (Monte Carlo sampling + three-simulator evaluation)",
    "Data quality and validation rules applied before training",
    "Model training, evaluation, and serialisation",
    "Recommendation API: ML prediction, feasibility override, and response structure",
    "Multi-criteria composite scoring (cost, emissions, water)",
    "Natural-language justification generation",
    "Multi-year future impact projection",
]))
story.append(sp(5))
story.append(info_box(
    "Out of scope: LLM advisory engine, what-if analysis API, NSGA-II optimiser, "
    "Bayesian calibrator, Model Predictive Control, and climate risk assessor. "
    "Those components are documented separately."
))
story.append(sp(6))

story.append(Paragraph("1.1  Requirement ID Convention", H2))
story.append(Paragraph(
    "Each requirement uses the format FR-XX-NN where XX is the area code and NN is a "
    "two-digit sequence number.", BODY))
story.append(sp(4))
story.append(mk_table(
    ["Prefix", "Functional Area", "Count"],
    [
        ["FR-DG", "Dataset Generation",          "7"],
        ["FR-DQ", "Data Quality & Validation",   "6"],
        ["FR-TR", "Model Training & Evaluation", "6"],
        ["FR-RA", "Recommendation API",          "6"],
        ["FR-SC", "Multi-Criteria Scoring",      "5"],
        ["FR-JU", "Justification Generation",    "3"],
        ["FR-FI", "Future Impact Projection",    "3"],
        ["",      "TOTAL",                       "36"],
    ],
    col_widths=[2.5*cm, 9*cm, 5.5*cm]
))
story.append(Paragraph("Table 1 – Requirement area codes", CAPTION))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2 – DATASET GENERATION
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("2. Dataset Generation Requirements (FR-DG)"))
story.append(sp(8))
story.append(info_box(
    "Source: Methodology §1–§7 + dataset.csv / dataset_full.csv. "
    "These requirements govern how the labelled training dataset is produced "
    "from the three cooling simulators using Monte Carlo scenario sampling."
))
story.append(sp(8))

story.append(fr_card(
    "FR-DG-01",
    "Scenario Parameter Sampling",
    "The system SHALL generate operating scenarios by randomly sampling six input variables "
    "within defined operational bounds using uniform random sampling (Monte Carlo strategy) "
    "to ensure broad, unbiased coverage of the input space.",
    "Sampling bounds configuration: tempC [15–45 °C], rh [20–80 %], itLoadKW [100–2000 kW], "
    "electricityPrice [0.05–0.30 USD/kWh], waterPrice [0.50–3.00 USD/L], "
    "carbonFactor [0.10–0.90 kgCO₂/kWh].",
    "One scenario row containing all six input variables per sample.",
    "HIGH",
    "Methodology §3–§4; dataset.csv column schema"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-02",
    "Multi-Simulator Parallel Evaluation",
    "For each sampled scenario, the system SHALL submit identical input parameters to all "
    "three cooling simulators — Air Economizer, Evaporative Cooling, and Chilled Water — "
    "and collect outputs from each. The same inputs MUST be used for all three simulators "
    "to ensure a fair, unbiased cross-technique comparison.",
    "One scenario row (tempC, rh, itLoadKW, electricityPrice, waterPrice, carbonFactor).",
    "Per-technique outputs for each of the three simulators: feasible flag, energyKWh, "
    "waterLiters, cost, emissionsKg, violations count.",
    "HIGH",
    "Methodology §5; dataset_full.csv columns: air_*, evap_*, chill_*"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-03",
    "Feasibility-Gated Label Assignment",
    "The system SHALL assign the bestTechnique label using a strict two-step rule: "
    "(1) filter to only feasible techniques (feasible = True AND violations = 0); "
    "(2) select the technique with minimum energy consumption among the feasible set. "
    "If no technique is feasible, the row SHALL be labelled 'NoValidOption'.",
    "Per-technique feasibility flags and energyKWh values from all three simulators.",
    "bestTechnique label: one of {AirEconomizer, Evaporative, ChilledWater, NoValidOption}. "
    "Formal rule: bestTechnique_i = argmin_{t ∈ F_i} E_{i,t} where F_i is the feasible set.",
    "HIGH",
    "Methodology §6; recommend_api.py _choose_best()"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-04",
    "Compact Labelled Dataset (dataset.csv)",
    "The system SHALL produce a compact labelled dataset containing only the six input "
    "features and the bestTechnique label. Per-technique outcome columns SHALL NOT be "
    "included in this file to prevent target leakage during classifier training.",
    "Full diagnostic dataset rows.",
    "CSV file with exactly 7 columns: tempC, rh, itLoadKW, electricityPrice, waterPrice, "
    "carbonFactor, bestTechnique.",
    "HIGH",
    "Methodology §7; dataset.csv"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-05",
    "Full Diagnostic Dataset (dataset_full.csv)",
    "The system SHALL produce a full diagnostic dataset containing all six input features, "
    "all per-technique outputs (feasible, energy, water, cost, emissions, violations for "
    "each of the three techniques), and the bestTechnique label. This file is used for "
    "analysis, explainability, and validation only — never as a training source.",
    "Simulator outputs for all three techniques per scenario.",
    "CSV file with 25 columns: 6 inputs + 6×3 per-technique outputs + bestTechnique.",
    "MEDIUM",
    "Methodology §7; dataset_full.csv"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-06",
    "Minimum Dataset Size",
    "The system SHALL generate a minimum of 500 labelled scenarios per dataset version. "
    "The recommended production size is 2 000+ rows to ensure sufficient class "
    "representation across all three technique labels.",
    "N parameter (number of scenarios to generate).",
    "Dataset CSV with N ≥ 500 rows (excluding header row).",
    "MEDIUM",
    "Methodology §4; dataset.csv (500 rows observed)"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DG-07",
    "Reproducible Random Seed",
    "The system SHALL support a configurable random seed parameter for scenario generation "
    "so that datasets can be reproduced exactly for research reporting and regression testing. "
    "The default seed SHALL be 42.",
    "Seed value (integer).",
    "Deterministic, identical dataset output for the same seed value and N.",
    "MEDIUM",
    "Methodology §11 assumption 4; train_recommender.py random_state=42"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 – DATA QUALITY
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("3. Data Quality & Validation Requirements (FR-DQ)"))
story.append(sp(8))
story.append(info_box(
    "Source: Methodology §8 — Data Cleaning and Validation. "
    "These requirements ensure the dataset is clean and reproducible before model training."
))
story.append(sp(8))

story.append(fr_card(
    "FR-DQ-01",
    "Required Column Enforcement",
    "The system SHALL verify that all required columns are present in the dataset before "
    "training begins. If any required column is missing, the system SHALL raise a "
    "descriptive error identifying the missing column and halt processing immediately.",
    "Dataset CSV file path.",
    "Validation pass (all columns present) or descriptive KeyError identifying the missing column.",
    "HIGH",
    "Methodology §8 step 1; train_recommender.py column check"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DQ-02",
    "Numeric Type Coercion",
    "The system SHALL convert all six input feature columns to numeric (float64) type "
    "during data loading using pandas.to_numeric with errors='coerce'. "
    "Non-convertible string values SHALL be coerced to NaN rather than raising an error.",
    "Raw CSV with potentially mixed-type columns.",
    "DataFrame with float64 feature columns; non-numeric values converted to NaN.",
    "HIGH",
    "Methodology §8 step 2"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DQ-03",
    "Missing Value Removal",
    "The system SHALL drop any row that contains a missing value (NaN) in any of the "
    "six input feature columns or the bestTechnique label column before training. "
    "The count of dropped rows SHALL be logged.",
    "DataFrame with potential NaN values.",
    "Clean DataFrame with zero missing values in required columns; dropped row count logged.",
    "HIGH",
    "Methodology §8 step 3"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DQ-04",
    "Duplicate Row Removal",
    "The system SHALL remove exact duplicate rows from the dataset before training "
    "to prevent the model from overfitting to repeated scenarios. "
    "The count of removed duplicates SHALL be logged.",
    "DataFrame with potential duplicate rows.",
    "DataFrame with unique rows only; duplicate count logged.",
    "MEDIUM",
    "Methodology §8 step 4"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DQ-05",
    "Label Normalisation and Validation",
    "The system SHALL normalise bestTechnique label strings (strip whitespace, apply "
    "consistent capitalisation) and validate that all labels belong to the allowed set: "
    "{AirEconomizer, Evaporative, ChilledWater}. Rows with invalid or unrecognised "
    "labels SHALL be excluded from training and their count reported.",
    "Raw bestTechnique column values.",
    "Normalised label column containing only allowed values; count of excluded invalid-label rows.",
    "HIGH",
    "Methodology §8 step 5"
))
story.append(sp(7))

story.append(fr_card(
    "FR-DQ-06",
    "Class Distribution Reporting",
    "The system SHALL compute and log the class distribution — count and percentage per "
    "label — after all cleaning steps are complete. If any class represents less than "
    "5% of the cleaned dataset, a class imbalance warning SHALL be raised to alert "
    "the user before training proceeds.",
    "Cleaned dataset with validated labels.",
    "Class distribution report (count + % per class); imbalance warning if any class < 5%.",
    "MEDIUM",
    "Methodology §8 step 6"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4 – MODEL TRAINING
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("4. Model Training & Evaluation Requirements (FR-TR)"))
story.append(sp(8))
story.append(info_box(
    "Source: Methodology §9 — Training Readiness Protocol; train_recommender.py. "
    "These requirements govern how the Random Forest classifier is trained, "
    "evaluated, and serialised as a reusable model artifact."
))
story.append(sp(8))

story.append(fr_card(
    "FR-TR-01",
    "Feature Set Definition",
    "The system SHALL train the classifier using exactly the six input features defined "
    "in the dataset schema: tempC, rh, itLoadKW, electricityPrice, waterPrice, carbonFactor. "
    "No per-technique outcome columns (energy, cost, emissions, water, violations) SHALL "
    "be included as features, as this would constitute target leakage.",
    "Cleaned dataset.csv.",
    "Feature matrix X with shape (N, 6); target vector y with N class labels.",
    "HIGH",
    "Methodology §7 guardrail; train_recommender.py features list"
))
story.append(sp(7))

story.append(fr_card(
    "FR-TR-02",
    "Stratified Train / Test Split",
    "The system SHALL split the cleaned dataset into a training set (80%) and a test set "
    "(20%) using stratified sampling by class label, ensuring that the proportion of each "
    "class is preserved in both splits. The random seed SHALL be fixed at 42.",
    "Cleaned feature matrix X and label vector y.",
    "X_train, X_test, y_train, y_test with stratified class distribution; "
    "split sizes logged.",
    "HIGH",
    "Methodology §9 step 1; train_recommender.py train_test_split(stratify=y, random_state=42)"
))
story.append(sp(7))

story.append(fr_card(
    "FR-TR-03",
    "Random Forest Classifier Training",
    "The system SHALL train a Random Forest classifier with n_estimators=300 decision "
    "trees and random_state=42 for reproducibility. The classifier SHALL be fit "
    "exclusively on the training split — never on the test split.",
    "X_train, y_train.",
    "Trained RandomForestClassifier object ready for evaluation and serialisation.",
    "HIGH",
    "train_recommender.py RandomForestClassifier(n_estimators=300, random_state=42)"
))
story.append(sp(7))

story.append(fr_card(
    "FR-TR-04",
    "Classification Report Generation",
    "The system SHALL evaluate the trained model on the held-out test split and produce "
    "a full classification report including per-class precision, recall, F1-score, "
    "support, and macro/weighted averages. The minimum acceptable macro F1-score is 0.80.",
    "Trained model, X_test, y_test.",
    "Printed classification report; pass/fail flag based on macro F1 ≥ 0.80 threshold.",
    "HIGH",
    "Methodology §9 step 4; train_recommender.py classification_report"
))
story.append(sp(7))

story.append(fr_card(
    "FR-TR-05",
    "Model Artifact Serialisation",
    "The system SHALL serialise the trained model as a joblib artifact containing both "
    "the fitted model object and the feature_cols list (in training order). The artifact "
    "SHALL be saved to a configurable file path, defaulting to cooling_recommender_rf.pkl.",
    "Trained RandomForestClassifier object; feature column list.",
    "PKL file containing: {model: RandomForestClassifier, feature_cols: list[str]}.",
    "HIGH",
    "train_recommender.py joblib.dump; recommend_api.py MODEL_PATH env var"
))
story.append(sp(7))

story.append(fr_card(
    "FR-TR-06",
    "Model Health Check Endpoint",
    "The recommendation API SHALL expose a GET /health endpoint that returns the model "
    "load status, the model file path, and the feature column list. If the model artifact "
    "failed to load at startup, the endpoint SHALL return status='error' with the "
    "error message so operators can diagnose the issue without inspecting logs.",
    "HTTP GET /health request.",
    "JSON response: {status: 'ok'|'error', model_loaded: bool, model_path: str, "
    "features: list[str]} or {status: 'error', error: str}.",
    "HIGH",
    "recommend_api.py /health endpoint"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5 – RECOMMENDATION API
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("5. Recommendation API Requirements (FR-RA)"))
story.append(sp(8))
story.append(info_box(
    "Source: recommend_api.py — POST /recommend endpoint. "
    "These requirements define the core inference behaviour: how the API accepts "
    "a scenario, derives ML inputs, runs the classifier, applies feasibility logic, "
    "and returns a structured recommendation."
))
story.append(sp(8))

story.append(fr_card(
    "FR-RA-01",
    "Simulation-Averaged Input Derivation",
    "The system SHALL derive the tempC, rh, and itLoadKW feature values for ML prediction "
    "by computing the arithmetic mean of the corresponding hourly arrays supplied in the "
    "simulation_hourly field of the request. Static user-provided scenario values for "
    "these three fields SHALL be overridden by the simulation averages.",
    "simulation_hourly dict containing arrays: tempC[], rh[], itLoadKW[] (length ≥ 1). "
    "electricityPrice, waterPrice, carbonFactor taken from scenario object as-is.",
    "Scalar averages avg_tempC, avg_rh, avg_itLoadKW used as ML feature inputs. "
    "Number of hours processed logged to console.",
    "HIGH",
    "recommend_api.py _mean_or_none(); simulation_hourly averaging block"
))
story.append(sp(7))

story.append(fr_card(
    "FR-RA-02",
    "simulation_hourly Mandatory Validation",
    "The system SHALL reject any POST /recommend request that does not include a "
    "simulation_hourly payload, or where the payload contains empty or non-numeric "
    "arrays for tempC, rh, or itLoadKW. A 422 Unprocessable Entity response SHALL "
    "be returned with a descriptive error message explaining the requirement.",
    "HTTP POST /recommend request body.",
    "HTTP 422 with detail message if simulation_hourly is absent, or if any of "
    "tempC[], rh[], itLoadKW[] is empty or contains no finite numeric values.",
    "HIGH",
    "recommend_api.py simulation_hourly validation block"
))
story.append(sp(7))

story.append(fr_card(
    "FR-RA-03",
    "ML Model Prediction",
    "The system SHALL construct a single-row feature DataFrame from the six scenario "
    "inputs (using simulation-averaged values for tempC, rh, itLoadKW) and pass it to "
    "the loaded Random Forest model to obtain a predicted bestTechnique label. The "
    "column order MUST match the feature_cols list stored in the model artifact.",
    "Six-feature scenario dict; loaded model artifact with feature_cols.",
    "model_recommendation: string — one of {AirEconomizer, Evaporative, ChilledWater}.",
    "HIGH",
    "recommend_api.py model.predict(frame)[0]"
))
story.append(sp(7))

story.append(fr_card(
    "FR-RA-04",
    "Feasibility Override Logic",
    "When technique_results are provided, the system SHALL apply a three-tier decision "
    "rule to determine the final recommendation: "
    "(1) if the ML-predicted technique is feasible (feasible=True AND violations ≤ threshold), "
    "use it as the final recommendation (decision_source = 'ml_feasible'); "
    "(2) if the ML prediction is infeasible, fall back to the feasible technique with the "
    "lowest composite score (decision_source = 'fallback_scoring_due_to_infeasible_ml'); "
    "(3) if no technique is feasible, retain the ML prediction and flag the situation "
    "(decision_source = 'ml_no_feasible_options').",
    "ML prediction string; technique_results list with feasible flags and violations counts.",
    "final_choice dict (the winning technique row); decision_source string recorded in response.",
    "HIGH",
    "recommend_api.py _is_row_feasible(), decision_source logic"
))
story.append(sp(7))

story.append(fr_card(
    "FR-RA-05",
    "Current Technique Switch / Keep Advisory",
    "When the request includes a current_technique field, the system SHALL compare it "
    "against the final recommendation and prepend context-aware advisory messages: "
    "if the current technique matches the recommendation, the system SHALL advise to "
    "continue and focus on optimisation; if it differs, the system SHALL advise switching "
    "and explain why.",
    "current_technique string (optional, nullable).",
    "Two to three advisory sentences prepended to why_this_is_recommended list.",
    "MEDIUM",
    "recommend_api.py current_technique comparison block"
))
story.append(sp(7))

story.append(fr_card(
    "FR-RA-06",
    "UTC Timestamp on Every Response",
    "Every POST /recommend response SHALL include a generated_at_utc field containing "
    "the ISO 8601 UTC timestamp of when the recommendation was generated, enabling "
    "audit trails and response caching validation.",
    "System clock at request processing time.",
    "generated_at_utc: string in format YYYY-MM-DDTHH:MM:SS.ffffffZ.",
    "LOW",
    "recommend_api.py datetime.utcnow().isoformat() + 'Z'"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6 – MULTI-CRITERIA SCORING
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("6. Multi-Criteria Scoring Requirements (FR-SC)"))
story.append(sp(8))
story.append(info_box(
    "Source: recommend_api.py — _normalize(), _enrich_rows(), _build_comparison_table(). "
    "These requirements define how the three techniques are scored and ranked when "
    "simulation results are provided alongside the ML prediction."
))
story.append(sp(8))

story.append(fr_card(
    "FR-SC-01",
    "Min-Max Normalisation of Objectives",
    "The system SHALL normalise cost, emissions_kg, and water_liters across all three "
    "techniques using min-max normalisation before computing composite scores. "
    "If all three techniques have identical values for an objective (range = 0), "
    "the normalised value SHALL be 0.0 for all three to avoid division by zero.",
    "Raw cost, emissions_kg, water_liters values for all three techniques.",
    "Three normalised arrays in [0.0, 1.0], one per objective.",
    "HIGH",
    "recommend_api.py _normalize() — (arr - min) / (max - min)"
))
story.append(sp(7))

story.append(fr_card(
    "FR-SC-02",
    "Configurable Weighted Composite Score",
    "The system SHALL compute a composite score for each technique as a weighted sum of "
    "the three normalised objectives: "
    "score = w_cost × cost_n + w_emissions × emissions_n + w_water × water_n. "
    "Weights SHALL be configurable via environment variables WEIGHT_COST, "
    "WEIGHT_EMISSIONS, WEIGHT_WATER with defaults 0.5, 0.3, 0.2 respectively. "
    "A lower score indicates a better technique.",
    "Normalised objective values; weight configuration from environment.",
    "Composite score (float) per technique. Lower = better.",
    "HIGH",
    "recommend_api.py WEIGHT_COST=0.5, WEIGHT_EMISSIONS=0.3, WEIGHT_WATER=0.2"
))
story.append(sp(7))

story.append(fr_card(
    "FR-SC-03",
    "Annualised Metric Computation",
    "The system SHALL compute annualised versions of cost, emissions, and water usage "
    "for each technique based on the metrics_unit field in the request. "
    "If metrics_unit='hourly', values SHALL be multiplied by 24 × 365 = 8 760. "
    "If metrics_unit='annual', values SHALL be used as-is. "
    "Invalid metrics_unit values SHALL default to 'annual'.",
    "Per-technique cost, emissions_kg, water_liters; metrics_unit string.",
    "annual_cost, annual_emissions_kg, annual_water_liters per technique.",
    "HIGH",
    "recommend_api.py _annualize() function"
))
story.append(sp(7))

story.append(fr_card(
    "FR-SC-04",
    "Ranked Comparison Table in Response",
    "The system SHALL return a comparison_table array in the response containing all "
    "three techniques sorted by composite score in ascending order (best first). "
    "Each entry SHALL include: tech, feasible, score, cost, emissions_kg, water_liters, "
    "violations, annual_cost, annual_emissions_kg, annual_water_liters.",
    "Enriched technique rows with computed scores.",
    "comparison_table: list of 3 dicts sorted by score ascending.",
    "HIGH",
    "recommend_api.py _build_comparison_table()"
))
story.append(sp(7))

story.append(fr_card(
    "FR-SC-05",
    "Violation Threshold Enforcement",
    "The system SHALL treat a technique as infeasible if its violations count exceeds "
    "the MAX_ALLOWED_VIOLATIONS threshold. This threshold SHALL be configurable via "
    "the MAX_ALLOWED_VIOLATIONS environment variable with a default of 0 (zero tolerance). "
    "Techniques exceeding the threshold SHALL be excluded from the primary recommendation "
    "pool but still appear in the comparison table.",
    "violations count per technique; MAX_ALLOWED_VIOLATIONS environment variable.",
    "Boolean feasibility flag per technique after violation threshold check.",
    "MEDIUM",
    "recommend_api.py _is_row_feasible(), MAX_ALLOWED_VIOLATIONS env var"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7 – JUSTIFICATION GENERATION
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("7. Justification Generation Requirements (FR-JU)"))
story.append(sp(8))
story.append(info_box(
    "Source: recommend_api.py — _build_user_reasons(). "
    "These requirements define the context-aware, human-readable explanation "
    "sentences that accompany every recommendation."
))
story.append(sp(8))

story.append(fr_card(
    "FR-JU-01",
    "Context-Aware Justification List",
    "The system SHALL generate a why_this_is_recommended list of human-readable sentences "
    "for each recommendation. The list SHALL always include: (1) a statement naming the "
    "recommended technique; (2) a feasibility confirmation with violation count; "
    "(3) up to four condition-triggered contextual reasons based on scenario thresholds; "
    "(4) one quantified comparison sentence per alternative technique. "
    "The total list SHALL be capped at 8 items.",
    "Scenario dict, final_choice dict, alternatives list (sorted by score).",
    "why_this_is_recommended: list of up to 8 plain-English strings.",
    "HIGH",
    "recommend_api.py _build_user_reasons()"
))
story.append(sp(7))

story.append(fr_card(
    "FR-JU-02",
    "Condition-Triggered Contextual Reasons",
    "The system SHALL append specific contextual reasons based on the following "
    "scenario thresholds — each triggered independently: "
    "(a) carbonFactor ≥ 0.5 kgCO₂/kWh → high-carbon grid reason; "
    "(b) electricityPrice ≥ 0.15 USD/kWh → high-tariff reason; "
    "(c) rh ≥ 70% → high-humidity reason; "
    "(d) itLoadKW ≥ 1400 kW → high-load reason. "
    "Each triggered reason SHALL reference the recommended technique by name.",
    "Scenario dict values for carbonFactor, electricityPrice, rh, itLoadKW.",
    "0 to 4 additional contextual reason strings appended to the justification list.",
    "MEDIUM",
    "recommend_api.py _build_user_reasons() threshold checks"
))
story.append(sp(7))

story.append(fr_card(
    "FR-JU-03",
    "Quantified Alternative Comparison Sentences",
    "For each non-recommended technique, the system SHALL generate one comparison "
    "sentence that quantifies the annual cost difference, annual emissions difference, "
    "and annual water difference relative to the recommended technique. "
    "Positive differences (recommended is cheaper/lower) SHALL be described as savings; "
    "negative differences SHALL be described as additional cost or usage.",
    "annual_cost, annual_emissions_kg, annual_water_liters for the recommended technique "
    "and each alternative.",
    "Two comparison sentences (one per alternative) formatted as: "
    "'Compared with [alt], choosing [best] can save about $X per year, reduce emissions "
    "by Y kg CO₂ per year, and save Z liters of water per year.'",
    "HIGH",
    "recommend_api.py _build_user_reasons() alternatives loop, _money(), _num() helpers"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8 – FUTURE IMPACT PROJECTION
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("8. Future Impact Projection Requirements (FR-FI)"))
story.append(sp(8))
story.append(info_box(
    "Source: recommend_api.py — _build_future_impact_paragraph(). "
    "These requirements define the multi-year projection output included in "
    "every recommendation response when technique results are available."
))
story.append(sp(8))

story.append(fr_card(
    "FR-FI-01",
    "Year 1 / 3 / 5 Cost, Emissions, and Water Projection",
    "The system SHALL compute and return a future_impact_paragraph containing projected "
    "cumulative values for the recommended technique at Year 1, Year 3, and Year 5. "
    "Projections SHALL use a constant annual rate assumption: Year N = N × annual_value.",
    "annual_cost, annual_emissions_kg, annual_water_liters for the recommended technique.",
    "future_impact_paragraph: single plain-English string containing Year 1, Year 3, "
    "and Year 5 projections for cost (USD), emissions (kg CO₂), and water (liters).",
    "HIGH",
    "recommend_api.py _build_future_impact_paragraph()"
))
story.append(sp(7))

story.append(fr_card(
    "FR-FI-02",
    "Projection Narrative Format",
    "The future impact paragraph SHALL be written in plain English suitable for "
    "non-technical stakeholders. It SHALL include: the technique name, Year 1 values, "
    "Year 3 cumulative values, Year 5 cumulative values, and a closing sentence "
    "referencing budget planning, sustainability targets, and cooling reliability. "
    "Currency values SHALL be formatted as $X,XXX and numeric values as X,XXX.",
    "Computed Year 1/3/5 projection values.",
    "Single human-readable paragraph string with formatted monetary and numeric values.",
    "MEDIUM",
    "recommend_api.py _build_future_impact_paragraph(), _money(), _num()"
))
story.append(sp(7))

story.append(fr_card(
    "FR-FI-03",
    "Graceful Degradation Without Technique Results",
    "If technique_results are not provided in the request, the system SHALL still return "
    "a valid model_recommendation. The future_impact_paragraph SHALL contain a placeholder "
    "message stating that detailed projections require technique comparison metrics, "
    "rather than raising an error or returning null.",
    "Absent or null technique_results field.",
    "future_impact_paragraph: 'Future impact details are available when technique "
    "comparison metrics are provided in the request.'",
    "MEDIUM",
    "recommend_api.py response default future_impact_paragraph"
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9 – COMPLETE REQUIREMENTS REGISTER
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("9. Complete Requirements Register"))
story.append(sp(8))

story.append(mk_table(
    ["FR ID", "Title", "Area", "Priority"],
    [
        ["FR-DG-01","Scenario Parameter Sampling",              "Dataset Generation",   "HIGH"],
        ["FR-DG-02","Multi-Simulator Parallel Evaluation",      "Dataset Generation",   "HIGH"],
        ["FR-DG-03","Feasibility-Gated Label Assignment",       "Dataset Generation",   "HIGH"],
        ["FR-DG-04","Compact Labelled Dataset (dataset.csv)",   "Dataset Generation",   "HIGH"],
        ["FR-DG-05","Full Diagnostic Dataset (dataset_full.csv)","Dataset Generation",  "MEDIUM"],
        ["FR-DG-06","Minimum Dataset Size",                     "Dataset Generation",   "MEDIUM"],
        ["FR-DG-07","Reproducible Random Seed",                 "Dataset Generation",   "MEDIUM"],
        ["FR-DQ-01","Required Column Enforcement",              "Data Quality",         "HIGH"],
        ["FR-DQ-02","Numeric Type Coercion",                    "Data Quality",         "HIGH"],
        ["FR-DQ-03","Missing Value Removal",                    "Data Quality",         "HIGH"],
        ["FR-DQ-04","Duplicate Row Removal",                    "Data Quality",         "MEDIUM"],
        ["FR-DQ-05","Label Normalisation and Validation",       "Data Quality",         "HIGH"],
        ["FR-DQ-06","Class Distribution Reporting",             "Data Quality",         "MEDIUM"],
        ["FR-TR-01","Feature Set Definition",                   "Model Training",       "HIGH"],
        ["FR-TR-02","Stratified Train / Test Split",            "Model Training",       "HIGH"],
        ["FR-TR-03","Random Forest Classifier Training",        "Model Training",       "HIGH"],
        ["FR-TR-04","Classification Report Generation",         "Model Training",       "HIGH"],
        ["FR-TR-05","Model Artifact Serialisation",             "Model Training",       "HIGH"],
        ["FR-TR-06","Model Health Check Endpoint",              "Model Training",       "HIGH"],
        ["FR-RA-01","Simulation-Averaged Input Derivation",     "Recommendation API",   "HIGH"],
        ["FR-RA-02","simulation_hourly Mandatory Validation",   "Recommendation API",   "HIGH"],
        ["FR-RA-03","ML Model Prediction",                      "Recommendation API",   "HIGH"],
        ["FR-RA-04","Feasibility Override Logic",               "Recommendation API",   "HIGH"],
        ["FR-RA-05","Current Technique Switch / Keep Advisory", "Recommendation API",   "MEDIUM"],
        ["FR-RA-06","UTC Timestamp on Every Response",          "Recommendation API",   "LOW"],
        ["FR-SC-01","Min-Max Normalisation of Objectives",      "Scoring",              "HIGH"],
        ["FR-SC-02","Configurable Weighted Composite Score",    "Scoring",              "HIGH"],
        ["FR-SC-03","Annualised Metric Computation",            "Scoring",              "HIGH"],
        ["FR-SC-04","Ranked Comparison Table in Response",      "Scoring",              "HIGH"],
        ["FR-SC-05","Violation Threshold Enforcement",          "Scoring",              "MEDIUM"],
        ["FR-JU-01","Context-Aware Justification List",         "Justification",        "HIGH"],
        ["FR-JU-02","Condition-Triggered Contextual Reasons",   "Justification",        "MEDIUM"],
        ["FR-JU-03","Quantified Alternative Comparison",        "Justification",        "HIGH"],
        ["FR-FI-01","Year 1/3/5 Cost, Emissions, Water Projection","Future Impact",     "HIGH"],
        ["FR-FI-02","Projection Narrative Format",              "Future Impact",        "MEDIUM"],
        ["FR-FI-03","Graceful Degradation Without Results",     "Future Impact",        "MEDIUM"],
    ],
    col_widths=[2.5*cm, 7.5*cm, 4*cm, 3*cm]
))
story.append(Paragraph("Table 2 – Complete functional requirements register (36 requirements)", CAPTION))
story.append(sp(8))

story.append(Paragraph("Priority Summary", H2))
story.append(mk_table(
    ["Priority", "Count", "% of Total"],
    [
        ["HIGH",   "25", "69%"],
        ["MEDIUM", "10", "28%"],
        ["LOW",    "1",  "3%"],
        ["TOTAL",  "36", "100%"],
    ],
    col_widths=[4*cm, 4*cm, 9*cm]
))
story.append(Paragraph("Table 3 – Requirements by priority", CAPTION))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 10 – DATA SCHEMA REFERENCE
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("10. Data Schema Reference"))
story.append(sp(8))

story.append(Paragraph("10.1  dataset.csv — Compact Training Dataset (7 columns)", H2))
story.append(mk_table(
    ["Column", "Type", "Range / Values", "Role in ML"],
    [
        ["tempC",            "float64", "15–45 °C",                              "Input feature"],
        ["rh",               "float64", "20–80 %",                               "Input feature"],
        ["itLoadKW",         "float64", "100–2 000 kW",                          "Input feature"],
        ["electricityPrice", "float64", "0.05–0.30 USD/kWh",                     "Input feature"],
        ["waterPrice",       "float64", "0.50–3.00 USD/L",                       "Input feature"],
        ["carbonFactor",     "float64", "0.10–0.90 kgCO₂/kWh",                  "Input feature"],
        ["bestTechnique",    "string",  "{AirEconomizer, Evaporative, ChilledWater}", "Target label"],
    ],
    col_widths=[3.5*cm, 2*cm, 4.5*cm, 7*cm]
))
story.append(Paragraph("Table 4 – dataset.csv schema", CAPTION))
story.append(sp(6))

story.append(Paragraph("10.2  dataset_full.csv — Diagnostic Dataset (25 columns)", H2))
story.append(mk_table(
    ["Column Group", "Columns", "Used in Training?"],
    [
        ["Input features (×6)",
         "tempC, rh, itLoadKW, electricityPrice, waterPrice, carbonFactor", "YES"],
        ["Air Economizer outputs (×6)",
         "air_feasible, air_energyKWh, air_waterLiters, air_cost, air_emissionsKg, air_violations",
         "NO — diagnostic only"],
        ["Evaporative outputs (×6)",
         "evap_feasible, evap_energyKWh, evap_waterLiters, evap_cost, evap_emissionsKg, evap_violations",
         "NO — diagnostic only"],
        ["Chilled Water outputs (×6)",
         "chill_feasible, chill_energyKWh, chill_waterLiters, chill_cost, chill_emissionsKg, chill_violations",
         "NO — diagnostic only"],
        ["Target label (×1)", "bestTechnique", "YES (label only)"],
    ],
    col_widths=[4*cm, 9.5*cm, 3.5*cm]
))
story.append(Paragraph("Table 5 – dataset_full.csv schema", CAPTION))
story.append(sp(6))

story.append(Paragraph("10.3  POST /recommend — Request Schema", H2))
story.append(mk_table(
    ["Field", "Type", "Required", "Description"],
    [
        ["scenario.tempC",            "float",       "Yes", "Ambient dry-bulb temperature (°C)"],
        ["scenario.rh",               "float",       "Yes", "Relative humidity (%)"],
        ["scenario.itLoadKW",         "float",       "Yes", "IT load (kW)"],
        ["scenario.electricityPrice", "float",       "Yes", "Electricity tariff (USD/kWh)"],
        ["scenario.waterPrice",       "float",       "Yes", "Water tariff (USD/L)"],
        ["scenario.carbonFactor",     "float",       "Yes", "Grid carbon intensity (kgCO₂/kWh)"],
        ["simulation_hourly",         "dict",        "Yes", "Hourly arrays: tempC[], rh[], itLoadKW[]"],
        ["current_technique",         "string|null", "No",  "User's currently deployed cooling technique"],
        ["technique_results",         "list|null",   "No",  "Per-technique simulation outputs for scoring"],
        ["metrics_unit",              "string",      "No",  "'annual' (default) or 'hourly'"],
    ],
    col_widths=[4*cm, 2.5*cm, 2*cm, 8.5*cm]
))
story.append(Paragraph("Table 6 – POST /recommend request schema", CAPTION))
story.append(sp(6))

story.append(Paragraph("10.4  POST /recommend — Response Schema", H2))
story.append(mk_table(
    ["Field", "Type", "Always Present?", "Description"],
    [
        ["model_recommendation",    "string",     "Yes", "ML-predicted or feasibility-overridden best technique"],
        ["generated_at_utc",        "string",     "Yes", "ISO 8601 UTC timestamp of recommendation"],
        ["why_this_is_recommended", "list[str]",  "Yes", "Up to 8 plain-English justification sentences"],
        ["future_impact_paragraph", "string",     "Yes", "Year 1/3/5 projection or placeholder message"],
        ["comparison_table",        "list[dict]", "No",  "3 techniques ranked by composite score (if technique_results provided)"],
        ["current_technique",       "string|null","Yes", "Echo of the user's current technique from request"],
    ],
    col_widths=[4.5*cm, 2.5*cm, 2.5*cm, 7.5*cm]
))
story.append(Paragraph("Table 7 – POST /recommend response schema", CAPTION))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 11 – ASSUMPTIONS & LIMITATIONS
# ═══════════════════════════════════════════════════════════════════════════
story.append(sec_hdr("11. Assumptions & Limitations"))
story.append(sp(8))

story.append(Paragraph("11.1  Explicit Methodological Assumptions", H2))
story.append(blist([
    "The three cooling simulators adequately represent each technique under the configured constraints and parameter ranges.",
    "The sampled input ranges (tempC 15–45 °C, rh 20–80%, itLoadKW 100–2000 kW) represent a realistic operating envelope for the target deployment contexts.",
    "The feasibility logic is reliable and consistently applied across all three technique simulators.",
    "Energy-minimum feasible winner is a valid label policy for baseline technique recommendation.",
    "electricityPrice, waterPrice, and carbonFactor are exogenous inputs provided by the user — they are not predicted variables.",
    "The Random Forest classifier generalises to unseen scenarios within the sampled input bounds.",
    "The constant annual rate assumption in future projections is acceptable for Year 1–5 planning horizons.",
]))
story.append(sp(6))

story.append(Paragraph("11.2  Known Limitations", H2))
story.append(mk_table(
    ["Limitation", "Impact", "Mitigation"],
    [
        ["Synthetic sampling may not match real temporal distributions",
         "Model may underperform on real-world seasonal patterns",
         "Supplement with real operational data when available"],
        ["Label policy based on minimum energy only",
         "May underweight cost/water/emissions trade-offs",
         "Multi-criteria scoring in API compensates at inference time"],
        ["Rare edge scenarios may be underrepresented",
         "Poor generalisation at distribution boundaries",
         "Increase N; use stratified scenario generation"],
        ["Simulator bias propagates into labels",
         "Misconfigured simulator produces systematically wrong labels",
         "Validate simulators against known benchmarks before dataset generation"],
        ["Year N projections assume constant annual rates",
         "Does not account for electricity price escalation or carbon tax increases",
         "Noted in projection paragraph; full escalation model planned"],
    ],
    col_widths=[4*cm, 5*cm, 8*cm]
))
story.append(Paragraph("Table 8 – Known limitations and mitigations", CAPTION))
story.append(sp(10))

story.append(HRFlowable(width="100%", thickness=1.5, color=DARK_BLUE,
                         spaceAfter=6, spaceBefore=6))
story.append(Paragraph(
    f"Functional Requirements Specification v1.0  ·  ML Cooling Recommendation System  ·  "
    f"Generated {datetime.date.today().strftime('%B %d, %Y')}",
    CAPTION
))

# ── Build ─────────────────────────────────────────────────────────────────────
doc.build(story)
print("PDF generated: ML_Recommendation_FR.pdf")
