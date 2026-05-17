package com.acme.aireconcalc.cloudsim;

import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.power.models.PowerModelHost;
import java.util.List;

/**
 * Thermal Evaporative Host - Bridge between CloudSim electrical workload and thermal reality
 * 
 * This class extends CloudSim's HostSimple to integrate the AI Workload Methodology
 * with psychrometric calculations and evaporative cooling logic.
 * 
 * KEY FEATURES:
 * - Converts electrical power (Watts) to thermal load (temperature, water consumption)
 * - Applies psychrometric calculations (wet bulb, dew point, enthalpy)
 * - Determines optimal cooling mode (DEC/IEC/DX) based on ambient conditions
 * - Tracks water consumption and cooling adequacy
 * - Validates ASHRAE thermal guidelines compliance
 * 
 * INTEGRATION POINTS:
 * - Step 1 (AIWorkloadPowerModel): Provides dynamic power consumption
 * - Step 2 (This class): Converts power to thermal reality
 * - Step 3 (Future): Datacenter-level carbon accounting and OPEX projections
 */
public class ThermalEvaporativeHost extends HostSimple {
    
    // Methodology components
    private final PsychrometricCalculator psychro;
    private final EvaporativeCoolingModel coolingModel;
    private final WeatherService weatherService;
    
    // Thermal state variables (updated each simulation step)
    private double currentOutletTemp;        // Current outlet air temperature (°C)
    private double currentWetBulbTemp;       // Current wet bulb temperature (°C)
    private double currentDewPointTemp;      // Current dew point temperature (°C)
    private String currentCoolingMode;       // Current cooling mode (DEC/IEC/DX)
    private double waterConsumedThisStep;    // Water consumed in current step (liters)
    private double totalWaterConsumed;       // Cumulative water consumption (liters)
    private boolean coolingAdequate;         // Is cooling adequate for current load?
    
    // Thermal tracking
    private double totalThermalEnergy;       // Cumulative thermal energy (kWh)
    private int thermalViolations;           // Count of thermal violations (T_out > 27°C)
    
    /**
     * Create Thermal Evaporative Host
     * 
     * @param ram RAM capacity (MB)
     * @param bw Bandwidth capacity (Mbps)
     * @param storage Storage capacity (MB)
     * @param peList List of Processing Elements (CPU cores)
     */
    public ThermalEvaporativeHost(long ram, long bw, long storage, List<Pe> peList) {
        super(ram, bw, storage, peList);
        
        // Initialize methodology components
        this.psychro = new PsychrometricCalculator();
        this.coolingModel = new EvaporativeCoolingModel(psychro);
        this.weatherService = WeatherService.getInstance();
        
        // Initialize state - use dynamic temperature based on weather
        this.currentOutletTemp = 20.0;  // Initial temperature (will be updated by weather service)
        this.currentCoolingMode = "DX";
        this.waterConsumedThisStep = 0.0;
        this.totalWaterConsumed = 0.0;
        this.coolingAdequate = true;
        this.totalThermalEnergy = 0.0;
        this.thermalViolations = 0;
    }
    
    /**
     * Update energy consumption with thermal integration
     * 
     * This is the heart of Step 2. We override the update method to include thermal logic:
     * 1. Get power from AIWorkloadPowerModel (Step 1)
     * 2. Fetch ambient conditions from WeatherService
     * 3. Calculate wet bulb temperature (Stull 2011)
     * 4. Determine cooling mode (DEC/IEC/DX)
     * 5. Calculate outlet temperature and water consumption
     * 6. Validate cooling adequacy (ASHRAE compliance)
     * 
     * @param timeStep Time step duration (seconds)
     * @return Energy consumed in this time step (Watt-seconds)
     */
    @Override
    public double updateProcessing(double time) {
        // Update weather service time
        weatherService.updateTime(time);
        
        // Call parent to update VM processing and get power consumption
        double result = super.updateProcessing(time);
        
        // Perform thermal calculations
        updateThermalState(time);
        
        return result;
    }
    
