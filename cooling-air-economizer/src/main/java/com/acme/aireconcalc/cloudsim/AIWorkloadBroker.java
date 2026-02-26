package com.acme.aireconcalc.cloudsim;

import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.vms.Vm;

import java.util.ArrayList;
import java.util.List;

/**
 * AI Workload Broker - Intelligent task assignment for AI workloads
 * 
 * PHASE 2 COMPONENT 3: Custom broker that differentiates between Training and Inference
 * 
 * This broker extends DatacenterBrokerSimple to provide workload-aware VM assignment:
 * - Training cloudlets → VMs with 1.8x power multiplier
 * - Inference cloudlets → VMs with 1.4x power multiplier
 * - Mixed cloudlets → VMs with 1.3x power multiplier
 * - Enterprise cloudlets → VMs with 1.0x power multiplier
 * 
 * This ensures that the correct AIWorkloadPowerModel is applied to each task type,
 * providing accurate heat density calculations for the cooling system.
 */
public class AIWorkloadBroker extends DatacenterBrokerSimple {
    
    // VM pools for different workload types
    private List<Vm> trainingVMs = new ArrayList<>();
    private List<Vm> inferenceVMs = new ArrayList<>();
    private List<Vm> mixedVMs = new ArrayList<>();
    private List<Vm> enterpriseVMs = new ArrayList<>();
    
    // Round-robin indices for load balancing
    private int trainingVMIndex = 0;
    private int inferenceVMIndex = 0;
    private int mixedVMIndex = 0;
    private int enterpriseVMIndex = 0;
    
    /**
     * Create AI Workload Broker
     * 
     * @param simulation CloudSim simulation instance
     */
    public AIWorkloadBroker(CloudSimPlus simulation) {
        super(simulation);
    }
    
    /**
     * Create AI Workload Broker with custom name
     * 
     * @param simulation CloudSim simulation instance
     * @param name Broker name
     */
    public AIWorkloadBroker(CloudSimPlus simulation, String name) {
        super(simulation, name);
    }
    
    /**
     * Register VMs by workload type
     * 
     * This method categorizes VMs based on their host's power model,
     * enabling intelligent cloudlet assignment.
     * 
     * @param vmList List of VMs to register
     */
    @Override
    public DatacenterBroker submitVmList(List<? extends Vm> vmList) {
        DatacenterBroker result = super.submitVmList(vmList);
        
        // Categorize VMs by their host's power model
        for (Vm vm : vmList) {
            if (vm.getHost() != null && vm.getHost().getPowerModel() instanceof AIWorkloadPowerModel) {
                AIWorkloadPowerModel powerModel = (AIWorkloadPowerModel) vm.getHost().getPowerModel();
                double multiplier = powerModel.getWorkloadMultiplier();
                
                // Categorize based on multiplier
                if (Math.abs(multiplier - 1.8) < 0.01) {
                    trainingVMs.add(vm);
                } else if (Math.abs(multiplier - 1.4) < 0.01) {
                    inferenceVMs.add(vm);
                } else if (Math.abs(multiplier - 1.3) < 0.01) {
                    mixedVMs.add(vm);
                } else {
                    enterpriseVMs.add(vm);
                }
            } else {
                // Default to enterprise if power model not available
                enterpriseVMs.add(vm);
            }
        }
        
        System.out.println("[AIWorkloadBroker] VM categorization complete:");
        System.out.println("  Training VMs: " + trainingVMs.size());
        System.out.println("  Inference VMs: " + inferenceVMs.size());
        System.out.println("  Mixed VMs: " + mixedVMs.size());
        System.out.println("  Enterprise VMs: " + enterpriseVMs.size());
        return result;
    }
    
    /**
     * Submit AI Training workload
     * 
     * Assigns cloudlets to VMs with 1.8x power multiplier
     * 
     * @param cloudletList List of training cloudlets
     */
    public void submitAITrainingWorkload(List<Cloudlet> cloudletList) {
        if (trainingVMs.isEmpty()) {
            System.err.println("[AIWorkloadBroker] WARNING: No training VMs available, using enterprise VMs");
            submitCloudletList(cloudletList);
            return;
        }
        
        // Assign cloudlets to training VMs using round-robin
        for (Cloudlet cloudlet : cloudletList) {
            Vm vm = trainingVMs.get(trainingVMIndex % trainingVMs.size());
            cloudlet.setVm(vm);
            trainingVMIndex++;
        }
        
        submitCloudletList(cloudletList);
        System.out.println("[AIWorkloadBroker] Submitted " + cloudletList.size() + " training cloudlets");
    }
    
