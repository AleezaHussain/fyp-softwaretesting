from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, HRFlowable, KeepTogether)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

OUTPUT = "results_report/FYP_Cooling_Results.pdf"
os.makedirs("results_report", exist_ok=True)

doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=2.5*cm, rightMargin=2.5*cm,
    topMargin=2.5*cm, bottomMargin=2.5*cm,
    title="FYP: Data Center Cooling Strategies - Results",
    author="Aleeza Hussain")

styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, spaceAfter=10,
    textColor=colors.HexColor('#1a1a2e'), spaceBefore=20)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, spaceAfter=8,
    textColor=colors.HexColor('#16213e'), spaceBefore=14)
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=11, spaceAfter=6,
    textColor=colors.HexColor('#0f3460'), spaceBefore=10)
BODY = ParagraphStyle('BODY', parent=styles['Normal'], fontSize=10, spaceAfter=6,
    leading=14, alignment=TA_JUSTIFY)
NOTE = ParagraphStyle('NOTE', parent=styles['Normal'], fontSize=9, spaceAfter=6,
    leading=13, textColor=colors.HexColor('#444444'), leftIndent=10)
CAPTION = ParagraphStyle('CAPTION', parent=styles['Normal'], fontSize=9,
    alignment=TA_CENTER, spaceAfter=8, textColor=colors.HexColor('#333333'),
    fontName='Helvetica-Oblique')
TITLE_STYLE = ParagraphStyle('TITLE', parent=styles['Title'], fontSize=22,
    alignment=TA_CENTER, textColor=colors.HexColor('#1a1a2e'), spaceAfter=10)
SUBTITLE = ParagraphStyle('SUBTITLE', parent=styles['Normal'], fontSize=14,
    alignment=TA_CENTER, textColor=colors.HexColor('#0f3460'), spaceAfter=6)
CENTER = ParagraphStyle('CENTER', parent=styles['Normal'], fontSize=10,
    alignment=TA_CENTER, spaceAfter=6)

AIR_COLOR  = '#1e64b4'
EVAP_COLOR = '#228b22'
CHW_COLOR  = '#b41e1e'
HDR_DARK   = '#1a1a2e'

def tbl(data, col_widths=None, hdr_color=HDR_DARK):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor(hdr_color)),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f0f4f8')]),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#bbbbbb')),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t

story = []

# ---- TITLE PAGE ----
story.append(Spacer(1, 2.5*cm))
story.append(Paragraph("FYP: Comparative Analysis of", TITLE_STYLE))
story.append(Paragraph("Data Center Cooling Strategies", TITLE_STYLE))
story.append(Spacer(1, 0.4*cm))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Simulation Results &amp; Analysis Report", SUBTITLE))
story.append(Spacer(1, 0.3*cm))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#0f3460')))
story.append(Spacer(1, 1.5*cm))
story.append(Paragraph("Aleeza Hussain", CENTER))
story.append(Paragraph("April 2026", CENTER))
story.append(Spacer(1, 1.5*cm))
story.append(Paragraph(
    "This report presents the full simulation results from three high-fidelity physics-based "
    "cooling models: Air-Side Economization, Evaporative Cooling, and Chilled Water Systems. "
    "All simulations run over 8,760 hours (one full year) using CloudSim Plus 8.x co-simulation "
    "integrated with custom Spring Boot / Python physics engines.",
    ParagraphStyle('intro', parent=BODY, alignment=TA_CENTER, fontSize=10)))
story.append(Spacer(1, 0.8*cm))
story.append(Paragraph("Department of Computer Science | Final Year Project", CENTER))
story.append(PageBreak())

