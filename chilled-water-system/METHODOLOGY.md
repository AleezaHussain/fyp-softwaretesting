Building a dynamic frontend for a 15,000-line engineering tool requires a balance between **comprehensive data entry** and **user experience**. Since you're dealing with high-fidelity physics, you can't simplify the inputs too much, but you can categorize them to avoid overwhelming the user.

Given your typical workflow with **Next.js** and **Tailwind CSS**, I recommend a **stepper-based UI** (Phase 1 through Phase 5).

Here is a breakdown of the essential inputs you should collect to make the model fully dynamic:

---

### 1. Site & Environmental Configuration (The "Where")

This section defines the external stresses on the chilled water system.

* **Weather Data (File Upload):** A drag-and-drop zone for `.epw` (EnergyPlus) or `.csv` files.
* **Climate Scenario (Dropdown):** Options for "Historical (Current)," "RCP 4.5 (2050)," and "RCP 8.5 (2050)."
* **Site Altitude:** Elevation in meters (critical for air density calculations in your physics engine).

### 2. IT Infrastructure & Workload (The "Heat Source")

This maps directly to your CloudSim Plus integration.

* **Hardware Scale:** Number of Racks and Servers per Rack.
* **Power Profile:** Idle Power (W) vs. Max Power (W) per server.
* **Workload Type (Preset):** A toggle for **AI Training**, **Inference**, or **Enterprise**. This should automatically adjust the "Refresh Cycle" (3 vs. 5 years) and "Throttling Penalty" in the backend.
* **Utilization Curve:** A slider or mini-graph where users can set average CPU utilization (e.g., 80%).

### 3. Mechanical System Specs (The "Cooling")

This allows users to test different hardware efficiencies.

* **Chiller Reference COP:** (e.g., 6.0).
* **EIR Coefficients:** Provide a "Default" button, but allow advanced users to input the 6-curve coefficients [$a, b, c, d, e, f$] from manufacturer datasheets.
* **Water Loop Temps:** Setpoints for Chilled Water Supply ($T_{chw}$) and Return.
* **Fouling Factor:** Initial state of the system (1.0 for new, higher for aged).

### 4. Economic & ESG Factors (The "Impact")

* **Electricity Tariff:** Base rate ($/kWh) and a toggle for "Time-of-Use" pricing.
* **Carbon Intensity:** Local grid factor (kg $CO_2/kWh$).
* **Carbon Tax Projection:** Starting price and annual escalation rate (%).
* **Refrigerant Type:** Dropdown (e.g., R-134a) which maps to a Global Warming Potential (GWP) value in your code.

---

## Suggested Frontend Architecture

To keep this clean in Next.js, I suggest organizing your inputs into a configuration object that matches your Java `EdgeDataCenterScenario` class:

| Category | Component Suggestion | Data Mapping |
| --- | --- | --- |
| **Project Info** | Simple Text Inputs | `locationName`, `clientName` |
| **Physical Limits** | Range Sliders | `maxInletTempC`, `maxDewPointC` |
| **Energy** | Number Inputs | `electricityRate`, `upsLossFraction` |
| **Files** | `react-dropzone` | `weatherDataFile` |

### Pro-Tip: The "Quick-Start" Templates

Since there are many variables, provide **three "Quick-Start" buttons**:

1. **"High-Performance AI"**: Pre-fills 100kW racks, 3-year refresh, and RCP 8.5 climate.
2. **"Green Enterprise"**: Pre-fills low density, high COP, and high Renewable Energy Factor (REF).
3. **"Edge Standard"**: Pre-fills your current default values.

### Next Step

Would you like me to write a **Next.js Form component** using Tailwind CSS that handles the **Workload preset logic** (switching between AI Training and Enterprise configurations)?