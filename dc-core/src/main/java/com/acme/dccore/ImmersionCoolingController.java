package com.acme.dccore;

/**
 * Simple controller for immersion cooling: adjusts flow rate or chiller to maintain bath setpoint.
 */
public class ImmersionCoolingController {
    public double bathSetpoint;
    public double maxBathTemp;
    public double minBathTemp;

    public ImmersionCoolingController(double bathSetpoint, double maxBathTemp, double minBathTemp) {
        this.bathSetpoint = bathSetpoint;
        this.maxBathTemp = maxBathTemp;
        this.minBathTemp = minBathTemp;
    }

    /**
     * On/off control logic for cooling system.
     */
    public void control(ImmersionCoolingUnit unit) {
        if (unit.bathTemp > bathSetpoint) {
            // Increase flow or turn on chiller
        }
        if (unit.bathTemp > maxBathTemp) {
            // Trigger protection: throttle/migrate VMs
        }
        // Add more logic as needed
    }
}
