package com.acme.aireconcalc.cloudsim;

/**
 * Evaporative Cooling Model - Determines cooling mode and calculates thermal outputs
 * 
 * Implements three cooling modes:
 * - DEC (Direct Evaporative Cooling): Outdoor air passes through wetted media
 * - IEC (Indirect Evaporative Cooling): Heat exchanger with evaporative cooling
 * - DX (Direct Expansion): Mechanical refrigeration (chiller/CRAC)
 * 
 * Mode selection is based on:
 * - Outdoor temperature
 * - Relative humidity
 * - Wet bulb temperature
 * - Supply air temperature requirements (ASHRAE limits)
 */
public class EvaporativeCoolingModel {
    
    // ASHRAE thermal guidelines for data centers
    private static final double T_SUPPLY_TARGET = 18.0;  // Target supply air temperature (°C)
    private static final double T_SUPPLY_MAX = 27.0;     // Maximum allowable supply temperature (°C) - ASHRAE A2
    private static final double T_RETURN = 30.0;         // Return air temperature (°C)
    
    // Evaporative cooling effectiveness (typical values)
    private static final double DEC_EFFECTIVENESS = 0.85;  // Direct evaporative: 80-90%
    private static final double IEC_EFFECTIVENESS = 0.70;  // Indirect evaporative: 65-75%
    
    // Water consumption rates (L/kWh of cooling)
    private static final double DEC_WATER_RATE = 4.5;  // Direct evaporative
    private static final double IEC_WATER_RATE = 3.0;  // Indirect evaporative
    private static final double DX_WATER_RATE = 0.5;   // DX (cooling tower makeup water)
    
    // Mode selection thresholds
    private static final double DEC_MAX_RH = 60.0;     // DEC works best below 60% RH
    private static final double IEC_MAX_RH = 80.0;     // IEC can work up to 80% RH
    
    private final PsychrometricCalculator psychro;
    
    public EvaporativeCoolingModel(PsychrometricCalculator psychro) {
        this.psychro = psychro;
    }
    
    /**
     * Determine optimal cooling mode based on ambient conditions
     * 
     * Decision logic:
     * 1. If T_DEC <= T_supply AND RH <= 60% → DEC (most efficient)
     * 2. Else if T_IEC <= T_supply AND RH <= 80% → IEC (good efficiency)
     * 3. Else → DX (mechanical cooling, always works)
     * 
     * @param t_db Outdoor dry bulb temperature (°C)
     * @param rh Outdoor relative humidity (%)
     * @param t_wb Outdoor wet bulb temperature (°C)
     * @return Cooling mode: "DEC", "IEC", or "DX"
     */
    public String determineMode(double t_db, double rh, double t_wb) {
        // Calculate achievable outlet temperatures for each mode
        double t_dec = calculateDECOutletTemp(t_db, t_wb);
        double t_iec = calculateIECOutletTemp(t_db, t_wb);
        
        // DEC: Best efficiency, but requires low humidity
        if (t_dec <= T_SUPPLY_TARGET && rh <= DEC_MAX_RH) {
            return "DEC";
        }
        
        // IEC: Good efficiency, works at higher humidity
        if (t_iec <= T_SUPPLY_TARGET && rh <= IEC_MAX_RH) {
            return "IEC";
        }
        
        // DX: Fallback to mechanical cooling
        return "DX";
    }
    
    /**
     * Calculate outlet temperature for Direct Evaporative Cooling (DEC)
     * 
     * DEC cools air by evaporating water directly into the airstream.
     * The air approaches the wet bulb temperature based on effectiveness.
     * 
     * T_out = T_db - effectiveness * (T_db - T_wb)
     * 
     * @param t_db Inlet dry bulb temperature (°C)
     * @param t_wb Inlet wet bulb temperature (°C)
     * @return Outlet temperature (°C)
     */
    public double calculateDECOutletTemp(double t_db, double t_wb) {
        return t_db - DEC_EFFECTIVENESS * (t_db - t_wb);
    }
    
    /**
     * Calculate outlet temperature for Indirect Evaporative Cooling (IEC)
     * 
     * IEC uses a heat exchanger where water evaporates on one side,
     * cooling the air on the other side without adding moisture.
     * 
     * T_out = T_db - effectiveness * (T_db - T_wb)
     * 
     * @param t_db Inlet dry bulb temperature (°C)
     * @param t_wb Inlet wet bulb temperature (°C)
     * @return Outlet temperature (°C)
     */
    public double calculateIECOutletTemp(double t_db, double t_wb) {
        return t_db - IEC_EFFECTIVENESS * (t_db - t_wb);
    }
    
    /**
     * Calculate outlet temperature for the selected cooling mode
     * PHASE 1 ENHANCEMENT: Supports velocity-dependent effectiveness adjustment
     * 
     * @param t_db Outdoor dry bulb temperature (°C)
     * @param t_wb Outdoor wet bulb temperature (°C)
     * @param mode Cooling mode ("DEC", "IEC", or "DX")
     * @param velocityAdjustmentFactor Effectiveness adjustment based on face velocity (0.5-1.0)
     * @return Outlet temperature (°C)
     */
    public double calculateOutletTemp(double t_db, double t_wb, String mode, double velocityAdjustmentFactor) {
        double baseOutletTemp;
        
        switch (mode) {
            case "DEC":
                // Apply velocity adjustment to DEC effectiveness
                double adjustedDECEffectiveness = DEC_EFFECTIVENESS * velocityAdjustmentFactor;
                baseOutletTemp = t_db - adjustedDECEffectiveness * (t_db - t_wb);
                break;
            case "IEC":
                // Apply velocity adjustment to IEC effectiveness
                double adjustedIECEffectiveness = IEC_EFFECTIVENESS * velocityAdjustmentFactor;
                baseOutletTemp = t_db - adjustedIECEffectiveness * (t_db - t_wb);
                break;
            case "DX":
                // DX can achieve any target temperature (mechanical cooling)
                baseOutletTemp = T_SUPPLY_TARGET;
                break;
            default:
                baseOutletTemp = T_SUPPLY_TARGET;
        }
        
        return baseOutletTemp;
    }
    
