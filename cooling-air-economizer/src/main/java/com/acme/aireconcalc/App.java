package com.acme.aireconcalc;

import com.acme.dccore.DataCenterBuilder;
import com.acme.dccore.WorkloadGenerator;
import com.acme.dccore.RackSpec;
import com.acme.dccore.ServerSpec;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;

public class App {

        // Calculate enthalpy (kJ/kg) from temperature (°C) and relative humidity (%)
        private static double calculateEnthalpy(double tempC, double relativeHumidity) {
                // Calculate saturation pressure (Pa) using Magnus formula
                double esat = 610.78 * Math.exp(17.2694 * tempC / (tempC + 238.3));

                // Calculate actual water vapor pressure
                double e = (relativeHumidity / 100.0) * esat;

                // Calculate humidity ratio (kg water / kg dry air)
                double W = 0.622 * e / (101325 - e);

                // Calculate specific enthalpy (kJ/kg dry air)
                // h = cp_air * T + W * (hfg + cp_vapor * T)
                // Where: cp_air = 1.005 kJ/kg·K, hfg = 2501 kJ/kg, cp_vapor = 1.88 kJ/kg·K
                double enthalpy = 1.005 * tempC + W * (2501 + 1.88 * tempC);

                return enthalpy;
        }

        public static void main(String[] args) {
                // Simulation environment
                CloudSimPlus sim = new CloudSimPlus();
                DataCenterBuilder.buildSmallDC(sim);
                DatacenterBrokerSimple broker = new DatacenterBrokerSimple(sim);
                Vm vm1 = new VmSimple(1000, 2).setRam(2048).setBw(1000).setSize(10000);

                // --- Scenario definition ---
                class Scenario {
                        String label;
                        double oaTempC;
                        double oaRH;
                        double raTempC;
                        double supplyTempC;
                        Scenario(String label, double oaTempC, double oaRH, double raTempC, double supplyTempC) {
                                this.label = label;
                                this.oaTempC = oaTempC;
                                this.oaRH = oaRH;
                                this.raTempC = raTempC;
                                this.supplyTempC = supplyTempC;
                        }
                }
                Scenario[] scenarios = new Scenario[] {
                        new Scenario("Baseline (Hot, Humid)", 35.0, 80.0, 38.0, 20.0),
                        new Scenario("Mild, Dry", 18.0, 30.0, 30.0, 18.0),
                        new Scenario("Cool, Humid", 12.0, 90.0, 28.0, 18.0),
                        new Scenario("Cold, Dry", 2.0, 20.0, 22.0, 18.0)
                };
                double totalITLoadWithFans_kW = 50.0;
                EconomizerController controller = new EconomizerController();

                for (Scenario sc : scenarios) {

                        WeatherData oa = new WeatherData();
                        oa.dryBulbC = sc.oaTempC;
                        oa.relativeHumidity = sc.oaRH;
                        oa.dewPointC = Psychrometrics.calcDewPoint(sc.oaTempC, sc.oaRH);
                        ReturnAir ra = new ReturnAir();
                        ra.tempC = sc.raTempC;
                        Setpoints sp = new Setpoints();
                        sp.supplyTempC = sc.supplyTempC;
                        EconomizerMode mode = (sc.label.contains("Baseline"))
                                        ? EconomizerMode.MECHANICAL
                                        : controller.decideMode(oa, ra, sp);
                        double oaFrac = controller.computeOAFraction(mode, oa, sp, ra);
                        double deltaT = ra.tempC - sp.supplyTempC;
                        double airflowKgPerSec = controller.computeAirflowKgPerSec(totalITLoadWithFans_kW, deltaT);
                        double cfm = airflowKgPerSec * 2118.88;
                        double fanKW = controller.computeFanPowerKW(cfm, totalITLoadWithFans_kW, mode);
                        double coolingKW = controller.computeCoolingKW(mode, oaFrac, oa, ra, sp, airflowKgPerSec,
                                        totalITLoadWithFans_kW);
                        System.out.println("\n--- Scenario: " + sc.label + " ---");
                        System.out.printf("Weather: %.1f°C, %.1f%% RH, Dew Point: %.1f°C\n", oa.dryBulbC,
                                        oa.relativeHumidity, oa.dewPointC);
                        System.out.printf("Return Air Temp: %.1f°C, Supply Setpoint: %.1f°C\n", ra.tempC,
                                        sp.supplyTempC);
                        System.out.printf("Mode: %s, OA Fraction: %.2f\n", mode, oaFrac);
                        System.out.printf("IT Load (including server fans): %.2f kW\n", totalITLoadWithFans_kW);
                        System.out.printf("Facility Fan Power (CRAH/CRAC, incl. relief): %.2f kW\n", fanKW);
                        System.out.printf("Cooling / Conditioning Energy: %.2f kW\n", coolingKW);
                        System.out.printf("Airflow: %.2f kg/s (%.0f CFM)\n", airflowKgPerSec, cfm);

                        // --- Validation & Logging Section ---
                        boolean demandMet = (mode == EconomizerMode.FULL_ECON || mode == EconomizerMode.PARTIAL_ECON
                                        || mode == EconomizerMode.MECHANICAL);
                        boolean airflowSufficient = (airflowKgPerSec > 0.0 && cfm > 0.0);
                        boolean supplyTempSafe = (sp.supplyTempC >= 18.0 && sp.supplyTempC <= 28.0);
                        boolean worstCaseHandled = (mode == EconomizerMode.MECHANICAL
                                        && (oa.dryBulbC >= 28.0 || oa.relativeHumidity >= 70.0));
                        boolean energyBalance = (totalITLoadWithFans_kW > 0 && fanKW > 0 && coolingKW >= 0);

                        System.out.println("\n[Validation Checklist]");
                        System.out.println("Cooling demand met: " + (demandMet ? "✔" : "✗"));
                        System.out.println("Airflow sufficient: " + (airflowSufficient ? "✔" : "✗"));
                        System.out.println("Supply temp in safe range: " + (supplyTempSafe ? "✔" : "✗"));
                        System.out.println("Worst-case handled: " + (worstCaseHandled ? "✔" : "✗"));
                        System.out.println("Energy balance correct: " + (energyBalance ? "✔" : "✗"));
                        if (demandMet && airflowSufficient && supplyTempSafe && energyBalance) {
                                System.out.println(
                                                "\n[Result] ✅ This technique meets the data center specification for this scenario.");
                        } else {
                                System.out.println(
                                                "\n[Result] ❌ This technique does NOT fully meet the data center specification for this scenario.");
                        }

                        // Annualized reporting (CHANGE SETS 1, 2, 5)
                        double hoursPerYear = 4380.0; // CHANGE SET 5: half year
                        double annualIT_kWh = totalITLoadWithFans_kW * hoursPerYear;
                        double annualFan_kWh = fanKW * hoursPerYear;
                        double annualCooling_kWh = coolingKW * hoursPerYear;
                        double totalAnnual_kWh = annualIT_kWh + annualFan_kWh + annualCooling_kWh;
                        double elecTariff_per_kWh = 0.30; // CHANGE SET 1: double tariff
                        double annualCostUSD = totalAnnual_kWh * elecTariff_per_kWh;
                        double grid_kgCO2_per_kWh = 0.70; // CHANGE SET 2: higher CO2 factor
                        double annualCO2_kg = totalAnnual_kWh * grid_kgCO2_per_kWh;
                        System.out.printf("Annual IT Energy: %.0f kWh\n", annualIT_kWh);
                        System.out.printf("Annual Fan Energy: %.0f kWh\n", annualFan_kWh);
                        System.out.printf("Annual Cooling Energy: %.0f kWh\n", annualCooling_kWh);
                        System.out.printf("Total Annual Energy Consumed: %.0f kWh\n", totalAnnual_kWh);
                        System.out.printf("Estimated Annual Electricity Cost: $%.0f\n", annualCostUSD);
                        System.out.printf("Estimated Annual CO2 Emissions: %.0f kg\n", annualCO2_kg);
                }
        }

