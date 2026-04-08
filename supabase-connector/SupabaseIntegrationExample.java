package supabase.example;

import at.favre.lib.crypto.bcrypt.BCrypt;
import supabase.SupabaseClient;
import supabase.SupabaseConfig;
import supabase.entities.Simulation;
import supabase.entities.SimulationResult;
import supabase.entities.User;
import supabase.repositories.SupabaseSimulationRepository;
import supabase.repositories.SupabaseSimulationResultRepository;
import supabase.repositories.SupabaseUserRepository;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Locale;

/**
 * Example implementation showing how to use the Supabase repositories
 * for managing users, simulations, and results
 */
public class SupabaseIntegrationExample {
    
    public static void main(String[] args) {
        try {
            // Initialize client
            SupabaseClient client = new SupabaseClient(
                SupabaseConfig.SUPABASE_URL,
                SupabaseConfig.ANON_KEY
            );

            // Initialize repositories
            SupabaseUserRepository userRepo = new SupabaseUserRepository(client);
            SupabaseSimulationRepository simRepo = new SupabaseSimulationRepository(client);
            SupabaseSimulationResultRepository resultRepo = new SupabaseSimulationResultRepository(client);

            // Example 1: Register a new user
            System.out.println("=== Example 1: User Registration ===");
            String email = "testuser@example.com";
            String password = "SecurePassword123!";
            String name = "John Doe";
            String authUserId = java.util.UUID.randomUUID().toString();
            
            // Hash password before storing
            String passwordHash = BCrypt.withDefaults().hashToString(12, password.toCharArray());
            
            User newUser = userRepo.createUser(authUserId, name, email, passwordHash, "user");
            System.out.println("Created user: " + newUser.getId());
            System.out.println("User: " + newUser.getName() + " (" + newUser.getEmail() + ")");
            System.out.println("Role: " + newUser.getRole());
            
            long userId = newUser.getId();

            // Example 2: Create a simulation
            System.out.println("\n=== Example 2: Create Simulation ===");
            Simulation sim = simRepo.createSimulation(
                userId,
                "Evaporative Cooling Test Run",
                "Testing evaporative cooling system under hot and dry conditions",
                "evaporative"
            );
            System.out.println("Created simulation: " + sim.getId());
            System.out.println("Simulation: " + sim.getName() + " - Type: " + sim.getSimulationType());
            System.out.println("Status: " + sim.getStatus());

            long simulationId = sim.getId();

            // Example 3: Update simulation status during execution
            System.out.println("\n=== Example 3: Update Simulation Status ===");
            simRepo.updateSimulationStatus(simulationId, "running");
            System.out.println("Simulation status updated to: running");

            // Simulate running the cooling simulation
            System.out.println("Running simulation...");
            Thread.sleep(2000); // Simulate processing time

            // Example 4: Store simulation results
            System.out.println("\n=== Example 4: Store Simulation Results ===");
            
            // Prepare result data
            String resultDataJson = createResultDataJson(
                "Test run with controlled parameters",
                42.5,
                "Very good - system performed optimally",
                "System 1"
            );

            SimulationResult result = resultRepo.createResult(
                simulationId,
                userId,
                new BigDecimal("45.30"),           // Runtime in minutes
                new BigDecimal("2450.75"),         // Energy consumed in kWh
                new BigDecimal("94.5"),            // Cooling efficiency %
                new BigDecimal("98.2"),            // Temperature stability %
                new BigDecimal("32.5"),            // Cost saving %
                "Evaporative cooling achieved excellent efficiency in this climate",
                resultDataJson
            );
            
            System.out.println("Created result: " + result.getId());
            System.out.println("Energy consumed: " + result.getEnergyConsumedKwh() + " kWh");
            System.out.println("Cooling efficiency: " + result.getCoolingEfficiency() + "%");
            System.out.println("Cost savings: " + result.getCostSavingPercent() + "%");

            // Example 5: Update simulation status to completed
            System.out.println("\n=== Example 5: Mark Simulation as Completed ===");
            simRepo.updateSimulationStatus(simulationId, "completed");
            System.out.println("Simulation marked as completed");

            // Example 6: Retrieve user's simulations
            System.out.println("\n=== Example 6: Retrieve User's Simulations ===");
            Simulation[] userSimulations = simRepo.getSimulationsByUserId(userId);
            System.out.println("Total simulations for user: " + userSimulations.length);
            
            for (Simulation userSim : userSimulations) {
                System.out.println("- " + userSim.getName() + " [" + userSim.getStatus() + "]");
            }

            // Example 7: Get user's results
            System.out.println("\n=== Example 7: Retrieve User's Results ===");
            SimulationResult[] userResults = resultRepo.getResultsByUserId(userId);
            System.out.println("Total results for user: " + userResults.length);
            
            for (SimulationResult userResult : userResults) {
                System.out.println("- Energy: " + userResult.getEnergyConsumedKwh() + " kWh, " +
                                 "Efficiency: " + userResult.getCoolingEfficiency() + "%");
            }

            // Example 8: Get top results by efficiency
            System.out.println("\n=== Example 8: Top Results by Efficiency ===");
            SimulationResult[] topEfficient = resultRepo.getTopResultsByEfficiency(userId, 5);
            System.out.println("Top " + topEfficient.length + " most efficient simulations:");
            
            for (SimulationResult topResult : topEfficient) {
                System.out.println("- Efficiency: " + topResult.getCoolingEfficiency() + "%");
            }

            // Example 9: Get average metrics
            System.out.println("\n=== Example 9: Average Metrics ===");
            String avgMetrics = resultRepo.getAverageMetrics(userId);
            System.out.println("Average metrics: " + avgMetrics);

            // Example 10: Run multiple simulations (simulation)
            System.out.println("\n=== Example 10: Create Additional Simulations ===");
            
            String[] simTypes = {"chilled_water", "air_economizer"};
            String[] simDescriptions = {
                "Testing chilled water cooling system",
                "Testing air economizer cooling system"
            };

            for (int i = 0; i < simTypes.length; i++) {
                Simulation additionalSim = simRepo.createSimulation(
                    userId,
                    "Simulation with " + simTypes[i],
                    simDescriptions[i],
                    simTypes[i]
                );
                System.out.println("Created: " + additionalSim.getName());

                // Simulate and store result
                Thread.sleep(1000);
                simRepo.updateSimulationStatus(additionalSim.getId(), "running");
                Thread.sleep(2000);
                
                SimulationResult additionalResult = resultRepo.createResult(
                    additionalSim.getId(),
                    userId,
                    new BigDecimal("50.0"),
                    new BigDecimal("3000.0"),
                    new BigDecimal("85.0"),
                    new BigDecimal("95.0"),
                    new BigDecimal("25.0"),
                    "Simulation completed successfully",
                    "{}"
                );
                
                simRepo.updateSimulationStatus(additionalSim.getId(), "completed");
                System.out.println("  Result stored with efficiency: " + additionalResult.getCoolingEfficiency() + "%");
            }

            System.out.println("\n=== All Examples Completed Successfully ===");

        } catch (IOException e) {
            System.err.println("IO Error: " + e.getMessage());
            e.printStackTrace();
        } catch (InterruptedException e) {
            System.err.println("Interrupted: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Helper method to create result data JSON
     */
    private static String createResultDataJson(String notes, double avgTemperature, 
                                               String systemPerformance, String systemName) {
        return String.format(
            "{\"notes\":\"%s\",\"avg_temperature_celsius\":%.1f,\"system_performance\":\"%s\",\"system_name\":\"%s\"}",
            notes.replace("\"", "\\\""),
            avgTemperature,
            systemPerformance.replace("\"", "\\\""),
            systemName
        );
    }
}
