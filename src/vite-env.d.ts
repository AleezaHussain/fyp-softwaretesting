/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPH_EXPLANATION_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_RECOMMENDER_API_URL?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_CHILLED_WATER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
