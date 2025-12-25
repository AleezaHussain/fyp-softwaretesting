package com.acme.dccore;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelFull;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.schedulers.vm.VmSchedulerTimeShared;
import org.cloudsimplus.schedulers.cloudlet.CloudletSchedulerTimeShared;
import org.cloudsimplus.power.models.PowerModelHostSimple;
import java.io.IOException;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;

import java.util.List;
import java.util.ArrayList;


// Generic cooling model for comparison
class CoolingModel {
    private final double efficiency; // e.g. 0.95 for 95%
    private final String type;
    public CoolingModel(String type, double efficiency) {
        this.type = type;
        this.efficiency = efficiency;
    }
    public double getCoolingPower(double itPower) {
        return itPower * (1.0 / efficiency - 1.0);
    }
    public double getPUE() {
        return 1.0 / efficiency;
    }
    public String getType() { return type; }
    public double getEfficiency() { return efficiency; }
}

public class MainWithImmersion {
    private static class ScenarioConfig {
        String name;
        int hosts;
        int vms;
        long vmPes;
        double vmMips;
        long cloudletLen;
        double bathSetpointC;
        double flowRate_m3s;
        double inletTempC;
        // Coolant properties and tank
        String coolantName = "water";
        double fluidCp = 4200;      // J/kgK
        double fluidDensity = 1000; // kg/m3
        double chillerCOP = 5.0;
        double tankHeatCapacityJPerK = 50_000.0;
        boolean parallelFlow = true; // if true, set parallelSplitFactor = hosts
        // Failures and bursts
        double failureStartS = -1;     // pump failure start time (s), <0 means none
        double failureDurationS = 0;   // seconds
        double burstAtS = -1;          // submit additional cloudlets at this time, <0 none
        int burstCloudlets = 0;
        long burstCloudletLen = 0;
        // Economics/environment
        double costPerKWhUSD = 0.10;   // $/kWh
        double kgCO2PerKWh = 0.45;     // kg CO2/kWh
        ScenarioConfig(String name, int hosts, int vms, long vmPes, double vmMips, long cloudletLen,
                       double bathSetpointC, double flowRate_m3s, double inletTempC) {
            this.name = name; this.hosts = hosts; this.vms = vms; this.vmPes = vmPes; this.vmMips = vmMips;
            this.cloudletLen = cloudletLen; this.bathSetpointC = bathSetpointC; this.flowRate_m3s = flowRate_m3s; this.inletTempC = inletTempC;
        }
    }

    public static void main(String[] args) {
        List<ScenarioConfig> scenarios = new ArrayList<>();
        // Multi-host/VM and workload variations
        scenarios.add(new ScenarioConfig("H1V1_Light_25C_Flow0.01", 1, 1, 2, 4000, 50_000, 30.0, 0.01, 25.0));
        scenarios.add(new ScenarioConfig("H2V4_Medium_25C_Flow0.01", 2, 4, 2, 4000, 500_000, 30.0, 0.01, 25.0));
        scenarios.add(new ScenarioConfig("H4V8_Heavy_30C_Flow0.02", 4, 8, 2, 4000, 2_000_000, 30.0, 0.02, 30.0));
        // Bath temp sweep
        ScenarioConfig s20 = new ScenarioConfig("H2V2_20C_Flow0.01", 2, 2, 2, 4000, 300_000, 20.0, 0.01, 20.0);
        scenarios.add(s20);
        ScenarioConfig s30 = new ScenarioConfig("H2V2_30C_Flow0.01", 2, 2, 2, 4000, 300_000, 30.0, 0.01, 30.0);
        scenarios.add(s30);
        // Flow sweep
        ScenarioConfig sFlow = new ScenarioConfig("H2V2_25C_Flow0.005", 2, 2, 2, 4000, 300_000, 25.0, 0.005, 25.0);
        scenarios.add(sFlow);
        // Coolant type comparison (approximate properties)
        ScenarioConfig sFluor = new ScenarioConfig("H2V2_Fluorinert_25C_Flow0.01", 2, 2, 2, 4000, 300_000, 25.0, 0.01, 25.0);
        sFluor.coolantName = "fluorinert"; sFluor.fluidCp = 1100; sFluor.fluidDensity = 1800; sFluor.chillerCOP = 4.0; sFluor.tankHeatCapacityJPerK = 30_000;
        scenarios.add(sFluor);
        // Series flow and larger tank to see gradients/stability
        ScenarioConfig sSeries = new ScenarioConfig("H3V3_Series_25C_Tank150kJpK", 3, 3, 2, 4000, 400_000, 25.0, 0.01, 25.0);
        sSeries.parallelFlow = false; sSeries.tankHeatCapacityJPerK = 150_000;
        scenarios.add(sSeries);
        // Pump failure and burst workload
        ScenarioConfig sFail = new ScenarioConfig("H2V2_FailureBurst_25C", 2, 2, 2, 4000, 300_000, 25.0, 0.01, 25.0);
        sFail.failureStartS = 20.0; sFail.failureDurationS = 10.0; sFail.burstAtS = 5.0; sFail.burstCloudlets = 2; sFail.burstCloudletLen = 200_000;
        scenarios.add(sFail);

        for (ScenarioConfig sc : scenarios) {
            runScenario(sc);
        }
    }

