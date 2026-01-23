package com.acme.aireconcalc;

import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic Hourly Simulation Runner
 */
public class App {

        public static void main(String[] args) {
                System.out.println(
                                "=================================================================================================");
                System.out.println("   COOLING AIR ECONOMIZER - DYNAMIC HOURLY SIMULATION (PHYSICS ENGINE)");
                System.out.println(
                                "=================================================================================================");

                // 1. Initialize Inputs
                EconomizerInputs in = new EconomizerInputs();
                // Constants defined in class, but we can override if needed
                in.numServers = 50;
                in.serverMaxPowerW = 507.0; // Updated to Fujitsu TX1330 M6
                in.serverIdlePowerW = 100.0;
                in.maxAirflowCFM = 2000.0;
                in.mechCOP = 3.0;
                in.carbonIntensity_kg_per_kWh = 0.055;
                in.computeIntensityFactor = 1.2; // Example: 20% AI uplift
                in.forecastYears = 10;

                AirEconomizerModel model = new AirEconomizerModel();
                List<AirEconomizerModel.StepResult> dailyResults = new ArrayList<>();

                // 2. Simulation Loop (24 Hours)
                System.out.printf("%-6s | %-6s | %-6s | %-6s | %-8s | %-8s | %-12s | %-12s | %-6s | %-6s | %-6s%n",
                                "Hour", "TempC", "RH%", "Util%", "IT(kW)", "Flow(CFM)", "Mode", "Fan(kW)", "Mech(kW)",
                                "PUE", "CUE");
                System.out.println(
                                "--------------------------------------------------------------------------------------------------------------------------");

                double totalItEnergy = 0;
                double totalCoolingEnergy = 0;
                double totalCarbon = 0;

                for (int h = 0; h < 24; h++) {
                        // Generate standard daily weather profile (Min 18C, Max 30C)
                        double tempC = SimUtils.getHourlyTempC(h, 18.0, 30.0);
                        double rh = 50.0; // Assume constant RH 50% for this test
                        WeatherData w = new WeatherData();
                        w.dryBulbC = tempC;
                        w.relativeHumidity = rh;

                        // Generate workload (20% to 70%)
                        double util = SimUtils.getHourlyUtilization(h, 0.2, 0.7);

                        // Compute Step
                        AirEconomizerModel.StepResult res = model.computeTimeStep(in, w, h, util);
                        dailyResults.add(res);

                        // Accumulate
                        totalItEnergy += res.itLoad_kW; // kW * 1h
                        totalCoolingEnergy += (res.fanPower_kW + res.mechPower_kW);
                        totalCarbon += (res.totalPower_kW * in.carbonIntensity_kg_per_kWh);

                        // Print Row
                        String modeShort = res.mode.replace("_", " ");
                        if (res.airflowViolation)
                                modeShort += "(!)";

                        System.out.printf(
                                        "%02d:00  | %6.1f | %6.0f | %6.0f | %8.2f | %8.0f | %-12s | %8.2f | %8.2f | %6.2f | %6.3f%n",
                                        h, tempC, rh, util * 100, res.itLoad_kW, res.requiredAirflow_CFM,
                                        modeShort, res.fanPower_kW, res.mechPower_kW, res.pue, res.cue);
                }

                // 3. Daily Summary
                double dailyPUE = (totalItEnergy + totalCoolingEnergy) / totalItEnergy;
                double dailyCUE = totalCarbon / totalItEnergy;
                double totalCost = (totalItEnergy + totalCoolingEnergy) * 0.15; // Assume $0.15/kWh

                System.out.println(
                                "--------------------------------------------------------------------------------------------------------------------------");
                System.out.println("DAILY SUMMARY:");
                System.out.printf("Total IT Energy:      %.2f kWh%n", totalItEnergy);
                System.out.printf("Total Cooling Energy: %.2f kWh%n", totalCoolingEnergy);
                System.out.printf("Daily Average PUE:    %.3f%n", dailyPUE);
                System.out.printf("Daily CUE:            %.4f kgCO2/kWh%n", dailyCUE);
                System.out.printf("Estimated OpEx:       $%.2f (at $0.15/kWh)%n", totalCost);
                System.out.println(
                                "=================================================================================================");

                // 4. Multi-Year TCO Forecasting (AI Future-Proofing)
                calculateTCO(in, totalItEnergy + totalCoolingEnergy, totalCarbon);
        }

        private static void calculateTCO(EconomizerInputs in, double annualTotalEnergykWh, double annualCarbonKg) {
                System.out.println(
                                "\n--------------------------------------------------------------------------------------------------------------------------");
                System.out.println("MULTI-YEAR TCO FORECAST (2026-2035) - AI Workload Scenario");
                System.out.printf("%-6s | %-15s | %-15s | %-15s | %-15s%n", "Year", "Grid Cost ($)", "Carbon Tax ($)",
                                "Total TCO ($)", "Total Energy (kWh)");
                System.out.println(
                                "--------------------------------------------------------------------------------------------------------------------------");

                // Assume base values
                double currentElecRate = 0.15; // $0.15/kWh base
                double currentCarbonTax = 85.0; // Baseline €85/ton -> ~$90/ton

                // Convert Carbon Tax target to USD (approx 1 EUR = 1.05 USD)
                double targetCarbonTaxUSD = in.carbonTaxProjected * 1.05;

                // Annualize daily results (x 365 for rough annual estimate)
                double annualEnergy = annualTotalEnergykWh * 365;
                double annualCarbonTons = (annualCarbonKg * 365) / 1000.0;

                for (int y = 1; y <= in.forecastYears; y++) {
                        // 1. Escalate Grid Cost
                        double yearRate = currentElecRate * Math.pow(1 + in.energyEscalationRate, y);
                        double gridCost = annualEnergy * yearRate;

                        // 2. Ramp up Carbon Tax (Linear approach to 2030 target, then flat or
                        // continuing)
                        // If forecast is 10 years, we ramp for first 4 years (2026-2030)
                        double taxRate;
                        if (y <= 4) {
                                double frac = (double) y / 4.0;
                                taxRate = currentCarbonTax + frac * (targetCarbonTaxUSD - currentCarbonTax);
                        } else {
                                taxRate = targetCarbonTaxUSD; // Cap at 2030 target or continue? Using cap for now.
                        }

                        double carbonCost = annualCarbonTons * taxRate;
                        double totalTCO = gridCost + carbonCost;

                        System.out.printf("Year %-2d | $%-14.2f | $%-14.2f | $%-14.2f | %-10.0f%n",
                                        y, gridCost, carbonCost, totalTCO, annualEnergy);
                }
                System.out.println(
                                "--------------------------------------------------------------------------------------------------------------------------");
        }
}
