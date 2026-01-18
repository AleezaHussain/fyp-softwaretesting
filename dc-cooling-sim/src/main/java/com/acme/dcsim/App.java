package com.acme.dcsim;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.schedulers.cloudlet.CloudletSchedulerTimeShared;
import org.cloudsimplus.schedulers.vm.VmSchedulerTimeShared;
import org.cloudsimplus.power.models.PowerModelHostSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelFull;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;

import java.util.ArrayList;
import java.util.List;

public class App {
    private static final int HOSTS = 4, HOST_PES = 8;
    private static final double PE_MIPS = 10_000;
    private static final long HOST_RAM = 64_000, HOST_BW = 100_000, HOST_STORAGE = 1_000_000;

    private static final int VMS = 6;
    private static final long VM_RAM = 4_096, VM_BW = 10_000, VM_SIZE = 10_000;

    private static final int CLOUDLETS = 30, CLOUDLET_PES = 2;
    private static final long CLOUDLET_LEN = 2_000_000L;

    public static void main(String[] args) {
        CloudSimPlus sim = new CloudSimPlus();

        DatacenterSimple dc = new DatacenterSimple(sim, createHosts());
        DatacenterBrokerSimple broker = new DatacenterBrokerSimple(sim);

        List<Vm> vms = createVms();
        List<Cloudlet> cls = createCloudlets();

        broker.submitVmList(vms);
        broker.submitCloudletList(cls);

        // --- simple energy accounting with constant PUE ---
        final double PUE = 1.40;
        final double[] last = { sim.clock() };
        final double[] itWh = { 0.0 };
        final double[] coolWh = { 0.0 };

        sim.addOnClockTickListener(ev -> {
            double now = sim.clock();
            double dt = Math.max(0, now - last[0]); // seconds
            last[0] = now;
            if (dt <= 0) return;

            double itW = totalItPowerW(dc);
            itWh[0]   += itW * dt / 3600.0;
            double coolingW = Math.max(0.0, (PUE - 1.0) * itW);
            coolWh[0] += coolingW * dt / 3600.0;
        });

        sim.start();

        double pue = (itWh[0] > 0) ? (itWh[0] + coolWh[0]) / itWh[0] : 1.0;
        System.out.printf("IT Energy        : %.3f kWh%n", itWh[0] / 1000.0);
        System.out.printf("Cooling Energy   : %.3f kWh%n", coolWh[0] / 1000.0);
        System.out.printf("Facility Energy  : %.3f kWh%n", (itWh[0] + coolWh[0]) / 1000.0);
        System.out.printf("Effective PUE    : %.3f%n", pue);
    }

    private static double totalItPowerW(DatacenterSimple dc) {
        double sum = 0.0;
        for (Host h : dc.getHostList()) {
            if (h.getPowerModel() == null) continue;
            double util = h.getCpuPercentUtilization(); // 0..1
            sum += h.getPowerModel().getPower(util);
        }
        return sum;
    }

    private static List<Host> createHosts() {
        List<Host> list = new ArrayList<>(HOSTS);
        for (int i = 0; i < HOSTS; i++) {
            List<Pe> pes = new ArrayList<>(HOST_PES);
            for (int p = 0; p < HOST_PES; p++) pes.add(new PeSimple(PE_MIPS));

            HostSimple h = new HostSimple(HOST_RAM, HOST_BW, HOST_STORAGE, pes);
            h.setVmScheduler(new VmSchedulerTimeShared());

            // PowerModelHostSimple(maxPowerWatts, staticPowerAtIdleWatts)
            // Example: 250W max, 100W idle (~40% of max)
            h.setPowerModel(new PowerModelHostSimple(250, 100));

            list.add(h);
        }
        return list;
    }

    private static List<Vm> createVms() {
        List<Vm> list = new ArrayList<>(VMS);
        for (int i = 0; i < VMS; i++) {
            Vm vm = new VmSimple(PE_MIPS, 2)
                    .setRam(VM_RAM).setBw(VM_BW).setSize(VM_SIZE)
                    .setCloudletScheduler(new CloudletSchedulerTimeShared());
            list.add(vm);
        }
        return list;
    }

    private static List<Cloudlet> createCloudlets() {
        List<Cloudlet> list = new ArrayList<>(CLOUDLETS);
        for (int i = 0; i < CLOUDLETS; i++) {
            Cloudlet cl = new CloudletSimple(CLOUDLET_LEN, CLOUDLET_PES);
            cl.setSizes(300);
            cl.setUtilizationModelCpu(new UtilizationModelFull());
            list.add(cl);
        }
        return list;
    }
}