    private static void runScenario(ScenarioConfig sc) {
        System.out.println("\n=== Running Scenario: " + sc.name + " ===");
        CloudSimPlus simulation = new CloudSimPlus();

        // Hosts
        List<Host> hosts = new ArrayList<>();
        for (int h = 0; h < sc.hosts; h++) {
            List<Pe> peList = new ArrayList<>();
            for (int i = 0; i < sc.vmPes; i++) peList.add(new PeSimple(sc.vmMips));
            HostSimple host = new HostSimple(8192, 10000, 100_000, peList);
            host.setVmScheduler(new VmSchedulerTimeShared());
            host.setPowerModel(new PowerModelHostSimple(200, 100));
            hosts.add(host);
        }
        DatacenterSimple datacenter = new DatacenterSimple(simulation, hosts);

        // Broker, VMs and Cloudlets
        DatacenterBrokerSimple broker = new DatacenterBrokerSimple(simulation);
        List<Vm> vms = new ArrayList<>();
        for (int i = 0; i < sc.vms; i++) {
            Vm vm = new VmSimple(sc.vmMips, sc.vmPes)
                    .setRam(4096).setBw(5000).setSize(100_000)
                    .setCloudletScheduler(new CloudletSchedulerTimeShared());
            vms.add(vm);
        }
        List<Cloudlet> cloudlets = new ArrayList<>();
        for (int i = 0; i < sc.vms; i++) {
            Cloudlet cl = new CloudletSimple(sc.cloudletLen, sc.vmPes);
            cl.setUtilizationModel(new UtilizationModelFull());
            cloudlets.add(cl);
        }
        broker.submitVmList(vms);
        broker.submitCloudletList(cloudlets);

        // Immersion system shared bath (single unit), per-host thermal managers
        double timestep = 1.0;
        ImmersionCoolingUnit unit = new ImmersionCoolingUnit(
                sc.flowRate_m3s, sc.fluidCp, sc.fluidDensity, sc.inletTempC, 100.0, 0.6, sc.chillerCOP,
                sc.bathSetpointC, sc.bathSetpointC + 15.0, Math.max(5.0, sc.bathSetpointC - 10.0)
        );
        unit.coolantName = sc.coolantName;
        unit.tankHeatCapacityJPerK = sc.tankHeatCapacityJPerK;
        unit.parallelSplitFactor = sc.parallelFlow ? Math.max(1, sc.hosts) : 1.0;
        ImmersionCoolingController controller = new ImmersionCoolingController(sc.bathSetpointC, sc.bathSetpointC + 15.0, Math.max(5.0, sc.bathSetpointC - 10.0));
        ImmersionCoolingPowerModel powerModel = new ImmersionCoolingPowerModel(); // shared energy accounting
        ImmersionCoolingPolicy policy = new ImmersionCoolingPolicy(sc.bathSetpointC + 12.0, sc.bathSetpointC + 18.0);

        // Managers per host and per-host thermal models
        List<ImmersionCoolingManager> managers = new ArrayList<>();
        List<ImmersionThermalModel> thermals = new ArrayList<>();
        for (Host h : hosts) {
            ImmersionThermalModel thermal = new ImmersionThermalModel(35.0, 20_000.0);
            thermals.add(thermal);
            List<Host> single = new ArrayList<>(); single.add(h);
            managers.add(new ImmersionCoolingManager(timestep, single, unit, thermal, controller, powerModel, policy));
        }

        // Metrics
        MetricsRecorder recorder = new MetricsRecorder(sc.name);
        CoolingModel airCooling = new CoolingModel("Air Cooling", 0.70);
        final double[] last = { simulation.clock() };
        final double[] itWh = { 0.0 };
        final double[] coolWh_baseline = { 0.0 };

        // Burst submission if configured
        if (sc.burstAtS >= 0 && sc.burstCloudlets > 0) {
            simulation.addOnClockTickListener(ev -> {
                double now = simulation.clock();
                if (Math.abs(now - sc.burstAtS) < 1e-3) {
                    List<Cloudlet> extra = new ArrayList<>();
                    for (int i = 0; i < sc.burstCloudlets; i++) {
                        Cloudlet cl = new CloudletSimple(sc.burstCloudletLen, sc.vmPes);
                        cl.setUtilizationModel(new UtilizationModelFull());
                        extra.add(cl);
                    }
                    broker.submitCloudletList(extra);
                    System.out.printf("[%s] Burst submitted at t=%.2fs: %d cloudlets\n", sc.name, now, sc.burstCloudlets);
                }
            });
        }

        simulation.addOnClockTickListener(ev -> {
            double now = simulation.clock();
            double dt = Math.max(0, now - last[0]);
            last[0] = now;
            if (dt <= 0) return;

            // Update each host manager and record per-host metrics
            for (int idx = 0; idx < hosts.size(); idx++) {
                ImmersionCoolingManager m = managers.get(idx);
                ImmersionThermalModel th = thermals.get(idx);
                Host h = hosts.get(idx);

                // Simulate pump failure: set flow to zero during the window
                double savedFlow = unit.flowRate;
                if (sc.failureStartS >= 0 && now >= sc.failureStartS && now < sc.failureStartS + sc.failureDurationS) {
                    unit.flowRate = 0.0;
                }
                m.update(now);
                // restore flow
                unit.flowRate = savedFlow;

                double util = h.getCpuPercentUtilization();
                if (h.getPowerModel() != null) {
                    double itW = h.getPowerModel().getPower(util);
                    itWh[0] += itW * dt / 3600.0;
                    double baselineCoolingW = Math.max(0.0, (airCooling.getPUE() - 1.0) * itW);
                    coolWh_baseline[0] += baselineCoolingW * dt / 3600.0;
                }

                recorder.record(now, (int) h.getId(), th, unit, powerModel,
                        m.getLastPumpPowerW(), m.getLastChillerPowerW(), m.getLastCoolingEnergyJ());

                if (th.hostTemp > policy.throttleThreshold) {
                    System.out.printf("ALERT[%s]: Host %d temp critical at t=%.0fs: %.2f C\n", sc.name, h.getId(), now, th.hostTemp);
                } else if (th.hostTemp > policy.migrationThreshold) {
                    System.out.printf("WARN[%s]: Host %d temp high at t=%.0fs: %.2f C\n", sc.name, h.getId(), now, th.hostTemp);
                }
            }
        });

        simulation.start();

        // Results
        List<Cloudlet> finished = broker.getCloudletFinishedList();
        System.out.println("Scenario " + sc.name + ": Finished cloudlets: " + finished.size());
        finished.forEach(c -> System.out.println(String.format(
                "Cloudlet %d status: %s, execTime: %.2f, start: %.2f, finish: %.2f, VM: %d",
                c.getId(), c.getStatus(), c.getActualCpuTime(), c.getExecStartTime(), c.getFinishTime(), c.getVm().getId()
        )));

        double coolingWhImmersion = powerModel.getTotalEnergyJ() / 3600.0; // J -> Wh
        double pueImmersion = (itWh[0] > 0) ? (itWh[0] + coolingWhImmersion) / itWh[0] : 1.0;
        double pueAir = airCooling.getPUE();
        System.out.printf("[%s] IT Wh: %.3f | Immersion Wh: %.3f | Air Wh: %.3f | PUE Imm: %.3f | PUE Air: %.3f | Savings Wh: %.3f\n",
                sc.name, itWh[0], coolingWhImmersion, coolWh_baseline[0], pueImmersion, pueAir,
                Math.max(0.0, coolWh_baseline[0] - coolingWhImmersion));

        try {
            String out = "dc-core/target/immersion_metrics_" + sc.name + ".csv";
            recorder.writeCsv(out);
            System.out.println("Wrote metrics: " + out);
            // Append scenario summary
            String summaryPath = "dc-core/target/scenario_summaries.csv";
            String header = "scenario,hosts,vms,vm_pes,vm_mips,cloudlet_len,bath_setpoint_C,flow_m3s,coolant,cop,tank_JperK,parallel,IT_Wh,Imm_Wh,Air_Wh,PUE_Imm,PUE_Air,Savings_Wh,Cost_Imm_USD,CO2_Imm_kg\n";
            double costImm = (coolingWhImmersion/1000.0) * sc.costPerKWhUSD;
            double co2Imm = (coolingWhImmersion/1000.0) * sc.kgCO2PerKWh;
            String row = String.format(java.util.Locale.US,
                    "%s,%d,%d,%d,%.0f,%d,%.2f,%.5f,%s,%.2f,%.0f,%s,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.4f,%.4f\n",
                    sc.name, sc.hosts, sc.vms, sc.vmPes, sc.vmMips, sc.cloudletLen, sc.bathSetpointC, sc.flowRate_m3s,
                    sc.coolantName, sc.chillerCOP, sc.tankHeatCapacityJPerK, sc.parallelFlow ? "parallel" : "series",
                    itWh[0], coolingWhImmersion, coolWh_baseline[0], pueImmersion, pueAir, Math.max(0.0, coolWh_baseline[0] - coolingWhImmersion), costImm, co2Imm);
            Path p = Paths.get(summaryPath);
            if (!Files.exists(p)) {
                Files.createDirectories(p.getParent());
                Files.write(p, header.getBytes(StandardCharsets.UTF_8));
            }
            Files.write(p, row.getBytes(StandardCharsets.UTF_8), StandardOpenOption.APPEND);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
