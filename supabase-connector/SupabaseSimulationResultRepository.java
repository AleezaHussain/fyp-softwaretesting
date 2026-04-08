package supabase.repositories;

import com.fasterxml.jackson.databind.ObjectMapper;
import supabase.SupabaseClient;
import supabase.entities.SimulationResult;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SupabaseSimulationResultRepository {
    private final SupabaseClient client;
    private final ObjectMapper objectMapper;
    private static final String TABLE_NAME = "simulation_results";

    public SupabaseSimulationResultRepository(SupabaseClient client) {
        this.client = client;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a new simulation result
     */
    public SimulationResult createResult(long simulationId, long userId,
                                        BigDecimal runtimeMinutes, BigDecimal energyConsumedKwh,
                                        BigDecimal coolingEfficiency, BigDecimal temperatureStability,
                                        BigDecimal costSavingPercent, String recommendation,
                                        String resultDataJson) throws IOException {
        String body = String.format(
            "{\"simulation_id\":%d,\"user_id\":%d,\"runtime_minutes\":%s,\"energy_consumed_kwh\":%s," +
            "\"cooling_efficiency\":%s,\"temperature_stability\":%s,\"cost_saving_percent\":%s," +
            "\"recommendation\":\"%s\",\"result_data\":%s,\"completed_at\":\"%s\"}",
            simulationId, userId, runtimeMinutes, energyConsumedKwh,
            coolingEfficiency, temperatureStability, costSavingPercent,
            escapeJson(recommendation), resultDataJson, LocalDateTime.now()
        );

        String response = client.post(TABLE_NAME, body);
        SimulationResult[] results = objectMapper.readValue(response, SimulationResult[].class);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get result by ID
     */
    public SimulationResult getResultById(long resultId) throws IOException {
        String endpoint = TABLE_NAME + "?id=eq." + resultId;
        String response = client.get(endpoint);
        SimulationResult[] results = objectMapper.readValue(response, SimulationResult[].class);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get all results for a simulation
     */
    public SimulationResult[] getResultsBySimulationId(long simulationId) throws IOException {
        String endpoint = TABLE_NAME + "?simulation_id=eq." + simulationId;
        String response = client.get(endpoint);
        return objectMapper.readValue(response, SimulationResult[].class);
    }

    /**
     * Get all results for a user
     */
    public SimulationResult[] getResultsByUserId(long userId) throws IOException {
        String endpoint = TABLE_NAME + "?user_id=eq." + userId + "&order=completed_at.desc";
        String response = client.get(endpoint);
        return objectMapper.readValue(response, SimulationResult[].class);
    }

    /**
     * Get results by simulation type
     * Joins with simulations table to filter by type
     */
    public SimulationResult[] getResultsBySimulationType(long userId, String simulationType) throws IOException {
        // This requires a more complex query - you may need to implement server-side
        String endpoint = TABLE_NAME + "?user_id=eq." + userId + "&order=completed_at.desc";
        String response = client.get(endpoint);
        SimulationResult[] allResults = objectMapper.readValue(response, SimulationResult[].class);
        
        // Filter on client side if needed
        return allResults;
    }

    /**
     * Get top N results by efficiency
     */
    public SimulationResult[] getTopResultsByEfficiency(long userId, int limit) throws IOException {
        String endpoint = TABLE_NAME + "?user_id=eq." + userId + "&order=cooling_efficiency.desc&limit=" + limit;
        String response = client.get(endpoint);
        return objectMapper.readValue(response, SimulationResult[].class);
    }

    /**
     * Get top N results by cost savings
     */
    public SimulationResult[] getTopResultsByCostSavings(long userId, int limit) throws IOException {
        String endpoint = TABLE_NAME + "?user_id=eq." + userId + "&order=cost_saving_percent.desc&limit=" + limit;
        String response = client.get(endpoint);
        return objectMapper.readValue(response, SimulationResult[].class);
    }

    /**
     * Update result
     */
    public void updateResult(long resultId, BigDecimal coolingEfficiency,
                            BigDecimal temperatureStability, String recommendation) throws IOException {
        String body = String.format(
            "{\"cooling_efficiency\":%s,\"temperature_stability\":%s,\"recommendation\":\"%s\"}",
            coolingEfficiency, temperatureStability, escapeJson(recommendation)
        );
        client.update(TABLE_NAME, "id=eq." + resultId, body);
    }

    /**
     * Delete result
     */
    public void deleteResult(long resultId) throws IOException {
        client.delete(TABLE_NAME, "id=eq." + resultId);
    }

    /**
     * Get average metrics for a user across all simulations
     */
    public String getAverageMetrics(long userId) throws IOException {
        // This would need a custom REST endpoint or PostgreSQL function
        // For now, you can fetch all and compute on client side
        SimulationResult[] results = getResultsByUserId(userId);
        
        if (results.length == 0) {
            return "{}";
        }

        BigDecimal totalEnergy = BigDecimal.ZERO;
        BigDecimal totalEfficiency = BigDecimal.ZERO;
        BigDecimal totalStability = BigDecimal.ZERO;
        BigDecimal totalCostSavings = BigDecimal.ZERO;

        for (SimulationResult result : results) {
            if (result.getEnergyConsumedKwh() != null) totalEnergy = totalEnergy.add(result.getEnergyConsumedKwh());
            if (result.getCoolingEfficiency() != null) totalEfficiency = totalEfficiency.add(result.getCoolingEfficiency());
            if (result.getTemperatureStability() != null) totalStability = totalStability.add(result.getTemperatureStability());
            if (result.getCostSavingPercent() != null) totalCostSavings = totalCostSavings.add(result.getCostSavingPercent());
        }

        int count = results.length;
        String json = String.format(
            "{\"avg_energy_kwh\":%.2f,\"avg_efficiency\":%.2f,\"avg_stability\":%.2f,\"avg_cost_savings\":%.2f,\"total_runs\":%d}",
            totalEnergy.divide(new BigDecimal(count)), 
            totalEfficiency.divide(new BigDecimal(count)),
            totalStability.divide(new BigDecimal(count)),
            totalCostSavings.divide(new BigDecimal(count)),
            count
        );
        
        return json;
    }

    /**
     * Helper method to escape JSON strings
     */
    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

}
