package supabase.repositories;

import com.fasterxml.jackson.databind.ObjectMapper;
import supabase.SupabaseClient;
import supabase.entities.User;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class SupabaseUserRepository {
    private final SupabaseClient client;
    private final ObjectMapper objectMapper;
    private static final String TABLE_NAME = "users";

    public SupabaseUserRepository(SupabaseClient client) {
        this.client = client;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a new user
     */
    public User createUser(String authUserId, String name, String email, String passwordHash, String role) throws IOException {
        String body = String.format(
            "{\"auth_user_id\":\"%s\",\"name\":\"%s\",\"email\":\"%s\",\"password_hash\":\"%s\",\"role\":\"%s\"}",
            escapeJson(authUserId), escapeJson(name), escapeJson(email), escapeJson(passwordHash), escapeJson(role)
        );

        String response = client.post(TABLE_NAME, body);
        User[] users = objectMapper.readValue(response, User[].class);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Get user by email
     */
    public User getUserByEmail(String email) throws IOException {
        String endpoint = TABLE_NAME + "?email=eq." + encodeUrl(email);
        String response = client.get(endpoint);
        User[] users = objectMapper.readValue(response, User[].class);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Get user by ID
     */
    public User getUserById(long userId) throws IOException {
        String endpoint = TABLE_NAME + "?id=eq." + userId;
        String response = client.get(endpoint);
        User[] users = objectMapper.readValue(response, User[].class);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Get user by Supabase auth user ID
     */
    public User getUserByAuthUserId(String authUserId) throws IOException {
        String endpoint = TABLE_NAME + "?auth_user_id=eq." + encodeUrl(authUserId);
        String response = client.get(endpoint);
        User[] users = objectMapper.readValue(response, User[].class);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Update user
     */
    public void updateUser(long userId, String name, String email, String role) throws IOException {
        String body = String.format(
            "{\"name\":\"%s\",\"email\":\"%s\",\"role\":\"%s\"}",
            escapeJson(name), escapeJson(email), escapeJson(role)
        );
        client.update(TABLE_NAME, "id=eq." + userId, body);
    }

    /**
     * Delete user
     */
    public void deleteUser(long userId) throws IOException {
        client.delete(TABLE_NAME, "id=eq." + userId);
    }

    /**
     * Helper method to escape JSON strings
     */
    private String escapeJson(String value) {
        return value.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    /**
     * Helper method to URL encode
     */
    private String encodeUrl(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
