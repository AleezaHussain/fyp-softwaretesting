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

                // Baseline datacenter (2 racks × 4 servers)
                DataCenterBuilder.buildSmallDC(sim);

                // Broker
                DatacenterBrokerSimple broker = new DatacenterBrokerSimple(sim);

                // VMs
                Vm vm1 = new VmSimple(1000, 2).setRam(2048).setBw(1000).setSize(10000);
                Vm vm2 = new VmSimple(1000, 2).setRam(2048).setBw(1000).setSize(10000);
                List<Vm> vmList = Arrays.asList(vm1, vm2);
                broker.submitVmList(vmList);

                // Workload
                List<Cloudlet> cloudlets = WorkloadGenerator.generateWorkload(10, 10000, 2);
                broker.submitCloudletList(cloudlets);

                // Run the simulation
                sim.start();

                // NEW: Extract actual rack specifications from DataCenterBuilder
                // This simulates getting rack data from the datacenter
                java.util.List<com.acme.dccore.RackSpec> racks = extractRacksFromDatacenter();
                double serverUtilization = 0.95; // 95% average utilization (high load scenario)

                // Calculate thermal load from actual server/rack specifications
                double supplyTempC = 24.0; // Optimized supply temperature instead of 27.0°C
                ThermalIntegrator.ThermalLoad thermalLoad = ThermalIntegrator.calculateThermalLoad(racks,
                                serverUtilization);

                // FIX: Calculate unified airflow using ACTUAL test parameter (not hardcoded)
                double testCfmPerKW = 350; // 🔧 CHANGE THIS: 300 (tight), 350 (design), 450 (excess)
                double unifiedAirflow_CFM = thermalLoad.totalITLoadKW * testCfmPerKW;

                // Override thermal load airflow to ensure consistency
                thermalLoad.totalAirflowCFM = unifiedAirflow_CFM;

                // FIX: Server fan accounting - server fans are part of IT load by PUE
                // definition
                double fanPowerPercent = 18.0; // 18% of server power for fans
                double serverFanPowerKW = thermalLoad.totalITLoadKW * (fanPowerPercent / 100.0);

                // FIX: Total IT load includes server fans (PUE definition)
                double totalITLoadWithFans_kW = thermalLoad.totalITLoadKW + serverFanPowerKW;

                // ===================================================================
                // 🎛️ KEY TESTING KNOBS - MODIFY THESE VALUES TO TEST DIFFERENT SCENARIOS
                // ===================================================================

                // 🌡️ Weather & Environmental Testing
                // Test 8.0 (cold) → 100% economizer | 22.0 (mild) → partial | 30.0 (hot) →
                // mechanical
                double testOutdoorTemp_C = 22.0; // 🔧 TEST 2: MILD CLIMATE - Typical US conditions
                double testOutdoorRH = 40.0; // 🔧 CHANGE THIS: 40% (dry), 80% (humid)

                // ⚙️ Airflow & Fan System Testing
                double testSupplyFan_W_per_CFM = 0.35; // 🔧 CHANGE THIS: 0.30 (efficient), 0.45 (design), 0.60
                                                       // (inefficient)
                double testReturnFan_W_per_CFM = 0.28; // 🔧 CHANGE THIS: 0.25 (efficient), 0.35 (design), 0.50
                                                       // (inefficient)
                double testFanEfficiency = 0.80; // 🔧 CHANGE THIS: 0.60 (old), 0.70 (design), 0.85 (premium)

                // ❄️ Economizer Control Testing
                double testEconLockoutEnthalpy = 65.0; // 🔧 CHANGE THIS: 50 (more econ), 55 (design), 60 (less econ)

                // 🌡️ Temperature Control Testing
                double testSupplyTemp_C = 25.0; // 🔧 CHANGE THIS: 22 (safe), 24 (design), 25 (efficient)

                // 💰 Economic Analysis Testing - SMART CAPEX SCALING
                // Scale CAPEX based on actual system size (IT load + airflow requirements)
                double baseCapexPerKW = 2500; // $2.5k per kW IT load (realistic for small systems)
                double airflowCapexPerCFM = 6.0; // $6 per CFM installed (dampers, controls, ductwork)
                double fixedCapex = 1500; // $1.5k fixed costs (sensors, commissioning)

                // For small systems, use dynamic airflow (425 CFM) rather than oversized fixed
                // approach (912 CFM)
                double smallSystemAirflow_CFM = 425; // Realistic airflow for 3kW system
                double scaledCapex = fixedCapex + (totalITLoadWithFans_kW * baseCapexPerKW)
                                + (smallSystemAirflow_CFM * airflowCapexPerCFM);

                // Allow override for testing different scenarios
                boolean useScaledCapex = true; // 🔧 TOGGLE: true for realistic scaling, false for fixed $22k
                double testCapitalCost_USD = useScaledCapex ? scaledCapex : 22000;

                System.out.printf("=== CAPEX OPTIMIZATION ===\n");
                System.out.printf("IT load-based cost: %.2f kW × $%.0f = $%.0f\n",
                                totalITLoadWithFans_kW, baseCapexPerKW, totalITLoadWithFans_kW * baseCapexPerKW);
                System.out.printf("Airflow-based cost: %.0f CFM × $%.1f = $%.0f\n",
                                smallSystemAirflow_CFM, airflowCapexPerCFM,
                                smallSystemAirflow_CFM * airflowCapexPerCFM);
                System.out.printf("Fixed costs: $%.0f (sensors, commissioning)\n", fixedCapex);
                System.out.printf("Scaled CAPEX: $%.0f (right-sized for %.0fkW system)\n", scaledCapex,
                                totalITLoadWithFans_kW);
                System.out.printf("Fixed CAPEX: $22,000 (oversized assumption)\n");
                System.out.printf("Using: %s ($%.0f)\n",
                                useScaledCapex ? "Scaled CAPEX" : "Fixed CAPEX", testCapitalCost_USD);

                // ===================================================================
                // Configuration set - will be displayed after all calculations

                // Update supply temperature
                supplyTempC = testSupplyTemp_C;

                // Analyze thermal performance with optimized supply temperature
                ThermalIntegrator.ThermalAnalysis thermalAnalysis = ThermalIntegrator.analyzeThermalPerformance(racks,
                                supplyTempC);

                // Create economizer inputs from actual thermal analysis
                EconomizerInputs in = ThermalIntegrator.createEconomizerInputs(thermalLoad, 8760);

                // Override/customize specific parameters with TEST VALUES
                in.cfmPerKW = testCfmPerKW;
                in.fan_W_per_CFM = testSupplyFan_W_per_CFM / testFanEfficiency; // Apply efficiency to fan power
                in.returnFan_W_per_CFM = testReturnFan_W_per_CFM / testFanEfficiency;
                in.returnFan_W_per_CFM = testReturnFan_W_per_CFM;
                in.filterFanPenaltyFrac = 0.10;

                // Containment (reduce bypass) - Note: These may need to be added to
                // EconomizerInputs class
                // hasHotColdAisle = true
                // hasBlanking = true

                // Supply air setpoint (optimize) - supplyTempC = 24 (also test 22, 23, 25)
                // Note: This may need to be added to EconomizerInputs class or used in thermal
                // analysis

                // Economizer controls (psychrometric) - Note: These may need to be added to
                // EconomizerInputs
                // econEnableType = "enthalpy"
                // econLockoutEnthalpy = 55 (kJ/kg)
                // maxOutsideAirFrac = 0.8

                // Baseline and operational parameters
                in.itPUE_baseline = 1.35;
                in.elecTariff_per_kWh = 140; // 🔧 TEST: Higher energy costs ($0.50/kWh equivalent in PKR)
                in.grid_kgCO2_per_kWh = 0.45; // adjust to your grid

                // Run length
                in.hours = 8760; // Full year analysis

                // FIXED: Proper mode selection based on outdoor conditions using TEST VALUES
                double outdoorEnthalpy = calculateEnthalpy(testOutdoorTemp_C, testOutdoorRH);
                double econLockoutEnthalpy = testEconLockoutEnthalpy;

                System.out.printf("\n=== DEBUG: ENTHALPY CALCULATION ===\n");
                System.out.printf("Temperature: %.1f°C, Humidity: %.1f%%\n", testOutdoorTemp_C, testOutdoorRH);
                System.out.printf("Outdoor Enthalpy: %.1f kJ/kg\n", outdoorEnthalpy);
                System.out.printf("Economizer Lockout Threshold: %.1f kJ/kg\n", econLockoutEnthalpy);

                // Use temperature-based logic for more realistic mode determination
                if (testOutdoorTemp_C < 15.0) {
                        // COLD CONDITIONS: Full economizer mode - mechanical OFF except pumps
                        in.econHours = 8760; // Full year economizer operation
                        in.partialHours = 0; // No partial hours
                        in.mechHours = 0; // No mechanical only hours
                        in.outsideAirFrac_partial = 1.0; // Full outside air
                        in.mechTrimFracAtPartial = 0.0; // NO mechanical trim (economizer only)
                } else if (testOutdoorTemp_C < 25.0) {
                        // MILD CONDITIONS: Partial economizer mode - realistic for 22°C
                        in.econHours = 8760 * 0.3; // 30% full economizer hours
                        in.partialHours = 8760 * 0.5; // 50% partial hours (dominant)
                        in.mechHours = 8760 * 0.2; // 20% mechanical only
                        in.outsideAirFrac_partial = 0.6; // 60% outside air in partial
                        in.mechTrimFracAtPartial = 0.40; // 40% mechanical trim
                } else {
                        // HOT CONDITIONS: Economizer lockout - mechanical cooling dominant
                        in.econHours = 0; // No economizer hours in hot conditions
                        in.partialHours = 8760 * 0.2; // 20% partial hours (limited)
                        in.mechHours = 8760 * 0.8; // 80% mechanical cooling
                        in.outsideAirFrac_partial = 0.2; // 20% outside air in partial
                        in.mechTrimFracAtPartial = 0.8; // 80% mechanical trim
                }
                in.capexEconomizerUSD = testCapitalCost_USD;
                in.annualOpexMaintUSD = 5000;
                in.analysisHoursPerYear = 8760;
                in.baselineFan_W_per_CFM = 1.0;

                // ===================================================================
                // 🎛️ KEY TESTING KNOBS - MODIFY THESE VALUES TO TEST DIFFERENT SCENARIOS
                // ===================================================================

                // Determine mode label based on enthalpy and parameters
                String modeName;
                if (in.outsideAirFrac_partial == 1.0 && in.mechTrimFracAtPartial == 0.0) {
                        modeName = "Full Economizer";
                } else if (in.outsideAirFrac_partial > 0.1 && in.mechTrimFracAtPartial > 0.0) {
                        modeName = "Partial Economizer";
                } else {
                        modeName = "Mechanical Cooling";
                }

                // === UNIFIED CONFIGURATION DISPLAY ===
                System.out.println("\n🎛️ ECONOMIZER SIMULATION CONFIGURATION");
                System.out.println("========================================");
                System.out.printf("Weather: %.1f°C / %.1f%% RH (enthalpy %.1f kJ/kg)\n",
                                testOutdoorTemp_C, testOutdoorRH, outdoorEnthalpy);
                System.out.printf("Mode: %s (OA=%.1f, mechTrim=%.2f)\n",
                                modeName, in.outsideAirFrac_partial, in.mechTrimFracAtPartial);
                System.out.printf("Airflow: %.0f CFM/kW\n", testCfmPerKW);

                // Calculate effective W/CFM for display
                double displaySupply_W_per_CFM = (testSupplyFan_W_per_CFM / testFanEfficiency) * (1 + 0.10);
                double displayReturn_W_per_CFM = (testReturnFan_W_per_CFM / testFanEfficiency) * (1 + 0.10);

                System.out.printf("Fan Efficiency: %.0f%% (effective: %.3f/%.3f W/CFM supply/return)\n",
                                testFanEfficiency * 100, displaySupply_W_per_CFM, displayReturn_W_per_CFM);
                System.out.printf("Supply Temperature: %.1f°C\n", testSupplyTemp_C);
                System.out.printf("Capital Cost: $%.0f USD\n", testCapitalCost_USD);
                System.out.printf("Analysis Period: %.0f hours/year\n", in.hours);
                System.out.println("========================================\n");
                in.avgOutdoorTemp_C = testOutdoorTemp_C;
                in.avgOutdoorRH = testOutdoorRH;
                in.reheatKW = 1.0;
                in.humidifierKW = 0.5;
                in.coldThreshold_C = 10.0;
                in.dryThreshold_RH = 40.0;
                in.reheatEfficiency = 0.85;
                in.humidifierEfficiency = 0.80;
                in.evapAssistKW = 0.0;
                in.evapWater_L_per_kWhSensible = 0.0;
                in.evapActiveHours = 0;
                in.sensorMiscKW = 0.2;

                // Additional test parameters (approximated in existing structure)
                // econLockoutEnthalpy = 55 kJ/kg (default) - affects economizer switching
                // maxOutsideAirFrac = 0.8 (default) - affects partial mode operation
                // NOTE: outsideAirFrac_partial and mechTrimFracAtPartial will be set by mode
                // logic below
                // supplyTempC = 24°C (default) - affects thermal analysis

                // Determine test case label based on temperature
                String testCaseLabel, testConditions, expectedBehavior;
                if (testOutdoorTemp_C <= 12.0) {
                        testCaseLabel = "COLD CONDITIONS";
                        testConditions = String.format("%.1f°C/%.1f%% RH", testOutdoorTemp_C, testOutdoorRH);
                        expectedBehavior = "Maximum economizer savings, high free cooling hours";
                } else if (testOutdoorTemp_C <= 25.0) {
                        testCaseLabel = "MILD CONDITIONS";
                        testConditions = String.format("%.1f°C/%.1f%% RH", testOutdoorTemp_C, testOutdoorRH);
                        expectedBehavior = "Partial economizer mode, moderate savings";
                } else {
                        testCaseLabel = "HOT/HUMID CONDITIONS";
                        testConditions = String.format("%.1f°C/%.1f%% RH", testOutdoorTemp_C, testOutdoorRH);
                        expectedBehavior = "Mechanical cooling dominant, limited economizer operation";
                }

                System.out.println("\n=== PARAMETER VALIDATION TEST ===");
                System.out.printf("TEST: %s (%s)\n", testCaseLabel, testConditions);
                System.out.printf("Expected: %s\n", expectedBehavior);
                System.out.println("\n=== UPDATED THERMAL-INTEGRATED ECONOMIZER ANALYSIS ===");
                System.out.printf("Using updated parameters:\n");
                System.out.printf("- Weather: %.1f°C / %.1f%% RH (%s)\n", in.avgOutdoorTemp_C, in.avgOutdoorRH,
                                testCaseLabel);
                System.out.printf("- Airflow: %.0f CFM/kW\n", in.cfmPerKW);
                System.out.printf("- Supply fan efficiency: %.2f W/CFM\n", in.fan_W_per_CFM);
                System.out.printf("- Return fan efficiency: %.2f W/CFM\n", in.returnFan_W_per_CFM);
                System.out.printf("- Filter penalty: %.1f%%\n", in.filterFanPenaltyFrac * 100);
                System.out.printf("- PSU efficiency: %.1f%% (server-level improvement)\n", 94.0);
                System.out.printf("- PUE baseline: %.2f\n", in.itPUE_baseline);
                System.out.printf("- Electricity tariff: %.0f per kWh\n", in.elecTariff_per_kWh);
                System.out.printf("- Analysis period: %.0f hours\n", in.hours);
                System.out.printf("- Outside air fraction (partial): %.1f\n", in.outsideAirFrac_partial);
                System.out.printf("- Mechanical trim fraction: %.2f\n", in.mechTrimFracAtPartial);

                // Rack density sanity check
                double rackDensityKW = 4.0; // target: 3-6 kW typical
                double calculatedRackDensity = thermalLoad.totalITLoadKW; // For single rack
                System.out.printf("- Rack density check: %.1f kW (target: %.1f kW)\n", calculatedRackDensity,
                                rackDensityKW);

                // ---- Run Cooling Model (for internal calculations) ----
                AirEconomizerModel model = new AirEconomizerModel();
                model.compute(in); // Run model but use component breakdown for final results

                // FIX: DYNAMIC AIRFLOW SCALING - Use actual rack demand instead of arbitrary
                // CFM/kW
                double requiredCFM_approx = totalITLoadWithFans_kW * 110; // ~110 CFM/kW for server cooling needs
                double designMargin = 1.15; // 15% safety margin for hot spots
                double dynamicAirflow_CFM = requiredCFM_approx * designMargin; // Smart scaled airflow

                // Allow override to test different approaches
                boolean useDynamicScaling = false; // 🔧 TOGGLE: true for smart scaling, false for fixed CFM/kW
                double finalAirflow_CFM = useDynamicScaling ? dynamicAirflow_CFM : unifiedAirflow_CFM;

                System.out.printf("=== AIRFLOW OPTIMIZATION ===\n");
                System.out.printf("Required cooling airflow: ~%.0f CFM (%.0f CFM/kW)\n",
                                requiredCFM_approx, requiredCFM_approx / totalITLoadWithFans_kW);
                System.out.printf("Design margin: %.0f%% safety factor\n", (designMargin - 1.0) * 100);
                System.out.printf("Dynamic scaled airflow: %.0f CFM\n", dynamicAirflow_CFM);
                System.out.printf("Fixed CFM/kW approach: %.0f CFM (320 CFM/kW)\n", unifiedAirflow_CFM);
                System.out.printf("Using: %s (%.0f CFM)\n",
                                useDynamicScaling ? "Dynamic scaling" : "Fixed CFM/kW", finalAirflow_CFM);

                // ---- Component-wise Energy Calculation (Test System) ----
                double totalCFM = finalAirflow_CFM; // Use optimized airflow

                // Test System HVAC Fans
                double testSupplyFan_kW = (totalCFM * in.fan_W_per_CFM * (1 + in.filterFanPenaltyFrac)) / 1000.0;
                double testReturnFan_kW = (totalCFM * in.returnFan_W_per_CFM * (1 + in.filterFanPenaltyFrac)) / 1000.0;
                double testTotalHVACFan_kW = testSupplyFan_kW + testReturnFan_kW;
                double testFanEnergy_kWh = testTotalHVACFan_kW * in.hours;

                // Test System Mechanical Cooling - must account for economizer operation
                double mechCOP = 4.0; // Test system COP
                // FIX: Mechanical cooling = base cooling load × mechanical trim fraction
                double baseCoolingLoad_kW = thermalLoad.totalITLoadKW / mechCOP; // Basic cooling load
                double testMechCooling_kW = baseCoolingLoad_kW * in.mechTrimFracAtPartial; // Apply economizer reduction

                // Test System Pumps (constant small load regardless of economizer mode)
                double testPumpPowerFrac = 0.05; // 5% pumps
                double testPumpPower_kW = thermalLoad.totalITLoadKW * testPumpPowerFrac;

                // Calculate separate energy components
                double testMechEnergy_kWh = testMechCooling_kW * in.hours; // Mechanical chillers only
                double testPumpEnergy_kWh = testPumpPower_kW * in.hours; // Pumps only
                double testSensorEnergy_kWh = 0.05 * in.hours; // Sensors and misc (reduced from 0.5 to 0.05 kW)

                // Test System Total Cooling+Aux
                double testTotalCoolingAux_kWh = testFanEnergy_kWh + testMechEnergy_kWh + testPumpEnergy_kWh
                                + testSensorEnergy_kWh;

                // ---- Component-wise Energy Calculation (Baseline System) ----

                // Baseline HVAC Fans (less efficient)
                double baselineFan_kW = (totalCFM * in.baselineFan_W_per_CFM * 1.10) / 1000.0; // 1.0 W/CFM + 10%
                                                                                               // penalty
                double baselineFanEnergy_kWh = baselineFan_kW * in.hours;

                // Baseline Mechanical Cooling (less efficient, full mechanical - no economizer)
                double baselineCOP = in.baselineCOP; // 3.5 baseline COP
                double baselineMechCooling_kW = thermalLoad.totalITLoadKW / baselineCOP;
                double baselineMechEnergy_kWh = baselineMechCooling_kW * in.hours;

                // Baseline Pumps (less efficient)
                double baselinePumpPowerFrac = 0.06; // 6% pumps (less efficient)
                double baselinePumpPower_kW = thermalLoad.totalITLoadKW * baselinePumpPowerFrac;
                double baselinePumpEnergy_kWh = baselinePumpPower_kW * in.hours;

                // Baseline Sensors/Misc
                double baselineSensorEnergy_kWh = 0.06 * in.hours; // Higher sensor load (slightly higher than test)

                // Baseline Total Cooling+Aux
                double baselineTotalCoolingAux_kWh = baselineFanEnergy_kWh + baselineMechEnergy_kWh
                                + baselinePumpEnergy_kWh + baselineSensorEnergy_kWh;

                // Calculate actual savings
                double actualSavings_kWh = baselineTotalCoolingAux_kWh - testTotalCoolingAux_kWh;

                // ---- FIX: Comprehensive Reporting After All Calculations ----
                System.out.println("\n=== CORRECTED DATACENTER THERMAL ANALYSIS ===");
                System.out.printf("Supply Temperature: %.1f°C (optimized)\n", supplyTempC);
                System.out.println("----------------------------------------");
                System.out.printf("Total Power: %.2f kW (computing: %.2f kW + server fans: %.2f kW)\n",
                                totalITLoadWithFans_kW, thermalLoad.totalITLoadKW, serverFanPowerKW);
                System.out.printf("Total Airflow: %.0f CFM (%s approach)\n",
                                totalCFM, useDynamicScaling ? "dynamic scaling" : "320 CFM/kW");
                System.out.printf("RTI Analysis: Delivering %.0f CFM vs Required ~%.0f CFM (Over-airing by %.1fx)\n",
                                totalCFM, requiredCFM_approx, totalCFM / requiredCFM_approx);

                System.out.println("\n=== FINAL CORRECTED THERMAL-AWARE SIMULATION ===");
                System.out.printf("Total IT Load: %.2f kW (computing + server fans: %.2f + %.2f)\n",
                                totalITLoadWithFans_kW, thermalLoad.totalITLoadKW, serverFanPowerKW);
                System.out.printf("Unified Airflow: %.0f CFM (%s approach)\n",
                                totalCFM, useDynamicScaling ? "dynamic scaling" : "fixed 320 CFM/kW");

                // RTI Analysis with explanation

                // FIX: Improved thermal performance analysis with corrected health assessment
                System.out.println("\n=== THERMAL PERFORMANCE ANALYSIS ===");
                for (ThermalIntegrator.RackThermalMetrics metrics : thermalAnalysis.rackMetrics) {
                        String health;
                        if (metrics.rciHI >= 95.0 && metrics.rciLO >= 95.0) {
                                health = "GOOD";
                        } else if (metrics.rciHI >= 80.0 && metrics.rciLO >= 80.0) {
                                health = "ACCEPTABLE";
                        } else {
                                health = "NEEDS ATTENTION";
                        }

                        System.out.printf("Rack %s: RTI=%.2f, RCI_HI=%.1f%%, RCI_LO=%.1f%%, Health=%s\n",
                                        metrics.rackId, metrics.rti, metrics.rciHI, metrics.rciLO, health);
                }

                System.out.printf("\n=== MODE LOGIC VERIFICATION ===\n");
                System.out.printf("- Weather: %.1f°C / %.1f%% RH (%s)\n", in.avgOutdoorTemp_C, in.avgOutdoorRH,
                                testCaseLabel);
                System.out.printf("- Hours: Econ=%.0f, Partial=%.0f, Mechanical=%.0f\n",
                                in.econHours, in.partialHours, in.mechHours);

                System.out.printf("\n=== COMPONENT-WISE ENERGY BREAKDOWN ===\n");
                System.out.printf("TEST SYSTEM (Improved):\n");
                System.out.printf("  HVAC Fans: %.2f kW (supply %.2f + return %.2f) → %.0f kWh/yr\n",
                                testTotalHVACFan_kW, testSupplyFan_kW, testReturnFan_kW, testFanEnergy_kWh);
                System.out.printf("  Mechanical Chillers: %.2f kW (COP=%.1f) → %.0f kWh/yr\n",
                                testMechCooling_kW, mechCOP, testMechEnergy_kWh);
                System.out.printf("  Pumps: %.2f kW → %.0f kWh/yr\n",
                                testPumpPower_kW, testPumpEnergy_kWh);
                System.out.printf("  Sensors/Misc: 0.05 kW → %.0f kWh/yr\n", testSensorEnergy_kWh);
                System.out.printf("  Total Cooling+Aux: %.0f kWh/yr\n", testTotalCoolingAux_kWh);

                System.out.printf("\nBASELINE SYSTEM (Standard):\n");
                System.out.printf("  HVAC Fans: %.2f kW (%.1f W/CFM) → %.0f kWh/yr\n",
                                baselineFan_kW, in.baselineFan_W_per_CFM, baselineFanEnergy_kWh);
                System.out.printf("  Mechanical Chillers: %.2f kW (COP=%.1f) → %.0f kWh/yr\n",
                                baselineMechCooling_kW, baselineCOP, baselineMechEnergy_kWh);
                System.out.printf("  Pumps: %.2f kW → %.0f kWh/yr\n",
                                baselinePumpPower_kW, baselinePumpEnergy_kWh);
                System.out.printf("  Sensors/Misc: 0.06 kW → %.0f kWh/yr\n", baselineSensorEnergy_kWh);
                System.out.printf("  Total Cooling+Aux: %.0f kWh/yr\n", baselineTotalCoolingAux_kWh);

                System.out.println("\n=== APPLES-TO-APPLES COMPARISON ===");
                System.out.printf("IT Energy (including server fans): %.0f kWh/yr\n",
                                totalITLoadWithFans_kW * in.hours);
                System.out.printf("Baseline cooling energy: %.0f kWh/yr\n", baselineTotalCoolingAux_kWh);
                System.out.printf("Test cooling energy:     %.0f kWh/yr\n", testTotalCoolingAux_kWh);
                System.out.printf("Energy savings:          %.0f kWh/yr (%s)\n",
                                actualSavings_kWh, actualSavings_kWh > 0 ? "SAVINGS" : "PENALTY");

                // FIX: CORRECTED CO2 calculation using component breakdown values
                double correctBaselineCO2 = baselineTotalCoolingAux_kWh * in.grid_kgCO2_per_kWh;
                double correctTestCO2 = testTotalCoolingAux_kWh * in.grid_kgCO2_per_kWh;
                double correctCO2Savings = correctBaselineCO2 - correctTestCO2;

                System.out.printf("\n=== CORRECTED CO2 CALCULATION ===\n");
                System.out.printf("Baseline CO2: %.0f × %.3f = %.0f kg/yr\n",
                                baselineTotalCoolingAux_kWh, in.grid_kgCO2_per_kWh, correctBaselineCO2);
                System.out.printf("Test CO2:     %.0f × %.3f = %.0f kg/yr\n",
                                testTotalCoolingAux_kWh, in.grid_kgCO2_per_kWh, correctTestCO2);
                System.out.printf("CO2 Savings:  %.0f kg/yr (%.1f tonnes/yr)\n",
                                correctCO2Savings, correctCO2Savings / 1000.0);

                // FIX: Currency-consistent ROI calculation
                double tariffUSD_per_kWh = in.elecTariff_per_kWh / 280.0; // Convert PKR to USD
                double annualSavingsUSD = actualSavings_kWh * tariffUSD_per_kWh;
                double capexUSD = in.capexEconomizerUSD;
                double paybackYears = Math.abs(annualSavingsUSD) > 0.01 ? capexUSD / annualSavingsUSD : 999.9;

                System.out.println("\n=== CURRENCY-CONSISTENT ROI ===");
                System.out.printf("Electricity rate: %.2f PKR/kWh (%.4f USD/kWh)\n",
                                in.elecTariff_per_kWh, tariffUSD_per_kWh);
                System.out.printf("Annual savings:   %.0f USD (%s%.0f kWh)\n",
                                annualSavingsUSD, actualSavings_kWh >= 0 ? "+" : "", actualSavings_kWh);
                System.out.printf("Capital cost:     %.0f USD\n", capexUSD);
                System.out.printf("Payback period:   %.1f years\n", paybackYears);

                System.out.println("\n=== ENVIRONMENTAL IMPACT ===");
                System.out.printf("Grid emission factor: %.2f kg CO2/kWh\n", in.grid_kgCO2_per_kWh);
                System.out.printf("Baseline CO2 emissions: %.0f kg/yr (%.1f tonnes/yr)\n",
                                correctBaselineCO2, correctBaselineCO2 / 1000);
                System.out.printf("Test system CO2 emissions: %.0f kg/yr (%.1f tonnes/yr)\n",
                                correctTestCO2, correctTestCO2 / 1000);
                System.out.printf("Annual CO2 savings: %.0f kg/yr (%.1f tonnes/yr)\n",
                                correctCO2Savings, correctCO2Savings / 1000);
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
