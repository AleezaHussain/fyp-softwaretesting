package com.acme.unified;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.chilledwatersystem.SimConfig;

/** Adapter that wraps the AirEconomizerModel for hourly simulation in the unified runner. */
public class AirEconomizerAdapter implements CoolingTechnique {
    private final AirEconomizerModel model;
    private final EconomizerInputs template;
    private double totalWaterL = 0.0;

    public AirEconomizerAdapter(int scaleFactorOrIgnored) {
        this.model = new AirEconomizerModel();
        this.template = new EconomizerInputs();
        // sensible defaults (aligned with demo knobs in App.java)
        this.template.cfmPerKW = 350.0;
        this.template.fan_W_per_CFM = 0.35;
        this.template.returnFan_W_per_CFM = 0.28;
        this.template.filterFanPenaltyFrac = 0.10;
        this.template.mechCOP = 3.0;
        this.template.pumpPowerFrac = 0.04;
        this.template.reheatKW = 0.0;
        this.template.humidifierKW = 0.0;
        this.template.evapAssistKW = 0.0;
        this.template.evapWater_L_per_kWhSensible = 0.0;
        this.template.sensorMiscKW = 0.2;
        this.template.itPUE_baseline = 1.35;
        // tariff and CO2 are handled by UnifiedSimulationRunner; set a placeholder
        this.template.elecTariff_per_kWh = 0.10;
        this.template.grid_kgCO2_per_kWh = 0.45;
        this.template.hours = 1.0; // hourly runs by default
        // damper defaults
        this.template.damperControlPower_kW = 0.0;
        this.template.damperPressurePenalty_Pa = 0.0;
    }

    @Override
    public String getName() { return "AirEconomizer"; }

    @Override
    public double simulateHour(double itLoadKW, double ambientC, double wetBulbC, int hour) {
        // Copy template into a fresh inputs object for this hour
        EconomizerInputs in = new EconomizerInputs();
        // shallow copy relevant fields
        in.cfmPerKW = template.cfmPerKW;
        in.fan_W_per_CFM = template.fan_W_per_CFM;
        in.returnFan_W_per_CFM = template.returnFan_W_per_CFM;
        in.filterFanPenaltyFrac = template.filterFanPenaltyFrac;
        in.mechCOP = template.mechCOP;
        in.pumpPowerFrac = template.pumpPowerFrac;
        in.reheatKW = template.reheatKW;
        in.humidifierKW = template.humidifierKW;
        in.evapAssistKW = template.evapAssistKW;
        in.evapWater_L_per_kWhSensible = template.evapWater_L_per_kWhSensible;
        in.sensorMiscKW = template.sensorMiscKW;
        in.itPUE_baseline = template.itPUE_baseline;
        in.damperControlPower_kW = template.damperControlPower_kW;
        in.damperPressurePenalty_Pa = template.damperPressurePenalty_Pa;

        // Hour-specific values
        in.itAvgKW = itLoadKW;
        in.hours = 1.0;
    in.avgOutdoorTemp_C = ambientC;
    // More accurate psychrometric conversion: use Magnus formula for saturation
    // vapor pressure and the wet-bulb relation to get actual vapor pressure.
    double T = ambientC;
    double Tw = wetBulbC;

    // Saturation vapor pressure (Pa) using Magnus constants (over water)
    double es_T = 610.78 * Math.exp((17.2694 * T) / (T + 238.3));
    double es_Tw = 610.78 * Math.exp((17.2694 * Tw) / (Tw + 238.3));

    // Psychrometric constant (Pa/°C) approximation - uses barometric pressure
    double P_pa = 101325.0; // sea-level standard pressure in Pa
    // psychrometric constant (approx): gamma = cp_air * P / (0.622 * L_v)
    // use L_v ~ 2.501e6 J/kg, cp_air ~ 1005 J/kgK
    double gamma_pa = (1005.0 * P_pa) / (0.622 * 2.501e6); // ~0.065 Pa/°C

    // Use the wet-bulb relation: e = es(Tw) - gamma * P * (T - Tw)
    // Here es_Tw and es_T are in Pa, gamma_pa in Pa/°C
    double e_act = es_Tw - gamma_pa * (T - Tw);
    // Convert to relative humidity
    double rh = 100.0 * (e_act / es_T);
    if (Double.isNaN(rh) || rh < 0.0) rh = 0.0;
    if (rh > 100.0) rh = 100.0;
    in.avgOutdoorRH = rh;

    // Also compute outdoor enthalpy for potential future use (kJ/kg)
    // h = cp_air * T + W * (hfg + cp_vapor * T)
    double e_hPa = e_act / 100.0; // not used directly, kept for clarity

        // Simple mode selection based on ambient temp (keeps behavior similar to demo)
        if (ambientC < 15.0) {
            in.econHours = 1.0; in.partialHours = 0.0; in.mechHours = 0.0; in.outsideAirFrac_partial = 1.0; in.mechTrimFracAtPartial = 0.0;
        } else if (ambientC < 25.0) {
            in.econHours = 0.3; in.partialHours = 0.5; in.mechHours = 0.2; in.outsideAirFrac_partial = 0.6; in.mechTrimFracAtPartial = 0.4;
        } else {
            in.econHours = 0.0; in.partialHours = 0.2; in.mechHours = 0.8; in.outsideAirFrac_partial = 0.2; in.mechTrimFracAtPartial = 0.8;
        }

        // supply/return temps
        in.supplyTemp_C = 24.0;
        in.returnAirTemp_C = Math.max(in.supplyTemp_C + 6.0, ambientC + 8.0);

        AirEconomizerModel.Result r = model.compute(in);
        // model returns kWh totals for the specified horizon (hours=1), so use total_kWh as kW equivalent
        double coolingKW = r.total_kWh;
        totalWaterL += r.total_water_L;
        return coolingKW;
    }

    @Override
    public double getTotalWaterL() { return totalWaterL; }
}
