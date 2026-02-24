package com.acme.chilledwatersystem.api.util;

/**
 * 2030 Carbon Tax Escalation Calculator
 * 
 * Implements IPCC pathway carbon pricing escalation from 2026 to 2030
 * to accurately model future carbon liability for data center operations.
 * 
 * Based on IPCC recommendations for limiting warming to 1.5-2°C:
 * - 2026: $50/ton CO2
 * - 2027: $100/ton CO2
 * - 2028: $150/ton CO2
 * - 2029: $200/ton CO2
 * - 2030: $254/ton CO2
 */
public class CarbonTaxEscalation {

    // IPCC pathway carbon tax schedule (USD per metric ton CO2)
    private static final double TAX_2026 = 50.0;
    private static final double TAX_2027 = 100.0;
    private static final double TAX_2028 = 150.0;
    private static final double TAX_2029 = 200.0;
    private static final double TAX_2030 = 254.0;

    // Gate 4 threshold: Carbon tax should not exceed 30% of annual OPEX
    private static final double GATE4_THRESHOLD = 0.30;

    /**
     * Get carbon tax rate for a specific year
     * 
     * @param year Target year (2026-2030)
     * @return Carbon tax in USD per metric ton CO2
     */
    public static double getCarbonTaxForYear(int year) {
        return switch (year) {
            case 2026 -> TAX_2026;
            case 2027 -> TAX_2027;
            case 2028 -> TAX_2028;
            case 2029 -> TAX_2029;
            case 2030 -> TAX_2030;
            default -> {
                if (year < 2026) {
                    yield TAX_2026; // Use 2026 rate for earlier years
                } else {
                    // Extrapolate beyond 2030 (linear continuation)
                    double yearsBeyond = year - 2030;
                    yield TAX_2030 + (yearsBeyond * 50.0); // $50/ton per year increase
                }
            }
        };
    }

    /**
     * Calculate total carbon tax liability over lifecycle
     * 
     * @param annualCarbonEmissionsTons Annual CO2 emissions in metric tons
     * @param startYear Starting year of analysis
     * @param lifetimeYears Lifetime of analysis (typically 15 years)
     * @param ipccPathwayEnabled Whether to use IPCC escalation or flat rate
     * @return Total carbon tax liability in USD
     */
    public static double calculateLifecycleCarbonTax(double annualCarbonEmissionsTons,
                                                     int startYear,
                                                     int lifetimeYears,
                                                     boolean ipccPathwayEnabled) {
        double totalTax = 0.0;

        for (int year = 0; year < lifetimeYears; year++) {
            int targetYear = startYear + year;
            double taxRate;

            if (ipccPathwayEnabled) {
                taxRate = getCarbonTaxForYear(targetYear);
            } else {
                // Flat rate (use starting year rate)
                taxRate = getCarbonTaxForYear(startYear);
            }

            double yearlyTax = annualCarbonEmissionsTons * taxRate;
            totalTax += yearlyTax;
        }

        return totalTax;
    }

    /**
     * Calculate discounted present value of carbon tax liability
     * 
     * @param annualCarbonEmissionsTons Annual CO2 emissions in metric tons
     * @param startYear Starting year
     * @param lifetimeYears Lifetime of analysis
     * @param discountRate Discount rate (e.g., 0.05 for 5%)
     * @param ipccPathwayEnabled Whether to use IPCC escalation
     * @return NPV of carbon tax liability in USD
     */
    public static double calculateNPVCarbonTax(double annualCarbonEmissionsTons,
                                               int startYear,
                                               int lifetimeYears,
                                               double discountRate,
                                               boolean ipccPathwayEnabled) {
        double npvTax = 0.0;

        for (int year = 1; year <= lifetimeYears; year++) {
            int targetYear = startYear + year;
            double taxRate;

            if (ipccPathwayEnabled) {
                taxRate = getCarbonTaxForYear(targetYear);
            } else {
                taxRate = getCarbonTaxForYear(startYear);
            }

            double yearlyTax = annualCarbonEmissionsTons * taxRate;
            double discountFactor = Math.pow(1.0 + discountRate, year);
            npvTax += yearlyTax / discountFactor;
        }

        return npvTax;
    }

