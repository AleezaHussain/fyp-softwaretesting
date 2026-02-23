package com.acme.chilledwatersystem;

import java.util.*;

/**
 * Phase 4 Part 4 - Section 4.1: Multi-Objective Optimization (MOO)
 * 
 * Implements NSGA-II (Non-dominated Sorting Genetic Algorithm II) to find
 * the Pareto Frontier of optimal designs balancing:
 * - Minimize TEWI (Total Equivalent Warming Impact)
 * - Maximize Escalated NPV
 * - Minimize WUE (Water Usage Effectiveness)
 */
public class MultiObjectiveOptimizer {
    
    private final int populationSize;
    private final int maxGenerations;
    private final double crossoverRate;
    private final double mutationRate;
    private final Random random;
    
    // Design space bounds
    private static final double MIN_SUPPLY_TEMP = 5.0;  // °C
    private static final double MAX_SUPPLY_TEMP = 12.0; // °C
    private static final double MIN_TOWER_APPROACH = 3.0; // °C
    private static final double MAX_TOWER_APPROACH = 8.0; // °C
    private static final double MIN_RACK_DENSITY = 10.0; // kW/rack
    private static final double MAX_RACK_DENSITY = 100.0; // kW/rack
    private static final String[] COOLING_TECHNOLOGIES = {"CHILLED_WATER", "IMMERSION", "HYBRID"};
    
    public MultiObjectiveOptimizer(int populationSize, int maxGenerations) {
        this.populationSize = populationSize;
        this.maxGenerations = maxGenerations;
        this.crossoverRate = 0.9;
        this.mutationRate = 0.1;
        this.random = new Random(42); // Fixed seed for reproducibility
    }
    
    /**
     * Run NSGA-II optimization
     */
    public List<DesignSolution> optimize(WorkloadSituation situation,
                                        EdgeDataCenterScenario baseScenario,
                                        EconomicConfig economicConfig,
                                        CarbonConfig carbonConfig) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  MULTI-OBJECTIVE OPTIMIZATION (NSGA-II)                               ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.printf("Population Size: %d\n", populationSize);
        System.out.printf("Max Generations: %d\n", maxGenerations);
        System.out.printf("Objectives: Minimize TEWI, Maximize NPV, Minimize WUE\n\n");
        
        // Initialize population
        List<DesignSolution> population = initializePopulation();
        
        // Evaluate initial population
        evaluatePopulation(population, situation, baseScenario, economicConfig, carbonConfig);
        
        // Evolution loop
        for (int gen = 1; gen <= maxGenerations; gen++) {
            // Create offspring through crossover and mutation
            List<DesignSolution> offspring = createOffspring(population);
            
            // Evaluate offspring
            evaluatePopulation(offspring, situation, baseScenario, economicConfig, carbonConfig);
            
            // Combine parent and offspring
            List<DesignSolution> combined = new ArrayList<>(population);
            combined.addAll(offspring);
            
            // Non-dominated sorting
            List<List<DesignSolution>> fronts = fastNonDominatedSort(combined);
            
            // Select next generation
            population = selectNextGeneration(fronts);
            
            if (gen % 10 == 0 || gen == maxGenerations) {
                System.out.printf("Generation %d: Pareto Front Size = %d\n", 
                    gen, fronts.get(0).size());
            }
        }
        
        // Return Pareto front (rank 0)
        List<List<DesignSolution>> finalFronts = fastNonDominatedSort(population);
        List<DesignSolution> paretoFront = finalFronts.get(0);
        
        System.out.printf("\n✅ Optimization complete! Found %d Pareto-optimal solutions\n", 
            paretoFront.size());
        
