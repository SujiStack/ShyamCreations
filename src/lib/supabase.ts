import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase credentials come ONLY from environment variables (.env locally,
 * hosting env vars in production). No localStorage overrides — the admin
 * portal always reads from these.
 */
export function getSupabaseCredentials() {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

  let url = rawUrl;
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, "");

  const isConfigured = Boolean(
    url &&
    rawKey &&
    url !== "https://placeholder-url.supabase.co" &&
    rawKey !== "placeholder-anon-key" &&
    url.includes("supabase.co")
  );

  return {
    url: url || "https://placeholder-url.supabase.co",
    key: rawKey || "placeholder-anon-key",
    rawUrl: url,
    rawKey,
    isConfigured,
  };
}

let currentClient: SupabaseClient | null = null;
let lastUsedUrl = "";
let lastUsedKey = "";

/**
 * Get the active Supabase client instance (created once per credentials set)
 */
export function getSupabaseClient(): SupabaseClient {
  const creds = getSupabaseCredentials();

  if (!currentClient || lastUsedUrl !== creds.url || lastUsedKey !== creds.key) {
    lastUsedUrl = creds.url;
    lastUsedKey = creds.key;
    currentClient = createClient(creds.url, creds.key, {
      auth: {
        persistSession: true, // managed by Supabase Auth SDK, not app code
        autoRefreshToken: true,
      },
    });
  }

  return currentClient;
}

/**
 * Export default client proxy for backwards compatibility
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
