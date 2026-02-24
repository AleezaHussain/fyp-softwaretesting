package com.acme.chilledwatersystem.api.util;

/**
 * Dynamic Infrastructure Efficiency Calculator
 * 
 * Implements load-dependent efficiency curves for UPS and PDU systems
 * to replace static loss percentages with engineering-grade models.
 * 
 * Based on industry data:
 * - UPS efficiency peaks at 40-80% load
 * - PDU efficiency is relatively flat but improves slightly at higher loads
 */
public class InfrastructureEfficiency {

    /**
     * Calculate UPS efficiency based on load percentage
     * 
     * Efficiency curve based on typical double-conversion UPS systems:
     * - 10% load: ~88% efficient
     * - 25% load: ~92% efficient
     * - 50% load: ~95% efficient (peak)
     * - 75% load: ~94% efficient
     * - 100% load: ~92% efficient
     * 
     * @param loadPercentage Current load as percentage of rated capacity (0-100)
     * @return UPS efficiency (0.0-1.0)
     */
    public static double calculateUpsEfficiency(double loadPercentage) {
        if (loadPercentage < 0 || loadPercentage > 100) {
            throw new IllegalArgumentException(
                String.format("Load percentage must be 0-100. Got: %.2f", loadPercentage)
            );
        }

        // Handle edge cases
        if (loadPercentage < 5) {
            return 0.85; // Very low load - poor efficiency
        }

        // Piecewise linear approximation of efficiency curve
        if (loadPercentage <= 25) {
            // 5-25%: Linear from 0.88 to 0.92
            return 0.88 + (loadPercentage - 5) * (0.92 - 0.88) / 20.0;
        } else if (loadPercentage <= 50) {
            // 25-50%: Linear from 0.92 to 0.95 (approaching peak)
            return 0.92 + (loadPercentage - 25) * (0.95 - 0.92) / 25.0;
        } else if (loadPercentage <= 75) {
            // 50-75%: Peak efficiency zone, slight decline
            return 0.95 - (loadPercentage - 50) * (0.95 - 0.94) / 25.0;
        } else {
            // 75-100%: Declining efficiency at high load
            return 0.94 - (loadPercentage - 75) * (0.94 - 0.92) / 25.0;
        }
    }

    /**
     * Calculate PDU efficiency based on load percentage
     * 
     * PDU efficiency is relatively flat but improves slightly at higher loads:
     * - 10% load: ~96% efficient
     * - 50% load: ~98% efficient
     * - 100% load: ~97.5% efficient
     * 
     * @param loadPercentage Current load as percentage of rated capacity (0-100)
     * @return PDU efficiency (0.0-1.0)
     */
    public static double calculatePduEfficiency(double loadPercentage) {
        if (loadPercentage < 0 || loadPercentage > 100) {
            throw new IllegalArgumentException(
                String.format("Load percentage must be 0-100. Got: %.2f", loadPercentage)
            );
        }

        // Handle edge cases
        if (loadPercentage < 5) {
            return 0.95; // Very low load
        }

        // Piecewise linear approximation
        if (loadPercentage <= 50) {
            // 5-50%: Linear from 0.96 to 0.98
            return 0.96 + (loadPercentage - 5) * (0.98 - 0.96) / 45.0;
        } else {
            // 50-100%: Slight decline from peak
            return 0.98 - (loadPercentage - 50) * (0.98 - 0.975) / 50.0;
        }
    }

    /**
     * Calculate total facility power including UPS and PDU losses
     * 
     * Formula: Total_Facility_Power = IT_Load / (UPS_Eff * PDU_Eff) + Cooling_Power
     * 
     * @param itLoadKW IT equipment power in kW
     * @param coolingPowerKW Cooling system power in kW
     * @param upsRatedCapacityKW UPS rated capacity in kW
     * @param pduRatedCapacityKW PDU rated capacity in kW
     * @return Total facility power in kW
     */
    public static double calculateTotalFacilityPower(double itLoadKW, 
                                                     double coolingPowerKW,
                                                     double upsRatedCapacityKW,
                                                     double pduRatedCapacityKW) {
        // Calculate load percentages
        double upsLoadPercent = (itLoadKW / upsRatedCapacityKW) * 100.0;
        double pduLoadPercent = (itLoadKW / pduRatedCapacityKW) * 100.0;

        // Get dynamic efficiencies
        double upsEfficiency = calculateUpsEfficiency(upsLoadPercent);
        double pduEfficiency = calculatePduEfficiency(pduLoadPercent);

        // Calculate IT power with losses
        double itPowerWithLosses = itLoadKW / (upsEfficiency * pduEfficiency);

        // Total facility power
        return itPowerWithLosses + coolingPowerKW;
    }

    /**
     * Calculate UPS losses in kW
     * 
     * @param itLoadKW IT equipment power in kW
     * @param upsRatedCapacityKW UPS rated capacity in kW
     * @return UPS losses in kW
     */
    public static double calculateUpsLosses(double itLoadKW, double upsRatedCapacityKW) {
        double upsLoadPercent = (itLoadKW / upsRatedCapacityKW) * 100.0;
        double upsEfficiency = calculateUpsEfficiency(upsLoadPercent);
        
        // Losses = Input - Output = (IT_Load / Efficiency) - IT_Load
        return (itLoadKW / upsEfficiency) - itLoadKW;
    }

    /**
     * Calculate PDU losses in kW
     * 
     * @param itLoadKW IT equipment power in kW
     * @param pduRatedCapacityKW PDU rated capacity in kW
     * @return PDU losses in kW
     */
    public static double calculatePduLosses(double itLoadKW, double pduRatedCapacityKW) {
        double pduLoadPercent = (itLoadKW / pduRatedCapacityKW) * 100.0;
        double pduEfficiency = calculatePduEfficiency(pduLoadPercent);
        
        // Losses = Input - Output = (IT_Load / Efficiency) - IT_Load
        return (itLoadKW / pduEfficiency) - itLoadKW;
    }

    /**
     * Get efficiency report for given load
     * 
     * @param itLoadKW Current IT load in kW
     * @param upsRatedCapacityKW UPS rated capacity in kW
     * @param pduRatedCapacityKW PDU rated capacity in kW
     * @return Formatted efficiency report
     */
    public static String getEfficiencyReport(double itLoadKW, 
                                            double upsRatedCapacityKW,
                                            double pduRatedCapacityKW) {
        double upsLoadPercent = (itLoadKW / upsRatedCapacityKW) * 100.0;
        double pduLoadPercent = (itLoadKW / pduRatedCapacityKW) * 100.0;
        
        double upsEfficiency = calculateUpsEfficiency(upsLoadPercent);
        double pduEfficiency = calculatePduEfficiency(pduLoadPercent);
        
        double upsLosses = calculateUpsLosses(itLoadKW, upsRatedCapacityKW);
        double pduLosses = calculatePduLosses(itLoadKW, pduRatedCapacityKW);
        
        return String.format(
            "Infrastructure Efficiency Report:\n" +
            "  IT Load: %.2f kW\n" +
            "  UPS: %.1f%% load, %.2f%% efficient, %.2f kW losses\n" +
            "  PDU: %.1f%% load, %.2f%% efficient, %.2f kW losses\n" +
            "  Combined Efficiency: %.2f%%\n" +
            "  Total Losses: %.2f kW",
            itLoadKW,
            upsLoadPercent, upsEfficiency * 100, upsLosses,
            pduLoadPercent, pduEfficiency * 100, pduLosses,
            (upsEfficiency * pduEfficiency) * 100,
            upsLosses + pduLosses
        );
    }
}