# ---- SECTION 1: EXECUTIVE SUMMARY ----
story.append(Paragraph("1. Executive Summary", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(
    "This report presents the complete simulation results for three data center cooling strategies "
    "evaluated under identical AI-era workload conditions over a full 8,760-hour annual cycle. "
    "The simulation framework integrates CloudSim Plus 8.x Discrete Event Simulation with "
    "custom-built physics engines implemented in Java 17 / Spring Boot 3.x and Python FastAPI, "
    "as described in the accompanying Methodology document.", BODY))

story.append(Paragraph("Key Findings at a Glance", H2))
exec_data = [
    ['Metric', 'Air-Side Econ.', 'Evaporative', 'Chilled Water', 'Best'],
    ['Total Energy (kWh/yr)', '478,090', '141,539', '288,475', 'Evaporative'],
    ['Average PUE', '1.285', '1.002', '1.163', 'Evaporative'],
    ['Average CUE (kgCO2/kWhIT)', '0.591', '0.461', '0.549', 'Evaporative'],
    ['Annual OpEx (USD)', '$97,033', '$20,523', '$42,553', 'Evaporative'],
    ['Carbon Emissions (kg/yr)', '219,921', '65,108', '158,196', 'Evaporative'],
    ['Water Usage (L/yr)', '0', '0', '515,331', 'Air/Evap'],
    ['CAPEX (USD)', '$45,000', 'Low', '$630,000', 'Evaporative'],
    ['Thermal Compliance', 'Marginal', 'FAIL', 'PASS', 'Chilled Water'],
    ['Payback Period (yrs)', '491.9', 'N/A', '50.0', '---'],
]
story.append(tbl(exec_data, col_widths=[5.5*cm, 3*cm, 3*cm, 3*cm, 2.5*cm]))
story.append(Paragraph("Table 1: Annual Performance Summary - All Three Cooling Techniques", CAPTION))
story.append(Paragraph(
    "<b>Overall Recommendation:</b> The ML-based recommender system recommends "
    "<b>Evaporative Cooling</b> for lowest energy and cost, but the system carries a critical "
    "thermal compliance failure - rack inlet temperatures reached 38.5 degrees C, exceeding the ASHRAE "
    "Class A1 limit of 27 degrees C. The <b>Chilled Water System</b> is the only thermally compliant "
    "solution for high-density AI workloads and scores highest (0.930) in the ML composite ranking.", NOTE))
story.append(PageBreak())

# ---- SECTION 2: SIMULATION ARCHITECTURE ----
story.append(Paragraph("2. Simulation Architecture and Co-Simulation Design", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(
    "The simulation platform is built on a lock-step co-simulation model that tightly couples "
    "a Discrete Event Simulation (DES) layer with a physics-based thermal engine. The simulation "
    "clock advances in hourly increments (delta_t = 3,600 s). At each tick, the Thermal Layer pulls "
    "P_IT from the Computational Layer, calculates the necessary mass flow rate of air or water, "
    "and returns the parasitic cooling power (P_cooling) back to the global power tracker.", BODY))

story.append(Paragraph("2.1 Co-Simulation Layer Responsibilities", H2))
arch_data = [
    ['Layer', 'Technology', 'Responsibility'],
    ['Computational', 'CloudSim Plus 8.x', 'VM provisioning, task scheduling, hourly P_IT output'],
    ['Thermal', 'Spring Boot 3.x / Java 17', 'Physics engine: airflow, heat balance, COP calculations'],
    ['Synchronisation', 'Lock-step (delta_t=3600s)', 'Pulls P_IT each tick; returns P_cooling to global tracker'],
    ['Economic', 'ProjectionEngine.java', '5-year NPV, carbon tax escalation, TOU tariffs'],
    ['ML Recommender', 'Random Forest (scikit-learn)', 'Ranks techniques by composite score'],
]
story.append(tbl(arch_data, col_widths=[3.5*cm, 4.5*cm, 9*cm]))
story.append(Paragraph("Table 2: Co-Simulation Layer Responsibilities", CAPTION))

story.append(Paragraph("2.2 Workload Model", H2))
story.append(Paragraph(
    "All three simulations use an identical AI-aware composite workload model: "
    "U_total(t) = [U_diurnal(t) x M_AI] + sigma(t), where U_diurnal is a sinusoidal function "
    "peaking at 14:00, M_AI = 1.3 (Mixed AI workload), and sigma(t) is Gaussian noise (+/-5%). "
    "Weekend load is reduced by 70%. UPS and PDU losses are modelled with quadratic efficiency "
    "curves: eta = -0.05u^2 + 0.1u + 0.94.", BODY))

story.append(Paragraph("2.3 Common Simulation Parameters", H2))
params_data = [
    ['Category', 'Parameter', 'Value', 'Source'],
    ['Thermal', 'ASHRAE Max Inlet (T_max)', '27.0 deg C', 'ASHRAE TC 9.9'],
    ['Thermal', 'Thermal Mass (Rack)', '15.0 kJ/K', 'Design Default'],
    ['Psychrometric', 'Air Density (rho)', '1.2 kg/m3', 'Ideal Gas Law'],
    ['Psychrometric', 'Latent Heat (Lv)', '2,260 kJ/kg', 'Water Vaporisation'],
    ['Power', 'Chiller Reference COP', '3.0', 'Conservative Baseline'],
    ['Economic', 'Base Electricity Rate', '$0.12/kWh', 'Regional Default'],
    ['Carbon', 'Carbon Tax (2030)', '$254/ton CO2', 'IPCC Pathway'],
    ['Workload', 'AI Training Multiplier', '1.8x', 'Sustained High Load'],
    ['Control', 'Mode Switch Hysteresis', '2.0 deg C', 'Stability Buffer'],
    ['Simulation', 'Total Hours', '8,760', 'Full Annual Cycle'],
]
story.append(tbl(params_data, col_widths=[3.5*cm, 5.5*cm, 3.5*cm, 4.5*cm]))
story.append(Paragraph("Table 3: Common Simulation Input Parameters", CAPTION))
story.append(PageBreak())

# ---- SECTION 3: AIR-SIDE ECONOMIZER ----
story.append(Paragraph("3. Air-Side Economizer: Simulation Results", H1))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(AIR_COLOR)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("3.1 System Description", H2))
story.append(Paragraph(
    "The Air-Side Economizer leverages ambient outdoor air to offset mechanical cooling. "
    "A decision-tree state machine selects between three operating modes based on outdoor "
    "dry-bulb temperature (T_out) and relative humidity (RH_out). Required volumetric airflow is: "
    "V_req (CFM) = (P_IT_kW x 3160) / (rho x Cp x delta_T). "
    "A 15% filter penalty is applied to fan power in economiser modes (MERV filtration resistance). "
    "The three operating modes are: FULL_ECON (T_out <= 24 deg C and RH <= 60%, compressor off), "
    "PARTIAL_TRIM (T_out <= 24 deg C but RH > 60%, 20% outdoor air), and MECHANICAL_ONLY "
    "(T_out > 24 deg C, full compressor operation).", BODY))

story.append(Paragraph("3.2 Annual Energy Results (8,760-Hour Simulation)", H2))
air_annual = [
    ['Metric', 'Value', 'Unit'],
    ['Total IT Energy', '372,125', 'kWh'],
    ['Total Cooling Energy', '105,965', 'kWh'],
    ['Total Facility Energy', '478,090', 'kWh'],
    ['Average PUE', '1.285', '-'],
    ['Average CUE', '0.591', 'kgCO2/kWhIT'],
    ['Total Carbon Emissions', '219,921', 'kg CO2'],
    ['Carbon Savings vs. Baseline', '88,198', 'kg CO2'],
    ['Energy Savings vs. Baseline', '28.6%', '-'],
    ['Water Usage', '0', 'Litres'],
]
story.append(tbl(air_annual, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 4: Air-Side Economizer - Annual Energy & Emissions Summary", CAPTION))

story.append(Paragraph("3.3 Economic Results", H2))
air_econ = [
    ['Metric', 'Value', 'Unit'],
    ['CAPEX', '$45,000', 'USD'],
    ['Annual Electricity Cost', '$69,323', 'USD'],
    ['Annual Carbon Tax Cost', '$27,710', 'USD'],
    ['Total Annual OpEx', '$97,033', 'USD'],
    ['Annual Savings vs. Baseline', '$91', 'USD'],
    ['Simple Payback Period', '491.9', 'Years'],
    ['NPV of Savings (5-yr, 9.71% discount)', '$81,161', 'USD'],
    ['Adjusted Payback (demo scenario $25k CAPEX)', '1.31', 'Years'],
]
story.append(tbl(air_econ, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 5: Air-Side Economizer - Economic Analysis", CAPTION))
story.append(Paragraph(
    "<b>Note on Payback Period:</b> The 491.9-year payback reflects the high carbon tax burden "
    "($27,710/yr) at the IPCC 2030 rate of $254/ton CO2. The system's carbon emissions "
    "(219,921 kg/yr) are high because the simulation site uses a carbon-intensive grid "
    "(0.55 kgCO2/kWh). The adjusted payback of 1.31 years applies to the lower-CAPEX demo "
    "scenario ($25,000 CAPEX) where carbon tax is not included.", NOTE))

story.append(Paragraph("3.4 5-Year Financial Projection", H2))
air_5yr = [
    ['Year', 'Energy (kWh)', 'Elec. Cost', 'Carbon Tax', 'Total Cost', 'Cum. Savings'],
    ['1', '435,449', '$65,317', '$3,018', '$68,335', '$18,856'],
    ['2', '435,449', '$67,603', '$3,470', '$71,074', '$38,468'],
    ['3', '435,449', '$69,970', '$3,991', '$73,960', '$58,877'],
    ['4', '435,449', '$72,419', '$4,589', '$77,008', '$80,126'],
    ['5', '435,449', '$74,953', '$5,278', '$80,231', '$102,265'],
    ['TOTAL', '2,177,245', '$350,262', '$20,346', '$370,608', '$102,265'],
]
story.append(tbl(air_5yr, col_widths=[1.5*cm, 3*cm, 3*cm, 3*cm, 3*cm, 3.5*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 6: Air-Side Economizer - 5-Year Cost Projection (15% Carbon Tax Escalation)", CAPTION))

story.append(Paragraph("3.5 CloudSim Rack-Level Analysis", H2))
story.append(Paragraph(
    "The CloudSim integration revealed critical airflow violations under AI workloads. "
    "Average rack utilisation was 78.2% (Mixed AI workload). Load imbalance factor CV = 0.30 "
    "indicates significant workload skew across racks.", BODY))
air_rack = [
    ['Rack', 'Peak Load (kW)', 'Required CFM', 'Limit (CFM)', 'Status'],
    ['Rack 0', '5.5', '803', '400', 'VIOLATION'],
    ['Rack 1', '5.4', '792', '400', 'VIOLATION'],
    ['Rack 2', '5.5', '809', '400', 'VIOLATION'],
    ['Rack 3', '10.0', '1,464', '400', 'HOTSPOT + VIOLATION'],
    ['Rack 4', '10.0', '1,456', '400', 'HOTSPOT + VIOLATION'],
    ['Average', '7.05', '-', '-', '5/5 racks violated'],
]
story.append(tbl(air_rack, col_widths=[2.5*cm, 3.5*cm, 3.5*cm, 3*cm, 4.5*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 7: Air-Side Economizer - Rack-Level Hotspot Analysis (Mixed AI Workload)", CAPTION))
story.append(Paragraph(
    "All five racks exceed the 400 CFM per-rack airflow limit. Racks 3 and 4 are classified as "
    "hotspots (peak load 33% above the 7.5 kW threshold). The system recommends upgrading to "
    "liquid cooling (direct-to-chip) for AI-density workloads.", NOTE))

story.append(Paragraph("3.6 Annual Mode Distribution", H2))
air_modes = [
    ['Mode', 'Approx. Hours', '% of Year', 'Avg PUE', 'Description'],
    ['FULL_ECON', '~3,500', '~40%', '1.23', 'Compressor off, 100% outdoor air'],
    ['PARTIAL_TRIM', '~1,750', '~20%', '1.33', '20% outdoor air, partial mechanical'],
    ['MECHANICAL_ONLY', '~3,510', '~40%', '1.45', 'Full compressor, 0% outdoor air'],
    ['Annual Average', '8,760', '100%', '1.285', '-'],
]
story.append(tbl(air_modes, col_widths=[3.5*cm, 3*cm, 2.5*cm, 2.5*cm, 5.5*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 8: Air-Side Economizer - Annual Operating Mode Distribution", CAPTION))

story.append(Paragraph("3.7 Phase Gate Assessment", H2))
air_gates = [
    ['Gate', 'Status', 'Notes'],
    ['Thermal Compliance', 'MARGINAL', 'Airflow violations at all racks under AI load'],
    ['Water Constraint', 'PASS', 'Zero water consumption'],
    ['Carbon Liability', 'FAIL', '219,921 kg CO2/yr; high grid carbon intensity'],
    ['Economic Viability', 'FAIL', 'Payback 491.9 yrs at full CAPEX ($45k)'],
]
story.append(tbl(air_gates, col_widths=[4*cm, 3*cm, 10*cm], hdr_color=AIR_COLOR))
story.append(Paragraph("Table 9: Air-Side Economizer - Phase Gate Compliance", CAPTION))
story.append(PageBreak())

# ---- SECTION 4: EVAPORATIVE COOLING ----
story.append(Paragraph("4. Evaporative Cooling: Simulation Results", H1))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(EVAP_COLOR)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("4.1 System Description", H2))
story.append(Paragraph(
    "The evaporative cooling system leverages the latent heat of vaporisation (Lv = 2,260 kJ/kg) "
    "to reduce supply air temperature. The simulation implements Direct Evaporative Cooling (DEC) "
    "and Indirect Evaporative Cooling (IEC) modes. Supply temperature is modelled as: "
    "T_supply = T_db - eta_actual x (T_db - T_wb), where eta_actual is the saturation effectiveness "
    "(60-95%). A lumped capacitance model prevents thermal spikes: "
    "C_total x dT/dt = Q_IT(t) - Q_cooling(t), where C_total = C_rack + C_enclosure = 45 kJ/K.", BODY))

story.append(Paragraph("4.2 Annual Energy Results (8,760-Hour Simulation)", H2))
evap_annual = [
    ['Metric', 'Value', 'Unit'],
    ['Total IT Energy', '141,173', 'kWh'],
    ['Fan Energy (Auxiliary)', '366', 'kWh'],
    ['DX Compressor Energy', '0', 'kWh'],
    ['Total Facility Energy', '141,539', 'kWh'],
    ['Average PUE', '1.002', '-'],
    ['Peak PUE', '1.004', '-'],
    ['Average CUE', '0.461', 'kgCO2/kWhIT'],
    ['Total Carbon Emissions', '65,108', 'kg CO2'],
    ['Water Usage', '0', 'Litres'],
    ['Cooling Failure Hours', '0', 'Hours'],
]
story.append(tbl(evap_annual, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=EVAP_COLOR))
story.append(Paragraph("Table 10: Evaporative Cooling - Annual Energy & Emissions Summary", CAPTION))
story.append(Paragraph(
    "The evaporative system achieves a near-ideal PUE of 1.002, meaning only 0.2% overhead above "
    "the IT load - the best result of all three techniques. Zero DX compressor energy is consumed, "
    "and the system operates entirely on fan power.", NOTE))

story.append(Paragraph("4.3 Economic Results", H2))
evap_econ = [
    ['Metric', 'Value', 'Unit'],
    ['Annual Electricity Cost', '$20,523', 'USD'],
    ['Water Cost', '$0', 'USD'],
    ['Total Annual OpEx', '$20,523', 'USD'],
    ['OpEx per kWhIT', '$0.1454', 'USD/kWh'],
    ['OpEx per Server (Annual)', '$213.78', 'USD'],
    ['Carbon Emissions', '65,108', 'kg CO2'],
    ['CO2 per kWhIT', '0.461', 'kg/kWh'],
]
story.append(tbl(evap_econ, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=EVAP_COLOR))
story.append(Paragraph("Table 11: Evaporative Cooling - Economic Analysis", CAPTION))
story.append(Paragraph(
    "The evaporative system has the lowest annual OpEx of all three techniques at $20,523/yr - "
    "79% lower than Air-Side Economizer and 52% lower than Chilled Water.", NOTE))

story.append(Paragraph("4.4 Sample Hourly Performance Profile", H2))
evap_hourly = [
    ['Hour', 'Amb. Temp (C)', 'IT Load (kW)', 'Fan Power (kW)', 'Total (kW)', 'PUE', 'Mode'],
    ['0', '25.0', '11.760', '0.0142', '11.774', '1.0012', 'DEC'],
    ['1', '25.0', '11.760', '0.0142', '11.774', '1.0012', 'DEC'],
    ['5', '25.0', '11.798', '0.0144', '11.813', '1.0012', 'DEC'],
    ['12', '25.0', '12.805', '0.0184', '12.823', '1.0014', 'DEC'],
    ['14', '25.0', '13.089', '0.0196', '13.109', '1.0015', 'DEC'],
    ['18', '25.0', '13.032', '0.0194', '13.052', '1.0015', 'DEC'],
    ['23', '25.0', '11.808', '0.0144', '11.823', '1.0012', 'DEC'],
]
story.append(tbl(evap_hourly, col_widths=[1.5*cm, 2.5*cm, 3*cm, 3*cm, 2.5*cm, 2*cm, 2.5*cm], hdr_color=EVAP_COLOR))
story.append(Paragraph("Table 12: Evaporative Cooling - Sample Hourly Results", CAPTION))

story.append(Paragraph("4.5 Cooling Assessment and Thermal Compliance", H2))
evap_assess = [
    ['Check', 'Result', 'Detail'],
    ['Heat Balance', 'FAIL', 'Cooling capacity 3.5% below IT heat load at peak'],
    ['Inlet Temperature', 'FAIL', 'Max inlet temp: 38.5 deg C (ASHRAE limit: 27 deg C)'],
    ['Humidity', 'PASS', 'Supply humidity within acceptable range'],
    ['Energy Efficiency', 'PASS', 'PUE 1.002 - excellent'],
    ['Overall Status', 'INSUFFICIENT_COOLING', 'Confidence: 95%'],
]
story.append(tbl(evap_assess, col_widths=[4*cm, 3*cm, 10*cm], hdr_color=EVAP_COLOR))
story.append(Paragraph("Table 13: Evaporative Cooling - Cooling Assessment Checks", CAPTION))
story.append(Paragraph(
    "<b>Critical Finding:</b> Rack inlet temperatures reached 38.5 deg C, exceeding the ASHRAE "
    "Class A1 limit of 27 deg C by 11.5 deg C. This triggers the thermal throttling model: "
    "Phi_adj = Phi_base x (1 - gamma x delta_T). At delta_T = 11.5 deg C and gamma = 0.10 "
    "(aggressive throttling above 29 deg C), computational throughput is reduced by up to 115% - "
    "effectively a full shutdown. This makes standalone evaporative cooling unsuitable for "
    "high-density AI workloads without supplemental cooling.", NOTE))

story.append(Paragraph("4.6 Engineering Recommendations", H2))
for rec in [
    "Increase evaporative airflow by ~5% to close the 3.5% capacity gap.",
    "Reduce IT load density or improve server efficiency.",
    "Deploy as a pre-cooling stage upstream of a chilled water system (hybrid configuration).",
    "Monitor dewpoint limits carefully - direct evaporative cooling adds humidity to supply air.",
]:
    story.append(Paragraph(f"• {rec}", NOTE))

story.append(Paragraph("4.7 Phase Gate Assessment", H2))
evap_gates = [
    ['Gate', 'Status', 'Notes'],
    ['Thermal Compliance', 'FAIL', 'Inlet temp 38.5 deg C; 11.5 deg C above ASHRAE limit'],
    ['Water Constraint', 'PASS', 'Zero water consumption in IEC mode'],
    ['Carbon Liability', 'PASS', 'Lowest emissions: 65,108 kg CO2/yr'],
    ['Economic Viability', 'PASS', 'Lowest OpEx: $20,523/yr'],
]
story.append(tbl(evap_gates, col_widths=[4*cm, 3*cm, 10*cm], hdr_color=EVAP_COLOR))
story.append(Paragraph("Table 14: Evaporative Cooling - Phase Gate Compliance", CAPTION))
story.append(PageBreak())

# ---- SECTION 5: CHILLED WATER ----
story.append(Paragraph("5. Chilled Water System: Simulation Results", H1))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor(CHW_COLOR)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("5.1 System Description", H2))
story.append(Paragraph(
    "The chilled water system uses the Energy Input Ratio (EIR) framework for plant operations. "
    "Efficiency is a function of chilled water supply temperature (T_chw) and condenser water "
    "temperature (T_cond). Variable-speed pumping and cooling tower fans follow affinity laws "
    "where power scales cubically with speed (P proportional to speed^3). The system includes: "
    "centrifugal chillers with EIR-based part-load performance curves, variable primary/secondary "
    "pumping loops, cooling tower with wet-bulb approach control, CRAH units for in-row heat "
    "rejection, and Bayesian calibration for real-world performance matching.", BODY))

story.append(Paragraph("5.2 Annual Energy Results (8,760-Hour Simulation)", H2))
chw_annual = [
    ['Metric', 'Value', 'Unit'],
    ['Total Facility Energy', '288,475', 'kWh'],
    ['Cooling Load', '40,487', 'kWh'],
    ['Average PUE', '1.163', '-'],
    ['Water Usage', '515,331', 'Litres'],
    ['WUE', '1.786', 'L/kWhIT'],
    ['Average COP (system)', '1.000', '-'],
    ['Peak Cooling Load', '5.853', 'kW'],
    ['Total Carbon Emissions', '158,196', 'kg CO2'],
    ['Annual OpEx', '$42,553', 'USD'],
]
story.append(tbl(chw_annual, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=CHW_COLOR))
story.append(Paragraph("Table 15: Chilled Water System - Annual Energy & Emissions Summary", CAPTION))
story.append(Paragraph(
    "<b>Note on COP:</b> The average system COP of 1.0 reflects the conservative EIR baseline "
    "(COP_ref = 3.0 at design conditions) combined with all auxiliary loads (pumps, cooling tower "
    "fans, CRAH units). The chiller-only COP at low ambient temperatures (24 deg C) reaches 8.0, "
    "as shown in the hourly data. Real-world systems achieve system COP 4-6 at part load.", NOTE))

story.append(Paragraph("5.3 Economic Results", H2))
chw_econ = [
    ['Metric', 'Value', 'Unit'],
    ['CAPEX', '$630,000', 'USD'],
    ['Annual OpEx', '$42,553', 'USD'],
    ['LCCP (15-year)', '$1,838,582', 'USD'],
    ['NPV', '-$1,092,355', 'USD'],
    ['Simple Payback Period', '50.0', 'Years'],
]
story.append(tbl(chw_econ, col_widths=[8*cm, 4*cm, 5*cm], hdr_color=CHW_COLOR))
story.append(Paragraph("Table 16: Chilled Water System - Economic Analysis", CAPTION))
story.append(Paragraph(
    "The negative NPV of -$1,092,355 and 50-year payback reflect the high CAPEX ($630,000) of a "
    "full chilled water plant. This is typical for enterprise-scale deployments where the investment "
    "is amortised over large IT loads (MW-scale). At the simulated scale (~20-25 kW IT load), "
    "the economics are unfavourable.", NOTE))

story.append(Paragraph("5.4 Sample Hourly Performance Profile", H2))
chw_hourly = [
    ['Hour', 'Amb. Temp (C)', 'IT Load (kW)', 'Cool Load (kW)', 'Chiller (kW)', 'COP', 'Water (L)', 'Cost ($)'],
    ['0', '24.0', '21.43', '2.757', '2.678', '8.00', '43.39', '2.64'],
    ['1', '24.0', '21.43', '2.757', '2.678', '8.00', '43.39', '2.64'],
    ['2', '24.0', '21.43', '2.757', '2.679', '7.999', '43.39', '2.64'],
    ['3', '24.0', '21.43', '2.758', '2.679', '7.998', '43.39', '2.64'],
    ['4', '24.0', '21.43', '2.758', '2.679', '7.998', '43.39', '2.64'],
]
story.append(tbl(chw_hourly, col_widths=[1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2*cm, 2.5*cm, 2*cm], hdr_color=CHW_COLOR))
story.append(Paragraph("Table 17: Chilled Water System - Sample Hourly Results (Hours 0-4)", CAPTION))

story.append(Paragraph("5.5 Water Consumption Analysis", H2))
story.append(Paragraph(
    "The chilled water system consumes 515,331 litres/year (WUE = 1.786 L/kWhIT). This is the "
    "highest water consumption of all three techniques and represents a significant operational "
    "constraint in water-scarce regions.", BODY))
chw_water = [
    ['Region', 'Annual Water (L)', 'Scarcity Risk', 'Water Penalty'],
    ['Seattle (low scarcity)', '515,331', 'Low', 'None'],
    ['Miami (moderate)', '515,331', 'Moderate', 'Moderate'],
    ['Denver (moderate)', '515,331', 'Moderate', 'Moderate'],
    ['Phoenix (high scarcity)', '515,331', 'HIGH', 'Applied (2026 utility rates)'],
]
story.append(tbl(chw_water, col_widths=[4.5*cm, 3.5*cm, 3*cm, 6*cm], hdr_color=CHW_COLOR))
story.append(Paragraph("Table 18: Chilled Water System - Water Consumption by Region", CAPTION))

story.append(Paragraph("5.6 Phase Gate Assessment", H2))
chw_gates = [
    ['Gate', 'Status', 'Notes'],
    ['Thermal Compliance', 'PASS', 'Inlet temps maintained within ASHRAE A2 range (18-27 deg C)'],
    ['Water Constraint', 'PASS', '515,331 L/yr within site water budget'],
    ['Carbon Liability', 'FAIL', '158,196 kg CO2/yr exceeds carbon target'],
    ['Economic Viability', 'FAIL', 'NPV -$1.09M; payback 50 years'],
]
story.append(tbl(chw_gates, col_widths=[4*cm, 3*cm, 10*cm], hdr_color=CHW_COLOR))
story.append(Paragraph("Table 19: Chilled Water System - Phase Gate Compliance", CAPTION))
story.append(Paragraph(
    "<b>Key Advantage:</b> The chilled water system is the only technique to achieve full thermal "
    "compliance at ASHRAE Class A2 limits. It is the recommended choice for high-density AI "
    "workloads where server inlet temperature must be guaranteed below 27 deg C.", NOTE))
story.append(PageBreak())

# ---- SECTION 6: COMPARATIVE ANALYSIS ----
story.append(Paragraph("6. Comparative Analysis", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("6.1 Energy Efficiency Comparison", H2))
cmp_energy = [
    ['Metric', 'Air-Side Econ.', 'Evaporative', 'Chilled Water', 'Winner'],
    ['Total Energy (kWh/yr)', '478,090', '141,539', '288,475', 'Evaporative'],
    ['Average PUE', '1.285', '1.002', '1.163', 'Evaporative'],
    ['Peak PUE', '1.45', '1.004', '1.20', 'Evaporative'],
    ['Cooling Overhead (%)', '28.6%', '0.2%', '16.3%', 'Evaporative'],
    ['Fan Energy (kWh/yr)', '105,965', '366', '-', 'Evaporative'],
    ['Compressor Energy', 'High', 'Zero', 'Moderate', 'Evaporative'],
]
story.append(tbl(cmp_energy, col_widths=[5*cm, 3*cm, 3*cm, 3*cm, 3*cm]))
story.append(Paragraph("Table 20: Energy Efficiency Metrics - All Three Techniques", CAPTION))

story.append(Paragraph("6.2 Environmental Impact Comparison", H2))
cmp_env = [
    ['Metric', 'Air-Side Econ.', 'Evaporative', 'Chilled Water', 'Winner'],
    ['CO2 Emissions (kg/yr)', '219,921', '65,108', '158,196', 'Evaporative'],
    ['CUE (kgCO2/kWhIT)', '0.591', '0.461', '0.549', 'Evaporative'],
    ['Water Usage (L/yr)', '0', '0', '515,331', 'Air/Evap (tie)'],
    ['WUE (L/kWhIT)', '0', '0', '1.786', 'Air/Evap (tie)'],
    ['Carbon Tax/yr ($)', '$27,710', '$8,270', '$20,117', 'Evaporative'],
]
story.append(tbl(cmp_env, col_widths=[5*cm, 3*cm, 3*cm, 3*cm, 3*cm]))
story.append(Paragraph("Table 21: Environmental Metrics - All Three Techniques", CAPTION))

story.append(Paragraph("6.3 Economic Comparison", H2))
cmp_econ = [
    ['Metric', 'Air-Side Econ.', 'Evaporative', 'Chilled Water', 'Winner'],
    ['CAPEX (USD)', '$45,000', 'Low', '$630,000', 'Evaporative'],
    ['Annual OpEx (USD)', '$97,033', '$20,523', '$42,553', 'Evaporative'],
    ['15-yr LCCP (USD)', '-', '-', '$1,838,582', '-'],
    ['NPV (USD)', '$81,161', 'N/A', '-$1,092,355', 'Air-Side'],
    ['Payback (yrs)', '491.9', 'N/A', '50.0', '-'],
]
story.append(tbl(cmp_econ, col_widths=[5*cm, 3*cm, 3*cm, 3*cm, 3*cm]))
story.append(Paragraph("Table 22: Economic Metrics - All Three Techniques", CAPTION))

story.append(Paragraph("6.4 Thermal Compliance Comparison", H2))
cmp_thermal = [
    ['Metric', 'Air-Side Econ.', 'Evaporative', 'Chilled Water', 'Winner'],
    ['Max Inlet Temp (deg C)', '>27 (violation)', '38.5 (violation)', '<=27', 'Chilled Water'],
    ['ASHRAE A1 Compliance', 'Marginal', 'FAIL', 'PASS', 'Chilled Water'],
    ['Airflow Violations', 'All 5 racks', 'N/A', 'None', 'Chilled Water'],
    ['Throttling Events', 'Yes', 'Yes', 'None', 'Chilled Water'],
    ['Cooling Failure Hours', '0', '0', '0', 'Tie'],
]
story.append(tbl(cmp_thermal, col_widths=[5*cm, 3*cm, 3*cm, 3*cm, 3*cm]))
story.append(Paragraph("Table 23: Thermal Compliance - All Three Techniques", CAPTION))

story.append(Paragraph("6.5 ML Recommender System Output", H2))
story.append(Paragraph(
    "The Random Forest recommender, trained on 8,760-hour simulation outputs, produces the "
    "following composite scores (higher = better overall fit for the given conditions):", BODY))
ml_scores = [
    ['Technique', 'Composite Score', 'Cost/yr', 'Emissions (kg)', 'Water (L)', 'Feasible'],
    ['Evaporative', '0.200', '$24,500', '95,000', '450,000', 'Yes'],
    ['Air-Side Econ.', '0.486', '$26,000', '100,000', '5,000', 'Yes'],
    ['Chilled Water', '0.930', '$27,235', '102,084', '294,088', 'Yes'],
]
story.append(tbl(ml_scores, col_widths=[3.5*cm, 3*cm, 2.5*cm, 3*cm, 3*cm, 2*cm]))
story.append(Paragraph("Table 24: ML Recommender - Composite Scores", CAPTION))
story.append(Paragraph(
    "<b>Interpretation:</b> The ML model assigns the highest composite score to Chilled Water "
    "(0.930) because it is the only technique that satisfies all thermal constraints - the primary "
    "hard constraint for AI workloads. Evaporative cooling scores lowest (0.200) due to its "
    "thermal compliance failure, despite having the best energy and cost metrics.", NOTE))

story.append(Paragraph("6.6 Multi-Criteria Assessment Summary", H2))
radar = [
    ['Criterion', 'Air-Side Econ.', 'Evaporative', 'Chilled Water'],
    ['Energy Efficiency', '3rd', '1st', '2nd'],
    ['Thermal Reliability', '2nd', '3rd', '1st'],
    ['Carbon Emissions', '3rd', '1st', '2nd'],
    ['Water Consumption', '1st (tie)', '1st (tie)', '3rd'],
    ['Capital Cost', '2nd', '1st', '3rd'],
    ['Operating Cost', '3rd', '1st', '2nd'],
    ['AI Workload Suitability', '2nd', '3rd', '1st'],
    ['Overall Rank', '3rd', '1st*', '2nd'],
]
story.append(tbl(radar, col_widths=[5.5*cm, 3.5*cm, 3.5*cm, 4.5*cm]))
story.append(Paragraph("Table 25: Multi-Criteria Assessment (1st = Best)", CAPTION))
story.append(Paragraph(
    "*Evaporative ranks 1st on aggregate but fails the critical thermal compliance gate for AI workloads.", NOTE))
story.append(PageBreak())

# ---- SECTION 7: SYSTEM ARCHITECTURE ----
story.append(Paragraph("7. System Architecture", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("7.1 Overall Co-Simulation Architecture", H2))
story.append(Paragraph(
    "The following describes the full system architecture connecting all three cooling simulation "
    "engines with the shared CloudSim Plus workload layer and the ML recommender pipeline.", BODY))

arch_text = [
    "CLOUDSIM PLUS 8.x  (Workload Layer)",
    "  Hosts: Physical servers with linear power models",
    "  VMs:   1:1 mapped, TimeShared scheduler",
    "  Cloudlets: AI Training (1.8x) / Inference (1.4x) / Mixed (1.3x)",
    "  Output: hourlyITLoadKW[8760]  (per-host, per-hour)",
    "",
    "         |                    |                    |",
    "         v                    v                    v",
    "",
    "  AIR-SIDE ECON       EVAPORATIVE           CHILLED WATER",
    "  Spring Boot         Python FastAPI         Spring Boot",
    "  AirEconomizerModel  EvapCoolingModel       ChilledWaterPhysics",
    "",
    "  Decision Tree:      T_supply =             EIR Framework:",
    "  FULL_ECON           T_db - eta*(T_db-T_wb)  COP=f(T_chw,T_cond)",
    "  PARTIAL_TRIM        Lumped Capacitance:    Affinity Laws:",
    "  MECH_ONLY           C*dT/dt=QIT-Qcooling   P ~ speed^3",
    "",
    "         |                    |                    |",
    "         v                    v                    v",
    "",
    "  RESULTS AGGREGATOR",
    "  Hourly: PUE, CUE, WUE, power breakdown, mode, violations",
    "  Annual: Energy, cost, emissions, water, phase gates",
    "  5-year: NPV, carbon tax escalation, climate scenarios",
    "",
    "         v",
    "",
    "  ML RECOMMENDER (Random Forest)",
    "  Features: energy_kwh, water_L, cost_USD, emissions_kg, violations",
    "  Output:   Ranked technique + composite score + why_recommended",
    "",
    "         v",
    "",
    "  REACT FRONTEND (Vite + TypeScript)",
    "  Dashboard: Live KPIs, PUE/CUE charts, mode distribution",
    "  Simulation Detail: Hourly data tables, rack analysis",
    "  Reporting: PDF export, comparison tables",
]
for line in arch_text:
    story.append(Paragraph(line if line else " ", 
        ParagraphStyle('mono', parent=styles['Code'], fontSize=8, leading=11, fontName='Courier')))

story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("7.2 Chilled Water Plant Internal Architecture", H2))
chw_arch = [
    "[Cooling Tower]  Wet-bulb approach control, Fan power: P ~ speed^3",
    "       |",
    "       v",
    "[Condenser Water Loop]  T_cond = f(T_wb, approach)",
    "       |",
    "       v",
    "[Centrifugal Chiller]  EIR = f(T_chw, T_cond) via bi-quadratic curves",
    "                       COP_ref = 3.0 (conservative baseline)",
    "                       Part-load: IPLV modelled via PLR curves",
    "       |",
    "       v",
    "[Chilled Water Loop]  T_chw = 7 deg C supply / 12 deg C return",
    "       |",
    "       v",
    "[CRAH Units]  Variable speed fans (affinity law), Sensible heat ratio control",
    "       |",
    "       v",
    "[Server Racks]  IT Load = CloudSim hourlyITLoadKW",
    "               Thermal mass: C_rack = 15 kJ/K",
    "               Inlet temp monitored vs ASHRAE 27 deg C limit",
]
for line in chw_arch:
    story.append(Paragraph(line,
        ParagraphStyle('mono2', parent=styles['Code'], fontSize=8, leading=11, fontName='Courier')))

story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("7.3 Air-Side Economizer Control State Machine", H2))
sm_text = [
    "START (each hour)",
    "     |",
    "     v",
    "T_out <= 24 deg C?",
    "  YES  -->  RH_out <= 60%?",
    "              YES  -->  FULL_ECON: OA=100%, P_comp=0",
    "                        P_fan = V_req x W/CFM x 1.15 (filter penalty)",
    "              NO   -->  PARTIAL_TRIM: OA=20%, P_comp = Q_mech/COP",
    "  NO   -->  MECHANICAL_ONLY: P_comp = Q_IT/COP(T_out)",
    "     |",
    "     v",
    "Airflow Violation Check: V_req > V_max?",
    "  YES  -->  VIOLATION: Recommend liquid cooling (direct-to-chip)",
    "     |",
    "     v",
    "Compute: PUE, CUE, hourly cost, carbon emissions",
]
for line in sm_text:
    story.append(Paragraph(line,
        ParagraphStyle('mono3', parent=styles['Code'], fontSize=8, leading=11, fontName='Courier')))
story.append(PageBreak())

# ---- SECTION 8: CLIMATE RESILIENCE ----
story.append(Paragraph("8. Climate Resilience and Sustainability Analysis", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("8.1 IPCC Climate Scenario Impact", H2))
story.append(Paragraph(
    "Performance is modelled against three IPCC RCP pathways for 2030. A 3% cooling load "
    "increase per 1 deg C temperature rise is applied. Under RCP 8.5, the Air-Side Economizer "
    "is most severely impacted because higher ambient temperatures reduce free-cooling hours, "
    "forcing more mechanical operation.", BODY))
climate_data = [
    ['Scenario', 'Temp Offset', 'Air-Side (kWh)', 'Evap. (kWh)', 'Chilled W. (kWh)'],
    ['RCP 2.6 (Baseline)', '+0 deg C', '478,090', '141,539', '288,475'],
    ['RCP 4.5 (Moderate)', '+1.5 deg C', '499,604', '147,909', '301,456'],
    ['RCP 8.5 (High)', '+3.0 deg C', '521,118', '154,278', '314,438'],
]
story.append(tbl(climate_data, col_widths=[4*cm, 3*cm, 3.5*cm, 3.5*cm, 3*cm]))
story.append(Paragraph("Table 26: Climate Scenario Impact on Annual Cooling Energy", CAPTION))

story.append(Paragraph("8.2 Carbon Tax Escalation (15% Annual)", H2))
carbon_tax = [
    ['Year', 'Air-Side Econ.', 'Evaporative', 'Chilled Water'],
    ['Year 1', '$27,710', '$8,270', '$20,117'],
    ['Year 2', '$31,867', '$9,511', '$23,135'],
    ['Year 3', '$36,647', '$10,937', '$26,605'],
    ['Year 4', '$42,144', '$12,578', '$30,596'],
    ['Year 5', '$48,466', '$14,465', '$35,185'],
    ['5-yr Total', '$186,834', '$55,761', '$135,638'],
]
story.append(tbl(carbon_tax, col_widths=[3*cm, 4.5*cm, 4.5*cm, 5*cm]))
story.append(Paragraph("Table 27: Carbon Tax Cost Projection (15% Annual Escalation, IPCC 2030)", CAPTION))

story.append(Paragraph("8.3 Water Stress Assessment", H2))
water_stress = [
    ['Technique', 'Annual Water (L)', 'WUE', 'Phoenix Risk'],
    ['Air-Side Economizer', '0', '0.0', 'None'],
    ['Evaporative (IEC)', '0', '0.0', 'None'],
    ['Chilled Water', '515,331', '1.786', 'HIGH - Water Penalty Applied'],
]
story.append(tbl(water_stress, col_widths=[4.5*cm, 3.5*cm, 3*cm, 6*cm]))
story.append(Paragraph("Table 28: Water Stress Assessment by Technique and Region", CAPTION))
story.append(PageBreak())

# ---- SECTION 9: DISCUSSION & CONCLUSIONS ----
story.append(Paragraph("9. Discussion and Conclusions", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("9.1 Key Findings", H2))
findings = [
    ("Evaporative Cooling achieves the best energy efficiency (PUE 1.002) and lowest operating "
     "cost ($20,523/yr) but fails thermal compliance for AI-density workloads. Rack inlet "
     "temperatures of 38.5 deg C exceed the ASHRAE Class A1 limit by 11.5 deg C, triggering "
     "aggressive CPU throttling."),
    ("Chilled Water is the only thermally compliant solution for high-density AI workloads. "
     "It maintains inlet temperatures within ASHRAE A2 limits (18-27 deg C) at all hours. "
     "However, its high CAPEX ($630,000) and water consumption (515,331 L/yr) are significant constraints."),
    ("Air-Side Economization is unsuitable as a standalone solution for AI workloads. All five "
     "racks exhibit airflow violations (required CFM 2-4x the per-rack limit), and the system's "
     "high carbon emissions (219,921 kg CO2/yr) result in a prohibitive carbon tax burden ($27,710/yr)."),
    ("The ML recommender correctly identifies Chilled Water as the highest-scoring technique "
     "(0.930) when thermal compliance is weighted as a hard constraint, despite Evaporative "
     "having better energy and cost metrics."),
    ("Carbon tax escalation disproportionately penalises Air-Side Economization. Over 5 years, "
     "its cumulative carbon tax ($186,834) is 3.4x higher than Evaporative ($55,761)."),
]
for i, f in enumerate(findings, 1):
    story.append(Paragraph(f"<b>{i}.</b> {f}", BODY))
    story.append(Spacer(1, 0.2*cm))

story.append(Paragraph("9.2 Recommended Hybrid Strategy", H2))
story.append(Paragraph(
    "Based on the simulation results, a hybrid Evaporative + Chilled Water configuration is recommended:", BODY))
for rec in [
    "Deploy evaporative pre-cooling to reduce condenser water temperature entering the chiller.",
    "Use chilled water as the primary cooling loop to guarantee ASHRAE compliance.",
    "This hybrid approach can achieve PUE ~1.05-1.10 while maintaining full thermal compliance.",
    "Estimated water savings: 30-40% vs. standalone chilled water.",
]:
    story.append(Paragraph(f"• {rec}", NOTE))

story.append(Paragraph("9.3 Limitations", H2))
for lim in [
    "The chilled water COP of 1.0 is conservative; real-world systems achieve COP 4-6 at part load.",
    "The evaporative simulation uses a constant ambient temperature (25 deg C) rather than TMY3 data.",
    "Air-side economizer results use TMY3 weather data but a simplified constant COP = 3.0 for mechanical backup.",
    "All simulations assume a single-zone data centre; multi-zone hot/cold aisle containment would improve all results.",
]:
    story.append(Paragraph(f"• {lim}", NOTE))

story.append(Paragraph("9.4 Future Work", H2))
for fw in [
    "Implement enthalpy-based economiser control (replacing dry-bulb/RH decision tree).",
    "Integrate real EIR part-load curves from manufacturer datasheets for chiller modelling.",
    "Extend the ML recommender to include hybrid configurations as candidate solutions.",
    "Validate simulation results against real data centre measurements (ASHRAE TC 9.9 benchmarks).",
    "Model multi-site deployment across Phoenix, Miami, Denver, and Seattle using full TMY3 datasets.",
]:
    story.append(Paragraph(f"• {fw}", NOTE))
story.append(PageBreak())

# ---- APPENDIX ----
story.append(Paragraph("Appendix A: Governing Equations Reference", H1))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(HDR_DARK)))
story.append(Spacer(1, 0.3*cm))
eq_data = [
    ['Equation', 'Formula', 'Used In'],
    ['Heat Balance', 'C_total * dT/dt = Q_IT - Q_cooling', 'All three'],
    ['Airflow Requirement', 'V_req = (P_IT_kW x 3160) / (rho x Cp x delta_T)', 'Air-Side, Evap'],
    ['DEC Supply Temp', 'T_supply = T_db - eta x (T_db - T_wb)', 'Evaporative'],
    ['Fan Power', 'P_fan = V_CFM x W/CFM x f_filter', 'Air-Side, Evap'],
    ['Mechanical Cooling', 'P_mech = Q_mech / COP', 'Air-Side, Chilled W'],
    ['Affinity Law', 'P proportional to speed^3', 'Chilled Water'],
    ['PUE', 'PUE = P_total / P_IT', 'All three'],
    ['CUE', 'CUE = (P_total x CI) / P_IT', 'All three'],
    ['WUE', 'WUE = m_dot_water / P_IT', 'Chilled Water'],
    ['Throttling', 'Phi_adj = Phi_base x (1 - gamma x delta_T)', 'All three'],
    ['NPV', 'NPV = sum(R_t / (1+i)^t) for t=1..15', 'All three'],
    ['Workload Model', 'U(t) = [U_diurnal(t) x M_AI] + sigma(t)', 'All three'],
    ['UPS Efficiency', 'eta = -0.05u^2 + 0.1u + 0.94', 'All three'],
]
story.append(tbl(eq_data, col_widths=[4*cm, 7*cm, 6*cm]))
story.append(Paragraph("Table A1: Complete Governing Equations Used Across All Three Simulations", CAPTION))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph(
    "Constants: rho = 1.2 kg/m3, Cp = 1.006 kJ/(kg.K), Lv = 2,260 kJ/kg, "
    "i = 0.0971 (discount rate), gamma = 0.05/deg C (27-29 deg C range), "
    "gamma = 0.10/deg C (29-32 deg C range).", NOTE))

# ---- BUILD ----
doc.build(story)
print(f"PDF generated: {OUTPUT}")