    /**
     * Calculate outlet temperature for the selected cooling mode (backward compatibility)
     * 
     * @param t_db Outdoor dry bulb temperature (°C)
     * @param t_wb Outdoor wet bulb temperature (°C)
     * @param mode Cooling mode ("DEC", "IEC", or "DX")
     * @return Outlet temperature (°C)
     */
    public double calculateOutletTemp(double t_db, double t_wb, String mode) {
        return calculateOutletTemp(t_db, t_wb, mode, 1.0); // Default: no velocity adjustment
    }
    
    /**
     * Calculate water consumption for cooling
     * PHASE 1 ENHANCEMENT: Supports velocity-dependent effectiveness adjustment
     * 
     * Water usage varies by mode:
     * - DEC: Highest (water evaporates directly into airstream)
     * - IEC: Moderate (water evaporates in heat exchanger)
     * - DX: Lowest (only cooling tower makeup water)
     * 
     * @param itLoadKW IT load in kW (heat to be removed)
     * @param mode Cooling mode ("DEC", "IEC", or "DX")
     * @param velocityAdjustmentFactor Effectiveness adjustment based on face velocity (0.5-1.0)
     * @return Water consumption (liters per time step)
     */
    public double calculateWaterUsage(double itLoadKW, String mode, double velocityAdjustmentFactor) {
        double waterRate;
        
        switch (mode) {
            case "DEC":
                waterRate = DEC_WATER_RATE;
                break;
            case "IEC":
                waterRate = IEC_WATER_RATE;
                break;
            case "DX":
                waterRate = DX_WATER_RATE;
                break;
            default:
                waterRate = DX_WATER_RATE;
        }
        
        // Apply velocity adjustment to water consumption
        // Lower effectiveness = less evaporation = less water usage
        double adjustedWaterRate = waterRate * velocityAdjustmentFactor;
        
        // Water consumption = IT Load (kW) * Water Rate (L/kWh) * Time Step (hours)
        // For hourly time steps, this simplifies to: IT Load * Water Rate
        return itLoadKW * adjustedWaterRate;
    }
    
    /**
     * Calculate water consumption for cooling (backward compatibility)
     * 
     * @param itLoadKW IT load in kW (heat to be removed)
     * @param mode Cooling mode ("DEC", "IEC", or "DX")
     * @return Water consumption (liters per time step)
     */
    public double calculateWaterUsage(double itLoadKW, String mode) {
        return calculateWaterUsage(itLoadKW, mode, 1.0); // Default: no velocity adjustment
    }
    
    /**
     * Check if cooling is adequate for the current conditions
     * 
     * Cooling is adequate if:
     * - Outlet temperature <= ASHRAE maximum (27°C for A2 class)
     * - System can handle the IT load
     * 
     * @param t_out Outlet temperature (°C)
     * @return true if cooling is adequate
     */
    public boolean isCoolingAdequate(double t_out) {
        return t_out <= T_SUPPLY_MAX;
    }
    
    /**
     * Calculate cooling capacity (kW) for evaporative cooling
     * 
     * Q = m_dot * Cp * (T_in - T_out)
     * 
     * @param airflowCFM Airflow rate (CFM)
     * @param t_in Inlet temperature (°C)
     * @param t_out Outlet temperature (°C)
     * @return Cooling capacity (kW)
     */
    public double calculateCoolingCapacity(double airflowCFM, double t_in, double t_out) {
        // Convert CFM to m³/s: CFM / 2118.88
        double airflowM3s = airflowCFM / 2118.88;
        
        // Air density (kg/m³) and specific heat (kJ/kg·K)
        double rho = 1.2;
        double cp = 1.006;
        
        // Q (kW) = rho * V * Cp * deltaT
        double deltaT = t_in - t_out;
        return rho * airflowM3s * cp * deltaT;
    }
    
    /**
     * Get cooling mode description
     * 
     * @param mode Cooling mode code
     * @return Human-readable description
     */
    public String getModeDescription(String mode) {
        switch (mode) {
            case "DEC":
                return "Direct Evaporative Cooling (85% effectiveness)";
            case "IEC":
                return "Indirect Evaporative Cooling (70% effectiveness)";
            case "DX":
                return "Direct Expansion (Mechanical Chiller)";
            default:
                return "Unknown Mode";
        }
    }
    
    /**
     * Get target supply temperature
     * 
     * @return Target supply temperature (°C)
     */
    public double getTargetSupplyTemp() {
        return T_SUPPLY_TARGET;
    }
    
    /**
     * Get maximum allowable supply temperature
     * 
     * @return Maximum supply temperature (°C)
     */
    public double getMaxSupplyTemp() {
        return T_SUPPLY_MAX;
    }
    
    @Override
    public String toString() {
        return String.format("EvaporativeCoolingModel[DEC=%.0f%%, IEC=%.0f%%, T_supply=%.1f°C]",
                           DEC_EFFECTIVENESS * 100, IEC_EFFECTIVENESS * 100, T_SUPPLY_TARGET);
    }
}