    /**
     * Validate Phase 4 Gate: Carbon Liability
     * 
     * Gate passes if carbon tax < 30% of annual OPEX
     * 
     * @param annualCarbonEmissionsTons Annual CO2 emissions in metric tons
     * @param annualOpexUSD Annual operating expenses in USD
     * @param targetYear Year to evaluate (typically 2030)
     * @param ipccPathwayEnabled Whether to use IPCC escalation
     * @return Gate validation result
     */
    public static Gate4Result validateGate4(double annualCarbonEmissionsTons,
                                            double annualOpexUSD,
                                            int targetYear,
                                            boolean ipccPathwayEnabled) {
        Gate4Result result = new Gate4Result();

        double taxRate = ipccPathwayEnabled ? 
            getCarbonTaxForYear(targetYear) : 
            getCarbonTaxForYear(2026);

        result.carbonTaxRate = taxRate;
        result.annualCarbonTax = annualCarbonEmissionsTons * taxRate;
        result.annualOpex = annualOpexUSD;
        result.carbonTaxPercentage = (result.annualCarbonTax / annualOpexUSD) * 100.0;
        result.threshold = GATE4_THRESHOLD * 100.0;
        result.passes = result.carbonTaxPercentage < (GATE4_THRESHOLD * 100.0);

        if (result.passes) {
            result.verdict = "PASS";
            result.message = String.format(
                "✅ FUTURE-PROOF: Carbon tax (%.1f%% of OPEX) is below 30%% threshold",
                result.carbonTaxPercentage
            );
        } else {
            result.verdict = "FAIL";
            result.message = String.format(
                "❌ NOT FUTURE-PROOF: Carbon tax (%.1f%% of OPEX) exceeds 30%% threshold. " +
                "Consider low-carbon cooling alternatives.",
                result.carbonTaxPercentage
            );
        }

        return result;
    }

    /**
     * Get carbon tax escalation schedule
     * 
     * @return Formatted schedule
     */
    public static String getEscalationSchedule() {
        return String.format(
            "IPCC Carbon Tax Escalation Schedule:\n" +
            "  2026: $%.0f/ton CO2\n" +
            "  2027: $%.0f/ton CO2\n" +
            "  2028: $%.0f/ton CO2\n" +
            "  2029: $%.0f/ton CO2\n" +
            "  2030: $%.0f/ton CO2\n" +
            "\nGate 4 Threshold: Carbon tax must be < 30%% of annual OPEX",
            TAX_2026, TAX_2027, TAX_2028, TAX_2029, TAX_2030
        );
    }

    /**
     * Compare flat rate vs. IPCC pathway
     * 
     * @param annualCarbonEmissionsTons Annual emissions
     * @param lifetimeYears Lifetime of analysis
     * @return Comparison report
     */
    public static String compareScenarios(double annualCarbonEmissionsTons, int lifetimeYears) {
        double flatRateTax = calculateLifecycleCarbonTax(
            annualCarbonEmissionsTons, 2026, lifetimeYears, false
        );

        double ipccPathwayTax = calculateLifecycleCarbonTax(
            annualCarbonEmissionsTons, 2026, lifetimeYears, true
        );

        double difference = ipccPathwayTax - flatRateTax;
        double percentIncrease = (difference / flatRateTax) * 100.0;

        return String.format(
            "Carbon Tax Scenario Comparison (%d years):\n" +
            "  Flat Rate ($50/ton):     $%,.2f\n" +
            "  IPCC Pathway:            $%,.2f\n" +
            "  Difference:              $%,.2f (+%.1f%%)\n" +
            "\n⚠️  IPCC pathway results in %.1f%% higher carbon costs over lifecycle!",
            lifetimeYears,
            flatRateTax,
            ipccPathwayTax,
            difference,
            percentIncrease,
            percentIncrease
        );
    }

    /**
     * Gate 4 validation result
     */
    public static class Gate4Result {
        public double carbonTaxRate;
        public double annualCarbonTax;
        public double annualOpex;
        public double carbonTaxPercentage;
        public double threshold;
        public boolean passes;
        public String verdict;
        public String message;

        public void print() {
            System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
            System.out.println("║  PHASE 4 GATE: CARBON LIABILITY VALIDATION                            ║");
            System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
            System.out.printf("Carbon Tax Rate: $%.0f/ton CO2\n", carbonTaxRate);
            System.out.printf("Annual Carbon Tax: $%,.2f\n", annualCarbonTax);
            System.out.printf("Annual OPEX: $%,.2f\n", annualOpex);
            System.out.printf("Carbon Tax as %% of OPEX: %.1f%%\n", carbonTaxPercentage);
            System.out.printf("Threshold: %.0f%%\n", threshold);
            System.out.printf("Verdict: %s\n", verdict);
            System.out.println(message);
            System.out.println();
        }
    }
}
