package com.acme.dccore;

public class ServerSpec {
    // Basic compute specifications
    private final int cores;
    private final int mipsPerCore;
    private final int ramMb;
    private final long storageMb;

    // Power characteristics
    private final double maxPowerW; // max watts at 100% load
    private final double idlePowerW; // watts at 0% load
    private final double psuEfficiency; // PSU efficiency (0-1)
    private final boolean dualPSU; // PSU redundancy
    private final double psuOverhead; // Extra power due to dual PSU (0-1)

    // Thermal behavior
    private final double maxAirflowCFM; // airflow requirement at full load
    private final double deltaT_C; // temperature rise across server (°C)
    private final double maxInletTemp_C; // maximum safe inlet temperature
    private final double minInletTemp_C; // minimum safe inlet temperature
    private final double thermalDesignPower; // TDP for thermal calculations

    // Fan system
    private final double fanPowerPercent; // fan power as % of server power (5-15%)
    private final boolean variableFanSpeed; // VFD fan control capability
    private final double minFanSpeed; // minimum fan speed (0-1)

    // Physical form factor
    private final int uHeight; // rack units (1U, 2U, 4U, etc.)
    private final String formFactor; // "1U", "2U", "4U", "Blade"
    private final double depth_mm; // server depth in mm
    private final double width_mm; // server width in mm (typically 19" rack)

    public ServerSpec(int cores, int mipsPerCore, int ramMb, long storageMb,
            double maxPowerW, double idlePowerW, double psuEfficiency,
            boolean dualPSU, double psuOverhead, double maxAirflowCFM,
            double deltaT_C, double maxInletTemp_C, double minInletTemp_C,
            double thermalDesignPower, double fanPowerPercent,
            boolean variableFanSpeed, double minFanSpeed, int uHeight,
            String formFactor, double depth_mm, double width_mm) {
        this.cores = cores;
        this.mipsPerCore = mipsPerCore;
        this.ramMb = ramMb;
        this.storageMb = storageMb;
        this.maxPowerW = maxPowerW;
        this.idlePowerW = idlePowerW;
        this.psuEfficiency = psuEfficiency;
        this.dualPSU = dualPSU;
        this.psuOverhead = psuOverhead;
        this.maxAirflowCFM = maxAirflowCFM;
        this.deltaT_C = deltaT_C;
        this.maxInletTemp_C = maxInletTemp_C;
        this.minInletTemp_C = minInletTemp_C;
        this.thermalDesignPower = thermalDesignPower;
        this.fanPowerPercent = fanPowerPercent;
        this.variableFanSpeed = variableFanSpeed;
        this.minFanSpeed = minFanSpeed;
        this.uHeight = uHeight;
        this.formFactor = formFactor;
        this.depth_mm = depth_mm;
        this.width_mm = width_mm;
    }

    // Basic getters
    public int getCores() {
        return cores;
    }

    public int getMipsPerCore() {
        return mipsPerCore;
    }

    public int getRamMb() {
        return ramMb;
    }

    public long getStorageMb() {
        return storageMb;
    }

    // Power getters
    public double getMaxPowerW() {
        return maxPowerW;
    }

    public double getIdlePowerW() {
        return idlePowerW;
    }

    public double getPsuEfficiency() {
        return psuEfficiency;
    }

    public boolean isDualPSU() {
        return dualPSU;
    }

    public double getPsuOverhead() {
        return psuOverhead;
    }

    // Thermal getters
    public double getMaxAirflowCFM() {
        return maxAirflowCFM;
    }

    public double getDeltaT_C() {
        return deltaT_C;
    }

    public double getMaxInletTemp_C() {
        return maxInletTemp_C;
    }

    public double getMinInletTemp_C() {
        return minInletTemp_C;
    }

    public double getThermalDesignPower() {
        return thermalDesignPower;
    }

    // Fan system getters
    public double getFanPowerPercent() {
        return fanPowerPercent;
    }

    public boolean isVariableFanSpeed() {
        return variableFanSpeed;
    }

    public double getMinFanSpeed() {
        return minFanSpeed;
    }

    // Physical getters
    public int getUHeight() {
        return uHeight;
    }

    public String getFormFactor() {
        return formFactor;
    }

    public double getDepth_mm() {
        return depth_mm;
    }

    public double getWidth_mm() {
        return width_mm;
    }

    // Calculated properties
    public double getExhaustTemp_C(double inletTemp_C) {
        return inletTemp_C + deltaT_C;
    }

    public double getActualPowerWithPSU(double serverPowerW) {
        double psuLoss = serverPowerW * (1.0 - psuEfficiency) / psuEfficiency;
        double redundancyOverhead = dualPSU ? serverPowerW * psuOverhead : 0.0;
        return serverPowerW + psuLoss + redundancyOverhead;
    }

    public double getFanPowerW(double serverUtilization) {
        double baseFanPower = maxPowerW * (fanPowerPercent / 100.0);
        if (variableFanSpeed) {
            double fanSpeedRatio = minFanSpeed + (1.0 - minFanSpeed) * serverUtilization;
            return baseFanPower * Math.pow(fanSpeedRatio, 3); // Fan power ∝ speed³
        } else {
            return baseFanPower; // Constant speed fans
        }
    }

    public double getAirflowCFM(double serverUtilization) {
        return maxAirflowCFM * (0.3 + 0.7 * serverUtilization); // Minimum 30% airflow
    }

    public double getExhaustTempC(double inletTempC, double serverUtilization) {
        return inletTempC + (deltaT_C * serverUtilization); // Temperature rise based on utilization
    }
}
