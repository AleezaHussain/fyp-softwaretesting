package com.acme.dccore;

import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import java.util.ArrayList;
import java.util.List;

public class WorkloadGenerator {

    public static List<Cloudlet> generateWorkload(int numCloudlets, int length, int pes) {
        List<Cloudlet> cloudlets = new ArrayList<>();
        for (int i = 0; i < numCloudlets; i++) {
            Cloudlet cloudlet = new CloudletSimple(i, length, pes);
            cloudlet.setUtilizationModelCpu(new UtilizationModelDynamic(0.7)); // 70% CPU usage
            cloudlets.add(cloudlet);
        }
        return cloudlets;
    }
}
