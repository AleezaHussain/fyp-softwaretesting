package com.acme.chilledwatersystem;

/**
 * Phase 2 Part 2: Time-of-Use (TOU) Tariff Schedule
 * 
 * Implements utility billing with Peak, Off-Peak, and Partial-Peak periods.
 * Includes demand charge tracking for monthly billing.
 */
public class TariffSchedule {
    
    // Energy rates ($/kWh)
    private final double peakRate;
    private final double partialPeakRate;
    private final double offPeakRate;
    
    // Demand charge ($/kW per month)
    private final double demandChargeRate;
    
    // Peak tracking
    private double monthlyPeakDemandKw = 0.0;
    private int currentMonth = 1;
    
    /**
     * Default constructor with typical commercial rates
     */
    public TariffSchedule() {
        this.peakRate = 0.25;           // $0.25/kWh during peak
        this.partialPeakRate = 0.15;    // $0.15/kWh during partial peak
        this.offPeakRate = 0.08;        // $0.08/kWh during off-peak
        this.demandChargeRate = 15.0;   // $15/kW per month
    }
    
    /**
     * Custom constructor
     */
    public TariffSchedule(double peakRate, double partialPeakRate, 
                         double offPeakRate, double demandChargeRate) {
        this.peakRate = peakRate;
        this.partialPeakRate = partialPeakRate;
        this.offPeakRate = offPeakRate;
        this.demandChargeRate = demandChargeRate;
    }
    
    /**
     * Get tariff period for a given hour (1-8760)
     * 
     * Peak: Weekdays 12:00-18:00 (noon to 6 PM)
     * Partial Peak: Weekdays 8:00-12:00 and 18:00-22:00
     * Off-Peak: Nights, weekends, holidays
     */
    public String getTariffPeriod(int hourOfYear) {
        // Convert hour of year to day of week and hour of day
        int dayOfYear = (hourOfYear - 1) / 24;
        int hourOfDay = (hourOfYear - 1) % 24;
        int dayOfWeek = dayOfYear % 7; // 0=Monday, 6=Sunday
        
        // Weekend = Off-Peak
        if (dayOfWeek >= 5) {
            return "OFF_PEAK";
        }
        
        // Weekday schedule
        if (hourOfDay >= 12 && hourOfDay < 18) {
            return "PEAK";
        } else if ((hourOfDay >= 8 && hourOfDay < 12) || (hourOfDay >= 18 && hourOfDay < 22)) {
            return "PARTIAL_PEAK";
        } else {
            return "OFF_PEAK";
        }
    }
    
    /**
     * Get energy rate for a given hour
     */
    public double getEnergyRate(int hourOfYear) {
        String period = getTariffPeriod(hourOfYear);
        switch (period) {
            case "PEAK":
                return peakRate;
            case "PARTIAL_PEAK":
                return partialPeakRate;
            case "OFF_PEAK":
            default:
                return offPeakRate;
        }
    }
    
    /**
     * Calculate hourly energy cost
     */
    public double calculateHourlyCost(int hourOfYear, double totalKw) {
        // Update peak demand tracking
        updatePeakDemand(hourOfYear, totalKw);
        
        // Energy cost for this hour
        double energyRate = getEnergyRate(hourOfYear);
        return totalKw * energyRate;
    }
    
    /**
     * Update monthly peak demand tracking
     */
    private void updatePeakDemand(int hourOfYear, double totalKw) {
        int month = ((hourOfYear - 1) / 730) + 1; // Approximate month (730 hours/month)
        
        // Reset peak if new month
        if (month != currentMonth) {
            currentMonth = month;
            monthlyPeakDemandKw = 0.0;
        }
        
        // Track peak
        if (totalKw > monthlyPeakDemandKw) {
            monthlyPeakDemandKw = totalKw;
        }
    }
    
    /**
     * Get monthly demand charge based on peak usage
     */
    public double getMonthlyDemandCharge() {
        return monthlyPeakDemandKw * demandChargeRate;
    }
    
    /**
     * Get current monthly peak demand
     */
    public double getMonthlyPeakDemandKw() {
        return monthlyPeakDemandKw;
    }
    
    /**
     * Reset peak tracking (for new billing cycle)
     */
    public void resetPeakTracking() {
        monthlyPeakDemandKw = 0.0;
        currentMonth = 1;
    }
    
    /**
     * Print tariff schedule summary
     */
    public void printSchedule() {
        System.out.println("\n=== Tariff Schedule ===");
        System.out.printf("Peak Rate: $%.3f/kWh (Weekdays 12:00-18:00)\n", peakRate);
        System.out.printf("Partial Peak Rate: $%.3f/kWh (Weekdays 8:00-12:00, 18:00-22:00)\n", partialPeakRate);
        System.out.printf("Off-Peak Rate: $%.3f/kWh (Nights & Weekends)\n", offPeakRate);
        System.out.printf("Demand Charge: $%.2f/kW per month\n", demandChargeRate);
        System.out.println("=======================\n");
    }
}
