package com.acme.aireconcalc;

import com.acme.dccore.DataCenterBuilder;
import com.acme.dccore.WorkloadGenerator;
import com.acme.dccore.RackSpec;
import com.acme.dccore.ServerSpec;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;

import java.util.List;
import java.util.ArrayList;

public class App {
    public static void main(String[] args) {
        // Simulation environment
        CloudSimPlus sim = new CloudSimPlus();

        // Baseline datacenter (2 racks × 4 servers)
        Datacenter dc = DataCenterBuilder.buildSmallDC(sim);

        // Broker
        DatacenterBrokerSimple broker = new DatacenterBrokerSimple(sim);

        // VMs
        Vm vm1 = new VmSimple(1000, 2).setRam(2048).setBw(1000).setSize(10000);
        Vm vm2 = new VmSimple(1000, 2).setRam(2048).setBw(1000).setSize(10000);
        List<Vm> vmList = List.of(vm1, vm2);
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
        ThermalIntegrator.ThermalLoad thermalLoad = ThermalIntegrator.calculateThermalLoad(racks, serverUtilization);

        // Analyze thermal performance with warmer supply temperature
        ThermalIntegrator.ThermalAnalysis thermalAnalysis = ThermalIntegrator.analyzeThermalPerformance(racks, 27.0);

        System.out.println("=== ENHANCED THERMAL-AWARE SIMULATION ===");
        System.out.printf("Actual IT Load: %.2f kW (from server specs)\n", thermalLoad.totalITLoadKW);
        System.out.printf("Total Fan Power: %.2f kW\n", thermalLoad.totalFanPowerKW);
        System.out.printf("Total Airflow: %.0f CFM\n", thermalLoad.totalAirflowCFM);
        System.out.printf("Calculated PUE: %.2f\n", thermalLoad.pue);
        System.out.printf("CFM per kW: %.1f\n", thermalLoad.totalAirflowCFM / thermalLoad.totalITLoadKW);

        // Print thermal analysis
        System.out.println("\n=== THERMAL PERFORMANCE ANALYSIS ===");
        for (ThermalIntegrator.RackThermalMetrics metrics : thermalAnalysis.rackMetrics) {
            System.out.printf("Rack %d: RTI=%.2f, RCI_HI=%.1f%%, RCI_LO=%.1f%%, Health=%s\n",
                    metrics.rackId, metrics.rti, metrics.rciHI, metrics.rciLO, metrics.thermalHealth);
        }

        // Create economizer inputs from actual thermal analysis
        EconomizerInputs in = ThermalIntegrator.createEconomizerInputs(thermalLoad, 8760);

        // Override/customize specific parameters as needed
        // Airflow (right-size) - cfmPerKW = 350 (can test: 250, 300, 350, 400)
        in.cfmPerKW = 350;
        
        // Fans & filters (turn energy ON)
        in.fan_W_per_CFM = 0.45;
        in.returnFan_W_per_CFM = 0.35;
        in.filterFanPenaltyFrac = 0.10;
        
        // Containment (reduce bypass) - Note: These may need to be added to EconomizerInputs class
        // hasHotColdAisle = true
        // hasBlanking = true
        
        // Supply air setpoint (optimize) - supplyTempC = 24 (also test 22, 23, 25)
        // Note: This may need to be added to EconomizerInputs class or used in thermal analysis
        
        // Economizer controls (psychrometric) - Note: These may need to be added to EconomizerInputs
        // econEnableType = "enthalpy" 
        // econLockoutEnthalpy = 55 (kJ/kg)
        // maxOutsideAirFrac = 0.8
        
        // Baseline and operational parameters
        in.itPUE_baseline = 1.35;
        in.elecTariff_per_kWh = 45; // local blended rate
        in.grid_kgCO2_per_kWh = 0.45; // adjust to your grid
        
        // Run length
        in.hours = 8760; // Full year analysis
        
        // Optional efficiency improvements
        // Note: psuEfficiency and rackPDUEfficiency are server-level parameters
        in.capexEconomizerUSD = 200000;
        in.annualOpexMaintUSD = 5000;
        in.analysisHoursPerYear = 8760;
        in.baselineFan_W_per_CFM = 1.0;

        // Weather and environmental parameters
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

        System.out.println("\n=== UPDATED THERMAL-INTEGRATED ECONOMIZER ANALYSIS ===");
        System.out.printf("Using updated parameters:\n");
        System.out.printf("- Airflow: %.0f CFM/kW (target: 350)\n", in.cfmPerKW);
        System.out.printf("- Supply fan efficiency: %.2f W/CFM\n", in.fan_W_per_CFM);
        System.out.printf("- Return fan efficiency: %.2f W/CFM\n", in.returnFan_W_per_CFM);
        System.out.printf("- Filter penalty: %.1f%%\n", in.filterFanPenaltyFrac * 100);
        System.out.printf("- PSU efficiency: %.1f%% (server-level improvement)\n", 94.0);
        System.out.printf("- PUE baseline: %.2f\n", in.itPUE_baseline);
        System.out.printf("- Electricity tariff: %.0f per kWh\n", in.elecTariff_per_kWh);
        System.out.printf("- Analysis period: %.0f hours\n", in.hours);
        
        // Rack density sanity check
        double rackDensityKW = 4.0; // target: 3-6 kW typical
        double calculatedRackDensity = thermalLoad.totalITLoadKW; // For single rack
        System.out.printf("- Rack density check: %.1f kW (target: %.1f kW)\n", calculatedRackDensity, rackDensityKW);

        // ---- Run Cooling Model ----
        AirEconomizerModel model = new AirEconomizerModel();
        AirEconomizerModel.Result r = model.compute(in);

        double fracYear = in.hours / in.analysisHoursPerYear;
        ROIResult roi = CostCarbonCalculator.computeROI(r, in, fracYear);

        // ---- Report ----
        System.out.println("\n=== Cooling Results (Air-side Economizer) ===");
        System.out.printf("Total cooling+aux energy: %.2f kWh%n", r.total_kWh);
        System.out.printf("Cooling electricity cost: %.2f%n", r.total_cost);
        System.out.printf("Cooling CO2 emissions:    %.2f kg%n", r.total_co2_kg);
        System.out.printf("Water usage:              %.2f L%n", r.total_water_L);

        System.out.println("\n--- Baseline Comparison (COP vs PUE) ---");
        double itEnergy = thermalLoad.totalITLoadKW * in.hours;
        double pueBaseline = itEnergy * (in.itPUE_baseline - 1.0);
        double copBaseline = itEnergy / in.baselineCOP + (8500 * 1.0 * 1.08 * in.hours / 1000.0); // simplified fan calc
        System.out.printf("IT Energy:                %.2f kWh%n", itEnergy);
        System.out.printf("PUE Baseline (PUE=%.1f):   %.2f kWh%n", in.itPUE_baseline, pueBaseline);
        System.out.printf("COP Baseline (COP=%.1f):   %.2f kWh%n", in.baselineCOP, copBaseline);
        System.out.printf("Used Baseline:            %.2f kWh%n", r.baseline_kWh);

        System.out.println("\n--- Baseline vs Economizer ---");
        System.out.printf("Baseline energy:          %.2f kWh%n", r.baseline_kWh);
        System.out.printf("Economizer energy:        %.2f kWh%n", r.total_kWh);
        System.out.printf("Savings:                  %.2f kWh%n", r.savings_kWh);

        System.out.println("\n--- ROI ---");
        System.out.printf("Annual savings (cost):    %.2f%n", roi.annualSavingsCostUSD);
        System.out.printf("Annual savings (CO2 kg):  %.2f kg%n", roi.annualSavingsCO2kg);
        System.out.printf("Payback period:           %.2f years%n", roi.simplePaybackYears);
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
                0.18, // fanPowerPercent (18% of server power - increased)
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
