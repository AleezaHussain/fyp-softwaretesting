package com.acme.unified.api;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SimulationController {

    private final SimulationService simulationService = new SimulationService();

    @PostMapping("/simulate")
    public SimulationDtos.SimulationResult simulate(@RequestBody SimulationDtos.SimParams params) {
        return simulationService.runSimulation(params);
    }
}