        return paretoFront;
    }
    
    /**
     * Initialize random population
     */
    private List<DesignSolution> initializePopulation() {
        List<DesignSolution> population = new ArrayList<>();
        
        for (int i = 0; i < populationSize; i++) {
            double supplyTemp = MIN_SUPPLY_TEMP + random.nextDouble() * (MAX_SUPPLY_TEMP - MIN_SUPPLY_TEMP);
            double towerApproach = MIN_TOWER_APPROACH + random.nextDouble() * (MAX_TOWER_APPROACH - MIN_TOWER_APPROACH);
            double rackDensity = MIN_RACK_DENSITY + random.nextDouble() * (MAX_RACK_DENSITY - MIN_RACK_DENSITY);
            String technology = COOLING_TECHNOLOGIES[random.nextInt(COOLING_TECHNOLOGIES.length)];
            
            population.add(new DesignSolution(supplyTemp, towerApproach, rackDensity, technology));
        }
        
        return population;
    }
    
    /**
     * Evaluate population by simulating each design
     */
    private void evaluatePopulation(List<DesignSolution> population,
                                    WorkloadSituation situation,
                                    EdgeDataCenterScenario baseScenario,
                                    EconomicConfig economicConfig,
                                    CarbonConfig carbonConfig) {
        for (DesignSolution solution : population) {
            // Simplified evaluation (in real implementation, run full simulation)
            evaluateSolution(solution, situation, baseScenario, economicConfig, carbonConfig);
        }
    }
    
    /**
     * Evaluate a single solution
     */
    private void evaluateSolution(DesignSolution solution,
                                  WorkloadSituation situation,
                                  EdgeDataCenterScenario baseScenario,
                                  EconomicConfig economicConfig,
                                  CarbonConfig carbonConfig) {
        // Simplified evaluation model
        // In full implementation, this would run the complete 8760-hour simulation
        
        double supplyTemp = solution.getSupplyWaterTempC();
        double rackDensity = solution.getRackDensityKW();
        String technology = solution.getCoolingTechnology();
        
        // Estimate PUE based on design parameters
        double basePUE = 1.3;
        if (technology.equals("IMMERSION")) {
            basePUE = 1.05; // Liquid cooling is more efficient
        } else if (technology.equals("HYBRID")) {
            basePUE = 1.15;
        }
        
        // Lower supply temp = higher chiller power = higher PUE
        double tempPenalty = (12.0 - supplyTemp) * 0.02;
        double pue = basePUE + tempPenalty;
        solution.setPue(pue);
        
        // Estimate annual energy
        double itEnergyMWh = 800.0; // Simplified
        double facilityEnergyMWh = itEnergyMWh * pue;
        
        // Calculate TEWI (simplified)
        double operationalCarbon = facilityEnergyMWh * 1000 * carbonConfig.getGridCarbonFactorKgPerKwh();
        double embodiedCarbon = 50000; // kg CO2e
        double refrigerantLeakage = 2000; // kg CO2e/year
        double tewi = (operationalCarbon * 15 + embodiedCarbon + refrigerantLeakage * 15) / 1000.0; // tons
        solution.setTewi(tewi);
        
        // Calculate NPV (simplified)
        double annualSavings = 50000 - (facilityEnergyMWh * 120); // $0.12/kWh
        double capex = 200000;
        if (technology.equals("IMMERSION")) {
            capex = 400000; // Higher upfront cost
        }
        double npv = -capex + annualSavings * 8.0; // Simplified NPV
        solution.setEscalatedNPV(npv);
        
        // Calculate WUE
        double wue = 0.5;
        if (technology.equals("CHILLED_WATER")) {
            wue = 1.8; // Evaporative cooling uses more water
        } else if (technology.equals("IMMERSION")) {
            wue = 0.1; // Minimal water usage
        }
        solution.setWue(wue);
        
        // Thermal throttling (higher density = more throttling)
        double throttlingHours = Math.max(0, (rackDensity - 30.0) * 50);
        solution.setThermalThrottlingHours(throttlingHours);
    }
    
    /**
     * Fast non-dominated sorting (NSGA-II)
     */
    private List<List<DesignSolution>> fastNonDominatedSort(List<DesignSolution> population) {
        List<List<DesignSolution>> fronts = new ArrayList<>();
        fronts.add(new ArrayList<>());
        
        // Reset domination counts
        for (DesignSolution p : population) {
            p.setDominationCount(0);
            p.setRank(0);
        }
        
        // Find first front
        for (int i = 0; i < population.size(); i++) {
            DesignSolution p = population.get(i);
            int dominationCount = 0;
            
            for (int j = 0; j < population.size(); j++) {
                if (i == j) continue;
                DesignSolution q = population.get(j);
                
                if (q.dominates(p)) {
                    dominationCount++;
                }
            }
            
            p.setDominationCount(dominationCount);
            if (dominationCount == 0) {
                p.setRank(0);
                fronts.get(0).add(p);
            }
        }
        
        // Find subsequent fronts
        int currentRank = 0;
        while (!fronts.get(currentRank).isEmpty()) {
            List<DesignSolution> nextFront = new ArrayList<>();
            
            for (DesignSolution p : fronts.get(currentRank)) {
                for (DesignSolution q : population) {
                    if (p.dominates(q)) {
                        q.setDominationCount(q.getDominationCount() - 1);
                        if (q.getDominationCount() == 0) {
                            q.setRank(currentRank + 1);
                            nextFront.add(q);
                        }
                    }
                }
            }
            
            currentRank++;
            if (!nextFront.isEmpty()) {
                fronts.add(nextFront);
            } else {
                break;
            }
        }
        
        return fronts;
    }
    
    /**
     * Calculate crowding distance for diversity preservation
     */
    private void calculateCrowdingDistance(List<DesignSolution> front) {
        int size = front.size();
        if (size == 0) return;
        
        // Initialize distances
        for (DesignSolution solution : front) {
            solution.setCrowdingDistance(0.0);
        }
        
        // For each objective
        for (int obj = 0; obj < 3; obj++) {
            final int objective = obj;
            
            // Sort by objective
            front.sort((a, b) -> {
                double aVal = getObjectiveValue(a, objective);
                double bVal = getObjectiveValue(b, objective);
                return Double.compare(aVal, bVal);
            });
            
            // Boundary solutions get infinite distance
            front.get(0).setCrowdingDistance(Double.POSITIVE_INFINITY);
            front.get(size - 1).setCrowdingDistance(Double.POSITIVE_INFINITY);
            
            // Calculate distances for middle solutions
            double minVal = getObjectiveValue(front.get(0), objective);
            double maxVal = getObjectiveValue(front.get(size - 1), objective);
            double range = maxVal - minVal;
            
            if (range > 0) {
                for (int i = 1; i < size - 1; i++) {
                    double distance = front.get(i).getCrowdingDistance();
                    double prevVal = getObjectiveValue(front.get(i - 1), objective);
                    double nextVal = getObjectiveValue(front.get(i + 1), objective);
                    distance += (nextVal - prevVal) / range;
                    front.get(i).setCrowdingDistance(distance);
                }
            }
        }
    }
    
    /**
     * Get objective value by index
     */
    private double getObjectiveValue(DesignSolution solution, int objective) {
        switch (objective) {
            case 0: return solution.getTewi(); // Minimize
            case 1: return -solution.getEscalatedNPV(); // Maximize (negate for sorting)
            case 2: return solution.getWue(); // Minimize
            default: return 0.0;
        }
    }
    
    /**
     * Select next generation using elitism
     */
    private List<DesignSolution> selectNextGeneration(List<List<DesignSolution>> fronts) {
        List<DesignSolution> nextGen = new ArrayList<>();
        
        for (List<DesignSolution> front : fronts) {
            if (nextGen.size() + front.size() <= populationSize) {
                nextGen.addAll(front);
            } else {
                // Calculate crowding distance and select best
                calculateCrowdingDistance(front);
                front.sort(Comparator.comparingDouble(DesignSolution::getCrowdingDistance).reversed());
                
                int remaining = populationSize - nextGen.size();
                nextGen.addAll(front.subList(0, remaining));
                break;
            }
        }
        
        return nextGen;
    }
    
    /**
     * Create offspring through crossover and mutation
     */
    private List<DesignSolution> createOffspring(List<DesignSolution> population) {
        List<DesignSolution> offspring = new ArrayList<>();
        
        while (offspring.size() < populationSize) {
            // Tournament selection
            DesignSolution parent1 = tournamentSelection(population);
            DesignSolution parent2 = tournamentSelection(population);
            
            // Crossover
            DesignSolution child;
            if (random.nextDouble() < crossoverRate) {
                child = crossover(parent1, parent2);
            } else {
                child = parent1.copy();
            }
            
            // Mutation
            if (random.nextDouble() < mutationRate) {
                mutate(child);
            }
            
            offspring.add(child);
        }
        
        return offspring;
    }
    
    /**
     * Tournament selection
     */
    private DesignSolution tournamentSelection(List<DesignSolution> population) {
        int tournamentSize = 2;
        DesignSolution best = population.get(random.nextInt(population.size()));
        
        for (int i = 1; i < tournamentSize; i++) {
            DesignSolution candidate = population.get(random.nextInt(population.size()));
            if (candidate.compareTo(best) < 0) {
                best = candidate;
            }
        }
        
        return best;
    }
    
    /**
     * Simulated binary crossover
     */
    private DesignSolution crossover(DesignSolution parent1, DesignSolution parent2) {
        double alpha = random.nextDouble();
        
        double supplyTemp = alpha * parent1.getSupplyWaterTempC() + (1 - alpha) * parent2.getSupplyWaterTempC();
        double towerApproach = alpha * parent1.getCoolingTowerApproachC() + (1 - alpha) * parent2.getCoolingTowerApproachC();
        double rackDensity = alpha * parent1.getRackDensityKW() + (1 - alpha) * parent2.getRackDensityKW();
        
        String technology = random.nextBoolean() ? parent1.getCoolingTechnology() : parent2.getCoolingTechnology();
        
        return new DesignSolution(supplyTemp, towerApproach, rackDensity, technology);
    }
    
    /**
     * Polynomial mutation
     */
    private void mutate(DesignSolution solution) {
        // Mutate supply temperature
        if (random.nextDouble() < 0.33) {
            double delta = (random.nextDouble() - 0.5) * 2.0;
            double newTemp = solution.getSupplyWaterTempC() + delta;
            solution.setSupplyWaterTempC(Math.max(MIN_SUPPLY_TEMP, Math.min(MAX_SUPPLY_TEMP, newTemp)));
        }
        
        // Mutate tower approach
        if (random.nextDouble() < 0.33) {
            double delta = (random.nextDouble() - 0.5) * 1.0;
            double newApproach = solution.getCoolingTowerApproachC() + delta;
            solution.setCoolingTowerApproachC(Math.max(MIN_TOWER_APPROACH, Math.min(MAX_TOWER_APPROACH, newApproach)));
        }
        
        // Mutate rack density
        if (random.nextDouble() < 0.33) {
            double delta = (random.nextDouble() - 0.5) * 20.0;
            double newDensity = solution.getRackDensityKW() + delta;
            solution.setRackDensityKW(Math.max(MIN_RACK_DENSITY, Math.min(MAX_RACK_DENSITY, newDensity)));
        }
        
        // Mutate technology
        if (random.nextDouble() < 0.2) {
            solution.setCoolingTechnology(COOLING_TECHNOLOGIES[random.nextInt(COOLING_TECHNOLOGIES.length)]);
        }
    }
    
    /**
     * Print Pareto front summary
     */
    public void printParetoFront(List<DesignSolution> paretoFront) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  PARETO OPTIMAL SOLUTIONS                                             ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.printf("Found %d non-dominated solutions:\n\n", paretoFront.size());
        
        for (int i = 0; i < Math.min(10, paretoFront.size()); i++) {
            DesignSolution sol = paretoFront.get(i);
            System.out.printf("%d. %s\n", i + 1, sol);
        }
        
        if (paretoFront.size() > 10) {
            System.out.printf("\n... and %d more solutions\n", paretoFront.size() - 10);
        }
        
        System.out.println();
    }
}
