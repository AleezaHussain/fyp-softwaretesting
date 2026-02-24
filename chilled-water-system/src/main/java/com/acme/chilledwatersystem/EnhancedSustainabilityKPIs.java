package com.acme.chilledwatersystem;

/**
 * Phase 3 Part 3 - Phase 3: Enhanced Sustainability KPIs
 * 
 * Extends basic KPIs (PUE, WUE, CUE) with Scope 3 emissions,
 * Life-Cycle Climate Performance (LCCP), and Total Equivalent Warming Impact (TEWI).
 */
public class EnhancedSustainabilityKPIs {
    
    private final WorkloadAggregator workloadAgg;
    private final CarbonConfig carbonConfig;
    private final EconomicConfig economicConfig;
    
    // Embodied carbon factors (kg CO2e per unit)
    private static final double CHILLER_EMBODIED_KG_PER_KW = 150.0; // kg CO2e per kW capacity
    private static final double SERVER_EMBODIED_KG_PER_UNIT = 1200.0; // kg CO2e per server
    private static final double BUILDING_EMBODIED_KG_PER_M2 = 400.0; // kg CO2e per m²
    
    // Refrigerant leakage (for TEWI calculation)
    private static final double REFRIGERANT_LEAKAGE_RATE = 0.02; // 2% annual leakage
    private static final double REFRIGERANT_GWP = 1430.0; // R-134a GWP (100-year)
    
    public EnhancedSustainabilityKPIs(WorkloadAggregator workloadAgg,
                                     CarbonConfig carbonConfig,
                                     EconomicConfig economicConfig) {
        this.workloadAgg = workloadAgg;
        this.carbonConfig = carbonConfig;
        this.economicConfig = economicConfig;
    }
    
    /**
     * Calculate basic operational KPIs
     */
    public BasicKPIs calculateBasicKPIs() {
        BasicKPIs kpis = new BasicKPIs();
        
        double itEnergy = workloadAgg.getTotalITEnergyKWh();
        double facilityEnergy = workloadAgg.getTotalFacilityEnergyKWh();
        
        // PUE (Power Usage Effectiveness)
        kpis.pue = facilityEnergy / itEnergy;
        
        // WUE (Water Usage Effectiveness) - estimated from cooling
        double coolingEnergy = workloadAgg.getTotalCoolingEnergyKWh();
        double waterLiters = coolingEnergy * 1.8; // 1.8 L/kWh for cooling towers
        kpis.wue = waterLiters / itEnergy;
        
        // CUE (Carbon Usage Effectiveness)
        double carbonKg = facilityEnergy * carbonConfig.getGridCarbonFactorKgPerKwh();
        kpis.cue = carbonKg / itEnergy;
        
        return kpis;
    }
    
    /**
     * Calculate Scope 1, 2, and 3 emissions
     */
    public ScopeEmissions calculateScopeEmissions(int horizon) {
        ScopeEmissions emissions = new ScopeEmissions();
        
        // Scope 1: Direct emissions (refrigerant leakage)
        double chillerCapacityKW = 150.0; // Typical chiller capacity
        double refrigerantChargeKg = chillerCapacityKW * 0.5; // ~0.5 kg per kW
        emissions.scope1AnnualKg = refrigerantChargeKg * REFRIGERANT_LEAKAGE_RATE * REFRIGERANT_GWP;
        emissions.scope1LifecycleKg = emissions.scope1AnnualKg * horizon;
        
        // Scope 2: Indirect emissions from electricity
        double annualEnergyKWh = workloadAgg.getTotalFacilityEnergyKWh();
        emissions.scope2AnnualKg = annualEnergyKWh * carbonConfig.getGridCarbonFactorKgPerKwh();
        emissions.scope2LifecycleKg = emissions.scope2AnnualKg * horizon;
        
        // Scope 3: Embodied emissions (equipment manufacturing, transport, disposal)
        emissions.scope3ChillerKg = chillerCapacityKW * CHILLER_EMBODIED_KG_PER_KW;
        
        int numServers = 20; // Typical edge data center
        emissions.scope3ServersKg = numServers * SERVER_EMBODIED_KG_PER_UNIT;
        
        // Equipment refresh cycles
        double refreshYears = workloadAgg.getEquipmentRefreshYears();
        int numRefreshes = (int)(horizon / refreshYears);
        emissions.scope3ServersKg *= (1 + numRefreshes); // Initial + refreshes
        
        double buildingAreaM2 = 200.0; // Typical edge facility
        emissions.scope3BuildingKg = buildingAreaM2 * BUILDING_EMBODIED_KG_PER_M2;
        
        emissions.scope3TotalKg = emissions.scope3ChillerKg + 
                                  emissions.scope3ServersKg + 
                                  emissions.scope3BuildingKg;
        
        // Total lifecycle emissions
        emissions.totalLifecycleKg = emissions.scope1LifecycleKg + 
                                     emissions.scope2LifecycleKg + 
                                     emissions.scope3TotalKg;
        
        return emissions;
    }
    