    /**
     * Update thermal state based on current power consumption and ambient conditions
     * PHASE 1 INTEGRATION: Dynamic physics with fan affinity laws, velocity-dependent effectiveness, and thermal mass
     * 
     * @param time Current simulation time (seconds)
     */
    private void updateThermalState(double time) {
        // A. Get power from AIWorkloadPowerModel (Step 1)
        double powerWatts = getPowerModel().getPower(getCpuPercentUtilization());
        double itLoadKW = powerWatts / 1000.0;
        
        // B. Fetch ambient conditions from WeatherService
        double t_db = weatherService.getCurrentTemp();
        double rh = weatherService.getCurrentRH();
        
        // C. Apply Methodology: Calculate Wet Bulb (Stull 2011)
        this.currentWetBulbTemp = psychro.calculateWetBulb(t_db, rh);
        this.currentDewPointTemp = psychro.calculateDewPoint(t_db, rh);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 1: FAN AFFINITY LAWS - Calculate required airflow based on IT load
        // ═══════════════════════════════════════════════════════════════════════════
        double deltaT_target = 15.0; // Target temperature rise across servers (°C)
        double requiredCFM = (itLoadKW * 3160) / (deltaT_target * 1.08);
        double maxAirflowCapacity = 15000.0; // CFM (configurable per host)
        double speedRatio = Math.min(1.0, requiredCFM / maxAirflowCapacity);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 2: VELOCITY-DEPENDENT SATURATION EFFECTIVENESS
        // ═══════════════════════════════════════════════════════════════════════════
        double referenceFaceVelocity = 2.0; // m/s (typical for evaporative media)
        double currentFaceVelocity = referenceFaceVelocity * speedRatio;
        
        // Adjust cooling effectiveness based on velocity
        double velocityAdjustmentFactor = 1.0;
        if (currentFaceVelocity > referenceFaceVelocity) {
            velocityAdjustmentFactor = 1.0 - 0.05 * (currentFaceVelocity - referenceFaceVelocity);
            velocityAdjustmentFactor = Math.max(0.5, velocityAdjustmentFactor);
        }
        
        // D. Decision Logic: Choose Mode (DEC/IEC/DX) with velocity-adjusted effectiveness
        this.currentCoolingMode = coolingModel.determineMode(t_db, rh, currentWetBulbTemp);
        
        // E. Calculate Outputs: Outlet Temperature with velocity adjustment
        this.currentOutletTemp = coolingModel.calculateOutletTemp(t_db, currentWetBulbTemp, 
                                                                  currentCoolingMode, velocityAdjustmentFactor);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 3: DYNAMIC DX COP DEGRADATION (if using DX mode)
        // ═══════════════════════════════════════════════════════════════════════════
        double dynamicCOP = 3.5; // Nominal COP
        if ("DX".equals(currentCoolingMode)) {
            // COP degrades ~2.5% per degree C above 25°C
            double T_REFERENCE = 25.0;
            double DEGRADATION_FACTOR = 0.025;
            double tempDelta = t_db - T_REFERENCE;
            dynamicCOP = 3.5 * (1.0 - DEGRADATION_FACTOR * tempDelta);
            dynamicCOP = Math.max(2.0, Math.min(5.0, dynamicCOP));
        }
        
        // Calculate water usage with velocity-adjusted effectiveness
        this.waterConsumedThisStep = coolingModel.calculateWaterUsage(itLoadKW, currentCoolingMode, 
                                                                      velocityAdjustmentFactor);
        
        // F. Accumulate totals (convert time step from seconds to hours)
        double timeStepHours = 1.0 / 3600.0; // Assuming frequent updates
        this.totalWaterConsumed += waterConsumedThisStep * timeStepHours;
        this.totalThermalEnergy += itLoadKW * timeStepHours;
        
        // G. Validate cooling adequacy (ASHRAE compliance)
        this.coolingAdequate = coolingModel.isCoolingAdequate(currentOutletTemp);
        
        if (!coolingAdequate) {
            thermalViolations++;
        }
    }
    
    /**
     * Check if cooling is adequate for current load
     * 
     * Cooling is adequate if outlet temperature <= 27°C (ASHRAE A2 limit)
     * 
     * @return true if cooling is adequate
     */
    public boolean isCoolingAdequate() {
        return coolingAdequate;
    }
    
    /**
     * Get current outlet air temperature
     * 
     * @return Outlet temperature (°C)
     */
    public double getCurrentOutletTemp() {
        return currentOutletTemp;
    }
    
    /**
     * Get current wet bulb temperature
     * 
     * @return Wet bulb temperature (°C)
     */
    public double getCurrentWetBulbTemp() {
        return currentWetBulbTemp;
    }
    
    /**
     * Get current dew point temperature
     * 
     * @return Dew point temperature (°C)
     */
    public double getCurrentDewPointTemp() {
        return currentDewPointTemp;
    }
    
    /**
     * Get current cooling mode
     * 
     * @return Cooling mode ("DEC", "IEC", or "DX")
     */
    public String getCurrentCoolingMode() {
        return currentCoolingMode;
    }
    
    /**
     * Get water consumed in current time step
     * 
     * @return Water consumption (liters)
     */
    public double getWaterConsumedThisStep() {
        return waterConsumedThisStep;
    }
    
    /**
     * Get total water consumed since simulation start
     * 
     * @return Total water consumption (liters)
     */
    public double getTotalWaterConsumed() {
        return totalWaterConsumed;
    }
    
    /**
     * Get total thermal energy generated
     * 
     * @return Total thermal energy (kWh)
     */
    public double getTotalThermalEnergy() {
        return totalThermalEnergy;
    }
    
    /**
     * Get number of thermal violations (T_out > 27°C)
     * 
     * @return Count of violations
     */
    public int getThermalViolations() {
        return thermalViolations;
    }
    
    /**
     * Get psychrometric calculator
     * 
     * @return PsychrometricCalculator instance
     */
    public PsychrometricCalculator getPsychrometricCalculator() {
        return psychro;
    }
    
    /**
     * Get evaporative cooling model
     * 
     * @return EvaporativeCoolingModel instance
     */
    public EvaporativeCoolingModel getCoolingModel() {
        return coolingModel;
    }
    
    /**
     * Get thermal state summary
     * 
     * @return Human-readable thermal state
     */
    public String getThermalStateSummary() {
        return String.format(
            "ThermalState[mode=%s, T_out=%.1f°C, T_wb=%.1f°C, water=%.2fL, adequate=%s]",
            currentCoolingMode, currentOutletTemp, currentWetBulbTemp,
            waterConsumedThisStep, coolingAdequate ? "YES" : "NO"
        );
    }
    
    @Override
    public String toString() {
        return String.format(
            "ThermalEvaporativeHost[id=%d, mode=%s, T_out=%.1f°C, violations=%d]",
            getId(), currentCoolingMode, currentOutletTemp, thermalViolations
        );
    }
}
