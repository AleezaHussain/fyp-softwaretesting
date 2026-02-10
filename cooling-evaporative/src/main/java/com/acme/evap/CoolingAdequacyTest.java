package com.acme.evap;

/**
 * Simple test to verify cooling adequacy assessment system
 */
public class CoolingAdequacyTest {
    
    public static void main(String[] args) {
        System.out.println("🔥 Testing Cooling Adequacy Assessment System\n");
        
        // Test Case 1: Insufficient Cooling
        System.out.println("TEST 1: Insufficient Cooling");
        CoolingAdequacyAssessment.Assessment test1 = CoolingAdequacyAssessment.evaluate(
            150.0, // cooling capacity kW
            200.0, // heat load kW  
            29.5,  // max inlet temp C
            65.0,  // max humidity %
            8.0,   // min wetbulb depression C
            1.65,  // avg PUE
            "DEC", // cooling mode
            35.0   // ambient temp C
        );
        printAssessment(test1);
        
        // Test Case 2: Climate Limited
        System.out.println("\nTEST 2: Climate Limited");
        CoolingAdequacyAssessment.Assessment test2 = CoolingAdequacyAssessment.evaluate(
            180.0, // cooling capacity kW
            175.0, // heat load kW
            26.0,  // max inlet temp C
            85.0,  // max humidity % (too high)
            3.0,   // min wetbulb depression C (too low)
            1.35,  // avg PUE
            "DEC", // cooling mode
            32.0   // ambient temp C
        );
        printAssessment(test2);
        
        // Test Case 3: Cooling Sufficient
        System.out.println("\nTEST 3: Cooling Sufficient");
        CoolingAdequacyAssessment.Assessment test3 = CoolingAdequacyAssessment.evaluate(
            200.0, // cooling capacity kW
            180.0, // heat load kW
            24.5,  // max inlet temp C
            60.0,  // max humidity %
            12.0,  // min wetbulb depression C
            1.25,  // avg PUE
            "IEC", // cooling mode
            28.0   // ambient temp C
        );
        printAssessment(test3);
        
        // Test Case 4: Local Hotspots
        System.out.println("\nTEST 4: Local Hotspots");
        CoolingAdequacyAssessment.Assessment test4 = CoolingAdequacyAssessment.evaluate(
            190.0, // cooling capacity kW
            185.0, // heat load kW
            28.5,  // max inlet temp C (exceeds 27°C limit)
            70.0,  // max humidity %
            10.0,  // min wetbulb depression C
            1.40,  // avg PUE
            "DEC", // cooling mode
            30.0   // ambient temp C
        );
        printAssessment(test4);
    }
    
    private static void printAssessment(CoolingAdequacyAssessment.Assessment assessment) {
        System.out.println("Status: " + assessment.status + 
                          " (Confidence: " + String.format("%.1f%%", assessment.confidence * 100) + ")");
        
        System.out.println("Checks:");
        System.out.println("  Heat Balance: " + (assessment.checks.heat_balance ? "✅ PASS" : "❌ FAIL"));
        System.out.println("  Inlet Temp: " + (assessment.checks.inlet_temperature_ok ? "✅ PASS" : "❌ FAIL"));
        System.out.println("  Humidity: " + (assessment.checks.humidity_ok ? "✅ PASS" : "❌ FAIL"));
        System.out.println("  Energy Eff: " + (assessment.checks.energy_efficiency_ok ? "✅ PASS" : "❌ FAIL"));
        
        System.out.println("Key Metrics:");
        System.out.println("  Max Inlet: " + String.format("%.1f°C", assessment.key_metrics.max_inlet_temp_c));
        System.out.println("  Cooling/Heat: " + String.format("%.0f/%.0f kW", 
                          assessment.key_metrics.cooling_capacity_kw, assessment.key_metrics.heat_load_kw));
        System.out.println("  PUE: " + String.format("%.2f", assessment.key_metrics.pue_avg));
        
        System.out.println("Top Recommendations:");
        for (int i = 0; i < Math.min(2, assessment.recommendations.size()); i++) {
            System.out.println("  🔧 " + assessment.recommendations.get(i));
        }
    }
}