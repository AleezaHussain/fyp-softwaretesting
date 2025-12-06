package com.acme.unified;

/** Basic interface for a cooling technique adapter. */
public interface CoolingTechnique {
    String getName();

    /**
     * Simulate one hourly step and return the cooling electrical power in kW.
     * Implementations may also update internal water use counters.
     */
    double simulateHour(double itLoadKW, double ambientC, double wetBulbC, int hour);

    /** Return accumulated water used in liters (or 0 if not applicable). */
    double getTotalWaterL();
}