    /**
     * Calculate Life-Cycle Climate Performance (LCCP)
     * 
     * LCCP = Direct emissions + Indirect emissions + Embodied emissions
     */
    public double calculateLCCP(int horizon) {
        ScopeEmissions emissions = calculateScopeEmissions(horizon);
        return emissions.totalLifecycleKg / 1000.0; // Convert to tons
    }
    
    /**
     * Calculate Total Equivalent Warming Impact (TEWI)
     * 
     * TEWI = (GWP × L × n) + (n × E × β)
     * Where:
     * - GWP = Global Warming Potential of refrigerant
     * - L = Annual leakage rate
     * - n = System lifetime
     * - E = Annual energy consumption
     * - β = Carbon intensity of electricity
     */
    public double calculateTEWI(int horizon) {
        double chillerCapacityKW = 150.0;
        double refrigerantChargeKg = chillerCapacityKW * 0.5;
        
        // Direct refrigerant impact
        double directImpact = REFRIGERANT_GWP * 
                             (refrigerantChargeKg * REFRIGERANT_LEAKAGE_RATE) * 
                             horizon;
        
        // Indirect energy impact
        double annualEnergyKWh = workloadAgg.getTotalFacilityEnergyKWh();
        double indirectImpact = horizon * annualEnergyKWh * carbonConfig.getGridCarbonFactorKgPerKwh();
        
        return (directImpact + indirectImpact) / 1000.0; // Convert to tons
    }
    
    /**
     * Calculate embodied carbon reduction from liquid cooling
     * 
     * Liquid-cooled AI facilities can reduce embodied carbon by up to 30%
     * due to smaller building footprint and reduced HVAC material.
     */
    public double calculateEmbodiedCarbonReduction(String coolingType) {
        if (coolingType.contains("LIQUID")) {
            // Liquid cooling reduces:
            // - Building size by 20% (smaller footprint)
            // - HVAC material by 40% (less ductwork, smaller chillers)
            return 0.30; // 30% reduction
        }
        return 0.0;
    }
    
    /**
     * Print enhanced sustainability summary
     */
    public void printSummary() {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  ENHANCED SUSTAINABILITY KPIs                                         ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        int horizon = economicConfig.getAnalysisHorizonYears();
        
        BasicKPIs basic = calculateBasicKPIs();
        System.out.println("BASIC OPERATIONAL KPIs:");
        System.out.printf("  PUE: %.3f\n", basic.pue);
        System.out.printf("  WUE: %.2f L/kWh\n", basic.wue);
        System.out.printf("  CUE: %.3f kg CO2/kWh\n", basic.cue);
        System.out.println();
        
        ScopeEmissions emissions = calculateScopeEmissions(horizon);
        System.out.println("SCOPE 1, 2, 3 EMISSIONS:");
        System.out.printf("  Scope 1 (Direct - Refrigerant): %.2f tons CO2e/year\n", 
            emissions.scope1AnnualKg / 1000.0);
        System.out.printf("  Scope 2 (Indirect - Electricity): %.2f tons CO2e/year\n", 
            emissions.scope2AnnualKg / 1000.0);
        System.out.printf("  Scope 3 (Embodied - Equipment): %.2f tons CO2e (lifecycle)\n", 
            emissions.scope3TotalKg / 1000.0);
        System.out.printf("    - Chiller: %.2f tons\n", emissions.scope3ChillerKg / 1000.0);
        System.out.printf("    - Servers: %.2f tons\n", emissions.scope3ServersKg / 1000.0);
        System.out.printf("    - Building: %.2f tons\n", emissions.scope3BuildingKg / 1000.0);
        System.out.println();
        
        double lccp = calculateLCCP(horizon);
        double tewi = calculateTEWI(horizon);
        
        System.out.println("LIFECYCLE CLIMATE METRICS:");
        System.out.printf("  LCCP (Life-Cycle Climate Performance): %.2f tons CO2e\n", lccp);
        System.out.printf("  TEWI (Total Equivalent Warming Impact): %.2f tons CO2e\n", tewi);
        System.out.printf("  Total Lifecycle Emissions: %.2f tons CO2e\n", 
            emissions.totalLifecycleKg / 1000.0);
        System.out.println();
        
        // Scope 3 percentage
        double scope3Percent = (emissions.scope3TotalKg / emissions.totalLifecycleKg) * 100.0;
        System.out.printf("  Scope 3 represents %.1f%% of lifecycle emissions\n", scope3Percent);
        
        if (scope3Percent > 30.0) {
            System.out.println("  ⚠️  High embodied carbon - consider liquid cooling to reduce by 30%%");
        }
        System.out.println();
    }
    
    /**
     * Inner class for basic KPIs
     */
    public static class BasicKPIs {
        public double pue;
        public double wue;
        public double cue;
    }
    
    /**
     * Inner class for scope emissions
     */
    public static class ScopeEmissions {
        public double scope1AnnualKg;
        public double scope1LifecycleKg;
        public double scope2AnnualKg;
        public double scope2LifecycleKg;
        public double scope3ChillerKg;
        public double scope3ServersKg;
        public double scope3BuildingKg;
        public double scope3TotalKg;
        public double totalLifecycleKg;
    }
}