    /**
     * Submit AI Inference workload
     * 
     * Assigns cloudlets to VMs with 1.4x power multiplier
     * 
     * @param cloudletList List of inference cloudlets
     */
    public void submitAIInferenceWorkload(List<Cloudlet> cloudletList) {
        if (inferenceVMs.isEmpty()) {
            System.err.println("[AIWorkloadBroker] WARNING: No inference VMs available, using enterprise VMs");
            submitCloudletList(cloudletList);
            return;
        }
        
        // Assign cloudlets to inference VMs using round-robin
        for (Cloudlet cloudlet : cloudletList) {
            Vm vm = inferenceVMs.get(inferenceVMIndex % inferenceVMs.size());
            cloudlet.setVm(vm);
            inferenceVMIndex++;
        }
        
        submitCloudletList(cloudletList);
        System.out.println("[AIWorkloadBroker] Submitted " + cloudletList.size() + " inference cloudlets");
    }
    
    /**
     * Submit Mixed workload
     * 
     * Assigns cloudlets to VMs with 1.3x power multiplier
     * 
     * @param cloudletList List of mixed cloudlets
     */
    public void submitMixedWorkload(List<Cloudlet> cloudletList) {
        if (mixedVMs.isEmpty()) {
            System.err.println("[AIWorkloadBroker] WARNING: No mixed VMs available, using enterprise VMs");
            submitCloudletList(cloudletList);
            return;
        }
        
        // Assign cloudlets to mixed VMs using round-robin
        for (Cloudlet cloudlet : cloudletList) {
            Vm vm = mixedVMs.get(mixedVMIndex % mixedVMs.size());
            cloudlet.setVm(vm);
            mixedVMIndex++;
        }
        
        submitCloudletList(cloudletList);
        System.out.println("[AIWorkloadBroker] Submitted " + cloudletList.size() + " mixed cloudlets");
    }
    
    /**
     * Submit Enterprise workload
     * 
     * Assigns cloudlets to VMs with 1.0x power multiplier
     * 
     * @param cloudletList List of enterprise cloudlets
     */
    public void submitEnterpriseWorkload(List<Cloudlet> cloudletList) {
        if (enterpriseVMs.isEmpty()) {
            System.err.println("[AIWorkloadBroker] WARNING: No enterprise VMs available");
            submitCloudletList(cloudletList);
            return;
        }
        
        // Assign cloudlets to enterprise VMs using round-robin
        for (Cloudlet cloudlet : cloudletList) {
            Vm vm = enterpriseVMs.get(enterpriseVMIndex % enterpriseVMs.size());
            cloudlet.setVm(vm);
            enterpriseVMIndex++;
        }
        
        submitCloudletList(cloudletList);
        System.out.println("[AIWorkloadBroker] Submitted " + cloudletList.size() + " enterprise cloudlets");
    }
    
    /**
     * Submit workload by type string
     * 
     * Convenience method for string-based workload type specification
     * 
     * @param cloudletList List of cloudlets
     * @param workloadType Workload type: "TRAINING", "INFERENCE", "MIXED", or "ENTERPRISE"
     */
    public void submitWorkloadByType(List<Cloudlet> cloudletList, String workloadType) {
        switch (workloadType.toUpperCase()) {
            case "TRAINING":
            case "AI_TRAINING":
                submitAITrainingWorkload(cloudletList);
                break;
            case "INFERENCE":
            case "AI_INFERENCE":
                submitAIInferenceWorkload(cloudletList);
                break;
            case "MIXED":
            case "MIXED_AI":
                submitMixedWorkload(cloudletList);
                break;
            case "ENTERPRISE":
            default:
                submitEnterpriseWorkload(cloudletList);
                break;
        }
    }
    
    /**
     * Get training VMs
     * 
     * @return List of training VMs
     */
    public List<Vm> getTrainingVMs() {
        return trainingVMs;
    }
    
    /**
     * Get inference VMs
     * 
     * @return List of inference VMs
     */
    public List<Vm> getInferenceVMs() {
        return inferenceVMs;
    }
    
    /**
     * Get mixed VMs
     * 
     * @return List of mixed VMs
     */
    public List<Vm> getMixedVMs() {
        return mixedVMs;
    }
    
    /**
     * Get enterprise VMs
     * 
     * @return List of enterprise VMs
     */
    public List<Vm> getEnterpriseVMs() {
        return enterpriseVMs;
    }
    
    @Override
    public String toString() {
        return String.format("AIWorkloadBroker[training=%d, inference=%d, mixed=%d, enterprise=%d]",
                           trainingVMs.size(), inferenceVMs.size(), mixedVMs.size(), enterpriseVMs.size());
    }
}
