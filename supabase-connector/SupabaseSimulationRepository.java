package supabase.repositories;

import com.fasterxml.jackson.databind.ObjectMapper;
import supabase.SupabaseClient;
import supabase.entities.Simulation;

import java.io.IOException;

public class SupabaseSimulationRepository {
    private final SupabaseClient client;
    private final ObjectMapper objectMapper;
    private static final String TABLE_NAME = "simulations";

    public SupabaseSimulationRepository(SupabaseClient client) {
        this.client = client;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a new simulation
     */
    public Simulation createSimulation(long userId, String name, String description, String simulationType) throws IOException {
        String body = String.format(
            "{\"user_id\":%d,\"name\":\"%s\",\"description\":\"%s\",\"simulation_type\":\"%s\",\"status\":\"pending\"}",
            userId, escapeJson(name), escapeJson(description), escapeJson(simulationType)
        );

        String response = client.post(TABLE_NAME, body);
        Simulation[] simulations = objectMapper.readValue(response, Simulation[].class);
        return simulations.length > 0 ? simulations[0] : null;
    }

    /**
     * Get simulation by ID
     */
    public Simulation getSimulationById(long simulationId) throws IOException {
        String endpoint = TABLE_NAME + "?id=eq." + simulationId;
        String response = client.get(endpoint);
        Simulation[] simulations = objectMapper.readValue(response, Simulation[].class);
        return simulations.length > 0 ? simulations[0] : null;
    }

    /**
     * Get all simulations for a user
     */
    public Simulation[] getSimulationsByUserId(long userId) throws IOException {
        String endpoint = TABLE_NAME + "?user_id=eq." + userId + "&order=created_at.desc";
        String response = client.get(endpoint);
        return objectMapper.readValue(response, Simulation[].class);
    }

    /**
     * Update simulation status
     */
    public void updateSimulationStatus(long simulationId, String status) throws IOException {
        String body = String.format("{\"status\":\"%s\"}", escapeJson(status));
        client.update(TABLE_NAME, "id=eq." + simulationId, body);
    }

    /**
     * Update simulation
     */
    public void updateSimulation(long simulationId, String name, String description) throws IOException {
        String body = String.format(
            "{\"name\":\"%s\",\"description\":\"%s\"}",
            escapeJson(name), escapeJson(description)
        );
        client.update(TABLE_NAME, "id=eq." + simulationId, body);
    }

    /**
     * Delete simulation
     */
    public void deleteSimulation(long simulationId) throws IOException {
        client.delete(TABLE_NAME, "id=eq." + simulationId);
    }

    /**
     * Helper method to escape JSON strings
     */
    private String escapeJson(String value) {
        return value.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

}
