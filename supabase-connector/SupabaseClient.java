package supabase;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class SupabaseClient {
    private final String supabaseUrl;
    private final String anonKey;

    public SupabaseClient(String supabaseUrl, String anonKey) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
    }

    public String get(String endpoint) throws IOException {
        URL url = new URL(supabaseUrl + "/rest/v1/" + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("apikey", anonKey);
        conn.setRequestProperty("Authorization", "Bearer " + anonKey);
        conn.setRequestProperty("Content-Type", "application/json");

        return handleResponse(conn);
    }

    public String post(String table, String body) throws IOException {
        URL url = new URL(supabaseUrl + "/rest/v1/" + table);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("apikey", anonKey);
        conn.setRequestProperty("Authorization", "Bearer " + anonKey);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Prefer", "return=representation");
        conn.setDoOutput(true);

        try (var os = conn.getOutputStream()) {
            byte[] input = body.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        return handleResponse(conn);
    }

    public String update(String table, String filter, String body) throws IOException {
        URL url = new URL(supabaseUrl + "/rest/v1/" + table + "?" + filter);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("PATCH");
        conn.setRequestProperty("apikey", anonKey);
        conn.setRequestProperty("Authorization", "Bearer " + anonKey);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Prefer", "return=representation");
        conn.setDoOutput(true);

        try (var os = conn.getOutputStream()) {
            byte[] input = body.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        return handleResponse(conn);
    }

    public void delete(String table, String filter) throws IOException {
        URL url = new URL(supabaseUrl + "/rest/v1/" + table + "?" + filter);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("DELETE");
        conn.setRequestProperty("apikey", anonKey);
        conn.setRequestProperty("Authorization", "Bearer " + anonKey);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        handleResponse(conn);
    }

    private String handleResponse(HttpURLConnection conn) throws IOException {
        int responseCode = conn.getResponseCode();
        
        if (responseCode >= 400) {
            Scanner scanner = new Scanner(conn.getErrorStream());
            StringBuilder error = new StringBuilder();
            while (scanner.hasNext()) {
                error.append(scanner.nextLine());
            }
            scanner.close();
            throw new IOException("HTTP Error " + responseCode + ": " + error);
        }

        Scanner scanner = new Scanner(conn.getInputStream());
        StringBuilder response = new StringBuilder();
        while (scanner.hasNext()) {
            response.append(scanner.nextLine());
        }
        scanner.close();
        conn.disconnect();
        return response.toString();
    }
}
