package com.acme.evap.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

/**
 * API endpoint for dashboard real-time status
 */
@RestController
@RequestMapping("/api/status")
public class StatusController {
    @GetMapping
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        // Provide all fields expected by DashboardStatus interface
        status.put("activeServers", 42); // Example value
        status.put("fansRunning", 87); // Example value (percent)
        status.put("cpuUtilization", 63.5); // Example value (percent)
        status.put("racksMonitored", 8); // Example value
        status.put("lastActive", "2026-03-18T10:15:00Z"); // Example ISO string
        status.put("systemAlerts", 0); // Example value
        return ResponseEntity.ok(status);
    }
}
