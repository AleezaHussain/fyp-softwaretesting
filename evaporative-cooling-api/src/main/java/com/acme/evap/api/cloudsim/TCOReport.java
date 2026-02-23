package com.acme.evap.api.cloudsim;

import java.util.List;

/**
 * PHASE 3: Total Cost of Ownership Report
 * 
 * Comprehensive 5-year sustainability and financial report
 */
public class TCOReport {
    
    // Financial metrics
    public final double totalOPEX;              // Total operating expenses ($)
    public final double npv;                    // Net Present Value ($)
    public final double electricityCost;        // Cumulative electricity cost ($)
    public final double waterCost;              // Cumulative water cost ($)
    public final double carbonTax;              // Cumulative carbon tax ($)
    
    // Environmental metrics
    public final double carbonEmissionsKg;      // Total CO2 emissions (kg)
    public final double totalEnergyKWh;         // Total energy consumed (kWh)
    public final double totalWaterLiters;       // Total water consumed (L)
    
    // Performance metrics
    public final double avgPUE;                 // Average Power Usage Effectiveness
    public final double maxInletTempC;          // Maximum inlet temperature (°C)
    
    // Assessment
    public final String status;                 // Cooling adequacy status
    public final List<String> recommendations;  // Engineering recommendations
    
    /**
     * Constructor
     */
    public TCOReport(double totalOPEX, double npv,
                    double electricityCost, double waterCost, double carbonTax,
                    double carbonEmissionsKg, double totalEnergyKWh, double totalWaterLiters,
                    double avgPUE, double maxInletTempC,
                    String status, List<String> recommendations) {
        this.totalOPEX = totalOPEX;
        this.npv = npv;
        this.electricityCost = electricityCost;
        this.waterCost = waterCost;
        this.carbonTax = carbonTax;
        this.carbonEmissionsKg = carbonEmissionsKg;
        this.totalEnergyKWh = totalEnergyKWh;
        this.totalWaterLiters = totalWaterLiters;
        this.avgPUE = avgPUE;
        this.maxInletTempC = maxInletTempC;
        this.status = status;
        this.recommendations = recommendations;
    }
    
    /**
     * Get cost breakdown percentages
     */
    public CostBreakdown getCostBreakdown() {
        double electricityPercent = (electricityCost / totalOPEX) * 100.0;
        double waterPercent = (waterCost / totalOPEX) * 100.0;
        double carbonTaxPercent = (carbonTax / totalOPEX) * 100.0;
        
        return new CostBreakdown(electricityPercent, waterPercent, carbonTaxPercent);
    }
    
    /**
     * Get carbon intensity (kg CO2 per kWh IT)
     */
    public double getCarbonIntensity() {
        if (totalEnergyKWh == 0) return 0.0;
        return carbonEmissionsKg / totalEnergyKWh;
    }
    
    /**
     * Get water usage effectiveness (L per kWh IT)
     */
    public double getWUE() {
        if (totalEnergyKWh == 0) return 0.0;
        return totalWaterLiters / totalEnergyKWh;
    }
    
    /**
     * Get carbon usage effectiveness (kg CO2 per kWh IT)
     */
    public double getCUE() {
        return getCarbonIntensity();
    }
    
