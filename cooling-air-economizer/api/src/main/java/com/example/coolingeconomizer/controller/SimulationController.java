package com.example.coolingeconomizer.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import com.example.coolingeconomizer.model.SimulationRequest;
import com.acme.dccore.RackSpec;
import com.acme.dccore.ServerSpec;
import com.acme.aireconcalc.ThermalIntegrator;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

    @PostMapping("/run")
    public Map<String, Object> runSimulation(@RequestBody SimulationRequest request) {
        // Build ServerSpec from request
        ServerSpec server = new ServerSpec(
                4, // cores (default)
                1000, // mipsPerCore (default)
                8192, // ramMb (default)
                100000L, // storageMb (default)
                request.serverMaxPowerW,
                request.serverIdlePowerW,
                0.94, // psuEfficiency (default)
                true, // dualPSU (default)
                0.08, // psuOverhead (default)
                450.0, // maxAirflowCFM (default)
                20.0, // deltaT_C (default)
                35.0, // maxInletTemp_C (default)
                16.0, // minInletTemp_C (default)
                request.serverMaxPowerW, // thermalDesignPower
                18.0, // fanPowerPercent (default)
                true, // variableFanSpeed (default)
                0.4, // minFanSpeed (default)
                2, // uHeight (default)
                "2U", // formFactor (default)
                800.0, // depth_mm (default)
                482.6 // width_mm (default)
        );

        // Build racks
        List<RackSpec> racks = new ArrayList<>();
        for (int i = 0; i < request.numberOfRacks; i++) {
            RackSpec rack = new RackSpec(i + 1);
            for (int j = 0; j < request.serversPerRack; j++) {
                rack.addServer(server);
            }
            racks.add(rack);
        }

        // Use average utilization for now
        double utilization = request.averageUtilization / 100.0;
        ThermalIntegrator.ThermalLoad load = ThermalIntegrator.calculateThermalLoad(racks, utilization);

        // Log the result to backend console
        System.out.println("[SimulationController] Simulation result:");
        System.out.printf("IT Load: %.2f kW, Fan Power: %.2f kW, Cooling Power: %.2f kW, PUE: %.2f\n",
                load.totalITLoadKW, load.totalFanPowerKW, load.estimatedCoolingPowerKW, load.pue);

        // Return result to frontend
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("itLoadKW", load.totalITLoadKW);
        result.put("fanPowerKW", load.totalFanPowerKW);
        result.put("coolingPowerKW", load.estimatedCoolingPowerKW);
        result.put("pue", load.pue);
        result.put("input", request);
        return result;
    }
}
