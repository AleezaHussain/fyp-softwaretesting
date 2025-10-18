package org.cloudbus.cloudsim.chilledwater;

/**
 * Models gradual degradation (dirty filters, coil fouling, biofilm) and allows periodic maintenance resets.
 * Effects:
 *  - CRAH fan power multiplier increases over time (filters clogging).
 *  - Heat-exchanger effectiveness reduces → chiller sees higher effective load.
 */
public class MaintenanceDegradation {

    private double hoursSinceService = 0.0;

    // Growth rates per hour (very small); tune as needed.
    private double fanPowerRisePer1000h = 0.08;     // +8% per 1000h
    private double hxLossPer1000h = 0.02;           // -2% HX effectiveness per 1000h

    public void tickHour(){ hoursSinceService += 1.0; }

    /** Multiplier on CRAH fan power due to filter clogging. */
    public double fanPowerMultiplier(){
        double factor = 1.0 + fanPowerRisePer1000h * (hoursSinceService / 1000.0);
        return Math.min(1.30, factor); // cap at +30%
    }

    /** Multiplier on cooling load seen by chiller (worse HX effectiveness). */
    public double chillerLoadMultiplier(){
        double loss = hxLossPer1000h * (hoursSinceService / 1000.0);
        return Math.min(1.15, 1.0 + loss); // cap +15% load
    }

    /** Perform maintenance (filter change, coil cleaning, water treatment). */
    public void service() { hoursSinceService = 0.0; }

    // Tuners
    public void setFanPowerRisePer1000h(double v){ this.fanPowerRisePer1000h = v; }
    public void setHxLossPer1000h(double v){ this.hxLossPer1000h = v; }
}