    /**
     * Print formatted report
     */
    public void printReport() {
        System.out.println("\n═══════════════════════════════════════════════════════════");
        System.out.println("  5-YEAR SUSTAINABILITY & TCO REPORT");
        System.out.println("═══════════════════════════════════════════════════════════\n");
        
        System.out.println("📊 FINANCIAL SUMMARY:");
        System.out.println(String.format("  Total OPEX:          $%,.2f", totalOPEX));
        System.out.println(String.format("  Net Present Value:   $%,.2f", npv));
        System.out.println(String.format("  Electricity Cost:    $%,.2f (%.1f%%)", 
            electricityCost, (electricityCost/totalOPEX)*100));
        System.out.println(String.format("  Water Cost:          $%,.2f (%.1f%%)", 
            waterCost, (waterCost/totalOPEX)*100));
        System.out.println(String.format("  Carbon Tax:          $%,.2f (%.1f%%)", 
            carbonTax, (carbonTax/totalOPEX)*100));
        
        System.out.println("\n🌍 ENVIRONMENTAL IMPACT:");
        System.out.println(String.format("  CO2 Emissions:       %,.1f kg (%.1f tons)", 
            carbonEmissionsKg, carbonEmissionsKg/1000));
        System.out.println(String.format("  Total Energy:        %,.1f kWh", totalEnergyKWh));
        System.out.println(String.format("  Total Water:         %,.1f L (%.1f m³)", 
            totalWaterLiters, totalWaterLiters/1000));
        
        System.out.println("\n⚡ PERFORMANCE METRICS:");
        System.out.println(String.format("  Average PUE:         %.2f", avgPUE));
        System.out.println(String.format("  Max Inlet Temp:      %.1f°C", maxInletTempC));
        System.out.println(String.format("  Carbon Intensity:    %.3f kg CO2/kWh", getCarbonIntensity()));
        System.out.println(String.format("  WUE:                 %.2f L/kWh", getWUE()));
        
        System.out.println("\n✅ ASSESSMENT:");
        System.out.println("  Status: " + status);
        
        System.out.println("\n🔧 RECOMMENDATIONS:");
        for (String recommendation : recommendations) {
            System.out.println("  • " + recommendation);
        }
        
        System.out.println("\n═══════════════════════════════════════════════════════════\n");
    }
    
    /**
     * Convert to JSON string
     */
    public String toJson() {
        StringBuilder json = new StringBuilder();
        json.append("{\n");
        json.append("  \"financial\": {\n");
        json.append(String.format("    \"totalOPEX\": %.2f,\n", totalOPEX));
        json.append(String.format("    \"npv\": %.2f,\n", npv));
        json.append(String.format("    \"electricityCost\": %.2f,\n", electricityCost));
        json.append(String.format("    \"waterCost\": %.2f,\n", waterCost));
        json.append(String.format("    \"carbonTax\": %.2f\n", carbonTax));
        json.append("  },\n");
        json.append("  \"environmental\": {\n");
        json.append(String.format("    \"carbonEmissionsKg\": %.1f,\n", carbonEmissionsKg));
        json.append(String.format("    \"totalEnergyKWh\": %.1f,\n", totalEnergyKWh));
        json.append(String.format("    \"totalWaterLiters\": %.1f\n", totalWaterLiters));
        json.append("  },\n");
        json.append("  \"performance\": {\n");
        json.append(String.format("    \"avgPUE\": %.2f,\n", avgPUE));
        json.append(String.format("    \"maxInletTempC\": %.1f,\n", maxInletTempC));
        json.append(String.format("    \"carbonIntensity\": %.3f,\n", getCarbonIntensity()));
        json.append(String.format("    \"wue\": %.2f\n", getWUE()));
        json.append("  },\n");
        json.append("  \"assessment\": {\n");
        json.append(String.format("    \"status\": \"%s\",\n", status));
        json.append("    \"recommendations\": [\n");
        for (int i = 0; i < recommendations.size(); i++) {
            json.append(String.format("      \"%s\"", recommendations.get(i)));
            if (i < recommendations.size() - 1) json.append(",");
            json.append("\n");
        }
        json.append("    ]\n");
        json.append("  }\n");
        json.append("}\n");
        
        return json.toString();
    }
    
    /**
     * Cost breakdown data class
     */
    public static class CostBreakdown {
        public final double electricityPercent;
        public final double waterPercent;
        public final double carbonTaxPercent;
        
        public CostBreakdown(double electricityPercent, double waterPercent, double carbonTaxPercent) {
            this.electricityPercent = electricityPercent;
            this.waterPercent = waterPercent;
            this.carbonTaxPercent = carbonTaxPercent;
        }
        
        @Override
        public String toString() {
            return String.format(
                "CostBreakdown[Electricity=%.1f%%, Water=%.1f%%, CarbonTax=%.1f%%]",
                electricityPercent, waterPercent, carbonTaxPercent
            );
        }
    }
}