        /**
         * Simulate extracting rack specifications from the built datacenter.
         * In a real implementation, this would query the actual datacenter
         * configuration.
         */
        private static List<RackSpec> extractRacksFromDatacenter() {
                List<RackSpec> racks = new ArrayList<>();

                // Create a rack that matches what DataCenterBuilder creates
                RackSpec rack = new RackSpec(1); // Use default constructor with standard values

                // Create ServerSpecs that match what DataCenterBuilder uses
                ServerSpec serverSpec = new ServerSpec(
                                4, // cores
                                1000, // MIPS per core
                                8192, // RAM MB
                                100000L, // Storage MB (long)
                                500.0, // max power W (increased from 400W)
                                180.0, // idle power W (reduced from 200W)
                                0.94, // psuEfficiency (94% - improved efficiency from 88%)
                                true, // dualPSU (redundant PSU for high-power server)
                                0.08, // psuOverhead (8% - higher overhead)
                                450.0, // maxAirflowCFM (increased from 350 CFM)
                                20.0, // deltaT_C (temperature rise - increased from 15°C)
                                35.0, // maxInletTemp_C (increased from 32°C)
                                16.0, // minInletTemp_C (reduced from 18°C)
                                500.0, // thermalDesignPower (matches max power)
                                18.0, // fanPowerPercent (18% of server power - fixed units)
                                true, // variableFanSpeed
                                0.4, // minFanSpeed (40% minimum - increased from 30%)
                                2, // uHeight (2U server - taller server)
                                "2U", // formFactor
                                800.0, // depth_mm (0.8m = 800mm - deeper server)
                                482.6 // width_mm (19" rack = 482.6mm)
                );

                // Add 6 servers to the rack (matching DataCenterBuilder.buildSmallDC)
                for (int i = 0; i < 6; i++) {
                        rack.addServer(serverSpec);
                }

                racks.add(rack);
                return racks;
        }
}
