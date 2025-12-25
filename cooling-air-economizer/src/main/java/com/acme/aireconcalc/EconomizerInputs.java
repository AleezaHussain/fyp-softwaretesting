package com.acme.aireconcalc;

/**
 * All user-provided inputs (no APIs). Keep everything explicit & unit-tagged.
 */
public class EconomizerInputs {

    // Simulation horizon
    public double hours; // total simulation hours (e.g., 720 for a month)

    // IT load
    public double itAvgKW; // average IT load (kW) over the horizon
    public double itPUE_baseline; // baseline PUE (no economizer), e.g., 1.6
    public double baselineCOP; // baseline chiller COP for realistic calculation, e.g., 3.5

    // Airflow design + fan
    public double cfmPerKW; // rule of thumb airflow: e.g., 170 CFM/kW
    public double fan_W_per_CFM; // supply fan power density: e.g., 0.5 W/CFM (efficient), 1.0 old
    public double returnFan_W_per_CFM; // return fan power density: e.g., 0.4 W/CFM (typically lower than supply)
    public double supplyFanCount; // number of supply fans (for reporting only)
    public double returnFanCount; // number of return fans (for reporting only)

    // Filters (penalty on fan power)
    public double filterFanPenaltyFrac; // e.g., 0.08 = +8% fan energy due to MERV/ΔP

    // Dampers and pressure penalties
    public double damperPressurePenalty_Pa; // pressure drop across dampers (Pa)
    public double damperControlPower_kW; // actuator/control power for dampers (kW)
    public double reliefDamperEfficiency; // relief damper efficiency (0-1)

    // Economizer controls (simple thresholds you choose per climate)
    public double econHours; // hours fully in economizer (100% OA, no chiller)
    public double partialHours; // hours in integrated economizer (OA + a bit of mech)
    public double mechHours; // hours needing mechanical cooling only
    public double outsideAirFrac_partial; // 0..1 outside air fraction during partial hours

    // Mechanical cooling efficiency (when used)
    public double mechCOP; // chiller/DX COP (kWth_out per kWel_in), e.g., 3.0
    public double mechTrimFracAtPartial; // fraction of IT heat still handled by chiller during partial (e.g., 0.3)
    public double pumpPowerFrac; // CHW/CW pump power as fraction of mech cooling load (e.g., 0.04 = 4%)

    // Heating / Humidification (optional for very cold/dry climates)
    public double reheatKW; // kW of reheat when too cold (average during econHours)
    public double humidifierKW; // kW of humidifier when too dry (average during econHours)

    // Weather-dependent controls
    public double coldThreshold_C; // temperature below which reheat is needed (°C)
    public double dryThreshold_RH; // humidity below which humidification is needed (%)
    public double avgOutdoorTemp_C; // average outdoor temperature for simulation period
    public double avgOutdoorRH; // average outdoor relative humidity (%)
    public double reheatEfficiency; // reheat system efficiency (0-1)
    public double humidifierEfficiency; // humidifier system efficiency (0-1)

    // Optional evaporative assist (if you add pads/sprays) – set 0 if not used
    public double evapAssistKW; // kW for pumps/fans of evap section (when active)
    public double evapWater_L_per_kWhSensible; // liters of water per kWh of sensible cooling (adiabatic add) – set 0 if
                                               // none
    public double evapActiveHours; // hours you run evap assist (subset of econ/partial per your choice)

    // Air handling extras
    public double sensorMiscKW; // small constant auxiliaries: sensors/controls/actuators (kW average)

    // Grid + $ + CO2
    public double elecTariff_per_kWh; // e.g., PKR/kWh or USD/kWh
    public double grid_kgCO2_per_kWh; // grid emission factor kg CO2 / kWh

    // Supply/return air temperatures (for physics-based free cooling)
    public double supplyTemp_C; // supply air setpoint (°C)
    public double returnAirTemp_C; // estimate of return/exhaust air temperature (°C)

    // Air properties (defaults)
    public double airDensity_kg_per_m3 = 1.20; // typical air density at ~20°C
    public double cp_air_kJ_per_kgK = 1.005; // specific heat of dry air (kJ/kg·K)

    // CAPEX/OPEX for ROI
    public double capexEconomizerUSD; // upfront cost for economizer hardware + install
    public double annualOpexMaintUSD; // annual maintenance (filters, service)
    public double analysisHoursPerYear; // usually 8760; if simulating a month, still put 8760 for ROI normalization

    // Baseline fan power for comparison (optional): leave 0 to auto-compute from
    // cfmPerKW
    public double baselineFan_W_per_CFM; // older system e.g., 1.0 W/CFM (if 0, we’ll use fan_W_per_CFM as same)
}
