package org.cloudbus.cloudsim.chilledwater;

public class PumpSystem {
    private double efficiency = 0.8;

    /**
     * Calculate pump electrical power (kW) for a design flow rate and current IT load.
     * Uses affinity laws (power ∝ flow^3) and scales flow by the IT load fraction.
     *
     * @param designFlowLps design (maximum) flow in L/s
     * @param itLoadKW current IT heat in kW
     * @param designMaxLoadKW design IT load corresponding to designFlow (kW)
     * @return pump electrical power in kW
     */
    public double calculate(double designFlowLps, double itLoadKW, double designMaxLoadKW) {
        double deltaP = 100000; // Pa (design differential)
        double fraction = 0.0;
        if (designMaxLoadKW > 0) fraction = Math.max(0.05, Math.min(1.0, itLoadKW / designMaxLoadKW));

        // base (design) power at full flow
        double basePowerKW = (deltaP * designFlowLps / 1000.0) / (efficiency * 1000.0);

        // variable-speed pumping: power scales roughly with flow^3
        double actualPowerKW = basePowerKW * Math.pow(fraction, 3);
        return actualPowerKW;
    }
}
