// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// export const supabase = createClient(
//   supabaseUrl || "https://placeholder-url.supabase.co",
//   supabaseKey || "placeholder-anon-key"
// );



import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Retrieve and sanitize Supabase credentials from environment or localStorage override
 */
export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

  let customUrl = "";
  let customKey = "";
  if (typeof window !== "undefined") {
    try {
      customUrl = (localStorage.getItem("shyam_custom_supabase_url") || "").trim();
      customKey = (localStorage.getItem("shyam_custom_supabase_key") || "").trim();
    } catch {
      // ignore
    }
  }

  let rawUrl = customUrl || envUrl;
  let rawKey = customKey || envKey;

  // Clean URL: ensure https:// and strip trailing slashes
  if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = `https://${rawUrl}`;
  }
  rawUrl = rawUrl.replace(/\/+$/, "");

  const isConfigured = Boolean(
    rawUrl &&
    rawKey &&
    rawUrl !== "https://placeholder-url.supabase.co" &&
    rawKey !== "placeholder-anon-key" &&
    rawUrl.includes("supabase.co")
  );

  return {
    url: rawUrl || "https://placeholder-url.supabase.co",
    key: rawKey || "placeholder-anon-key",
    rawUrl,
    rawKey,
    isConfigured,
    isCustom: Boolean(customUrl && customKey),
  };
}

let currentClient: SupabaseClient | null = null;
let lastUsedUrl = "";
let lastUsedKey = "";

/**
 * Get active Supabase client instance (recreates if credentials changed)
 */
export function getSupabaseClient(): SupabaseClient {
  const creds = getSupabaseCredentials();

  if (!currentClient || lastUsedUrl !== creds.url || lastUsedKey !== creds.key) {
    lastUsedUrl = creds.url;
    lastUsedKey = creds.key;
    currentClient = createClient(creds.url, creds.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return currentClient;
}

/**
 * Save custom Supabase credentials to localStorage and re-initialize client
 */
export function saveCustomSupabaseCredentials(url: string, key: string): { success: boolean; error?: string } {
  try {
    let cleanUrl = url.trim();
    let cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem("shyam_custom_supabase_url");
      localStorage.removeItem("shyam_custom_supabase_key");
      currentClient = null;
      return { success: true };
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, "");

    localStorage.setItem("shyam_custom_supabase_url", cleanUrl);
    localStorage.setItem("shyam_custom_supabase_key", cleanKey);
    
    // Force re-create client
    currentClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    lastUsedUrl = cleanUrl;
    lastUsedKey = cleanKey;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save Supabase credentials" };
  }
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
