package supabase;

public class SupabaseConfig {
    public static final String SUPABASE_URL = System.getenv("SUPABASE_URL");
    public static final String ANON_KEY = System.getenv("SUPABASE_ANON_KEY");

    static {
        if (SUPABASE_URL == null || ANON_KEY == null) {
            throw new IllegalStateException("SUPABASE_URL and/or SUPABASE_ANON_KEY environment variables are not set.");
        }
    }
}
