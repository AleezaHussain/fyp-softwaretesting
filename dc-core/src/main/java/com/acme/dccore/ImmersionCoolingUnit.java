package com.acme.dccore;

/**
 * Models liquid immersion cooling for a rack or datacenter.
 * Tracks coolant flow, heat transfer, pump/chiller energy, and control logic.
 */
public class ImmersionCoolingUnit {
    // Properties
    public double flowRate; // m^3/s
    public double fluidCp; // J/(kg*K)
    public double fluidDensity; // kg/m^3
    public double inletTemp; // deg C
    public double heatTransferCoeff;
    public double pumpEfficiency;
    public double chillerCOP;
    public double bathSetpoint;
    public double maxBathTemp;
    public double minBathTemp;
    public double bathTemp;
    public double tankHeatCapacityJPerK; // J/K bulk tank thermal capacitance
    public String coolantName = "water";
    // When simulating parallel flow across N hosts, set to N to avoid multiplying bath temp rise per host
    public double parallelSplitFactor = 1.0;

    public ImmersionCoolingUnit(double flowRate, double fluidCp, double fluidDensity, double inletTemp,
                                double heatTransferCoeff, double pumpEfficiency, double chillerCOP,
                                double bathSetpoint, double maxBathTemp, double minBathTemp) {
        this.flowRate = flowRate;
        this.fluidCp = fluidCp;
        this.fluidDensity = fluidDensity;
        this.inletTemp = inletTemp;
        this.heatTransferCoeff = heatTransferCoeff;
        this.pumpEfficiency = pumpEfficiency;
        this.chillerCOP = chillerCOP;
        this.bathSetpoint = bathSetpoint;
        this.maxBathTemp = maxBathTemp;
        this.minBathTemp = minBathTemp;
        this.bathTemp = inletTemp;
        this.tankHeatCapacityJPerK = 50_000.0; // default small tank; override per scenario
    }

    /**
     * Remove heat from a host and update bath temperature.
     * @param hostPowerW Host waste heat in watts
     * @param timestepSeconds Simulation timestep in seconds
     * @return Cooling energy used (J)
     */
    public double removeHeatFromHost(double hostPowerW, double timestepSeconds) {
        double Q = hostPowerW * timestepSeconds; // Joules added to bath
        double effectiveSplit = Math.max(1.0, parallelSplitFactor);
        double dT_bath = (tankHeatCapacityJPerK > 0) ? (Q / tankHeatCapacityJPerK) / effectiveSplit : 0.0;
        bathTemp += dT_bath;
        return Q;
    }

    /**
     * Compute pump power (W) for current flow rate.
     */
    public double computePumpPower() {
        // Simplified linear model
        return flowRate * 1000 / pumpEfficiency; // Example: 1000W per m^3/s
    }

    /**
     * Compute chiller power (W) if heat rejection needed.
     */
    public double computeChillerPower(double Q_total_W) {
        return Q_total_W / chillerCOP;
    }

    /**
     * Step simulation: update temps, control logic, energy accounting.
     */
    public void step(double time, double timestepSeconds) {
        // Control logic: adjust flow/chiller to maintain bathSetpoint
        if (bathTemp > bathSetpoint) {
            // Increase flow or turn on chiller
        }
        if (bathTemp > maxBathTemp) {
            // Trigger protection: throttle/migrate VMs
        }
        // Add more logic as needed
    }
}
