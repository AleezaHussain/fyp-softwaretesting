package org.cloudbus.cloudsim.chilledwater;

/**
 * Simple supervisory controller:
 * - Decides economizer/free-cooling availability based on wet-bulb & supply setpoint.
 * - Suggests CRAH fan speed fraction (0..1) using cubic-law vs IT load.
 * - Nudges chilled-water supply temp setpoint up/down within ASHRAE envelope to save energy.
 */
public class SmartController {

    private double minSupplyAirC = 18.0;  // ASHRAE recommended server inlet lower bound
    private double maxSupplyAirC = 27.0;  // upper bound to stay energy efficient yet safe
    private double chwSupplySetC = 12.0;  // chilled-water supply nominal (can be “warm” strategy)
    private double chwMaxSetC = 18.0;     // allow raising setpoint for efficiency/free cooling
    private double chwMinSetC = 7.0;      // traditional colder water if needed

    public static class Decision {
        public boolean economizerOn;
        public double crahFanFrac;   // 0..1
        public double chwSupplySetC; // new CHW set
    }

    /** Compute an hour's control decisions. */
    public Decision decide(double itLoadKW, double wetBulbC, double currentInletAirC) {
        Decision d = new Decision();

        // Economizer: permit if wet-bulb is sufficiently below CHW set (simple heuristic)
        d.economizerOn = (wetBulbC + 3.0) <= chwSupplySetC;

        // CRAH fan fraction: scale with IT load up to a nominal capacity (500 kW reference)
        double frac = Math.max(0.15, Math.min(1.0, itLoadKW / 500.0));
        d.crahFanFrac = frac;

        // Adaptive CHW setpoint: if inlet air comfortably < max, raise CHW; if close to max, lower a bit
        if (currentInletAirC < (maxSupplyAirC - 2.0)) {
            chwSupplySetC = Math.min(chwMaxSetC, chwSupplySetC + 0.5);
        } else if (currentInletAirC > maxSupplyAirC) {
            chwSupplySetC = Math.max(chwMinSetC, chwSupplySetC - 0.5);
        }
        d.chwSupplySetC = chwSupplySetC;
        return d;
    }

    // Tuners
    public void setChwMaxSetC(double v){ this.chwMaxSetC = v; }
    public void setChwMinSetC(double v){ this.chwMinSetC = v; }
    public void setChwSupplySetC(double v){ this.chwSupplySetC = v; }
}
