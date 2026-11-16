// Supabase Edge Function — one-time migration of legacy customer_accounts
// (plaintext passwords) into real Supabase Auth users.
//
// What it does, row by row in public.customer_accounts:
//   1. Skips rows without an email or without a stored password (already migrated / auth-linked).
//   2. Creates a Supabase Auth user with the stored PASSWORD (email pre-confirmed so legacy
//      customers can log in with the same password they already use).
//   3. Re-links the profile row: updates customer_accounts.id → the new auth user id.
//   4. Reports every row it processed (created / already-existed / failed) as JSON.
//
// IMPORTANT / SAFETY
// - Run ONCE. Calling twice is idempotent-ish: rows whose id already matches an auth user
//   id are skipped; users that cannot be created are reported, never silently dropped.
// - This function needs ONE auth-linking secret: set it via
//     supabase secrets set MIGRATE_SECRET=<random-long-string>
//   and call it with:
//     curl -X POST https://<project>.supabase.co/functions/v1/migrate-customer-accounts \
//          -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
//          -H "x-migrate-secret: <same-random-string>"
// - After verifying the JSON report and signing in, drop the plaintext column:
//     alter table public.customer_accounts drop column password;
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migrate-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const migrateSecret = Deno.env.get("MIGRATE_SECRET");
  if (!migrateSecret) {
    return new Response(JSON.stringify({ error: "MIGRATE_SECRET is not set. Refusing to run." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.headers.get("x-migrate-secret") !== migrateSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 0. Read the legacy rows
  const { data: rows, error: readErr } = await supabaseAdmin
    .from("customer_accounts")
    .select("id, email, phone, name, password")
    .not("password", "is", null);

  if (readErr) {
    return new Response(JSON.stringify({ error: "Failed to read customer_accounts", details: readErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report: Array<{ email: string; result: string; note?: string }> = [];

  for (const row of rows || []) {
    const email = String(row.email || "").trim().toLowerCase();
    const password = String(row.password || "");
    if (!email || !password) {
      report.push({ email: email || "(missing)", result: "skipped", note: "missing email or password" });
      continue;
    }

    // 1. Try to create the auth user (email pre-confirmed so existing customers keep their login)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: row.name || "", phone: row.phone || "" },
    });

    let authUserId: string | null = null;
    if (createErr) {
      // Already registered?
      const msg = String(createErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("duplicate") || msg.includes("exists")) {
        // Look up the auth user id by email via admin API
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = (list?.users || []).find((u) => (u.email || "").toLowerCase() === email);
        authUserId = found?.id || null;
        report.push({
          email,
          result: authUserId ? "already-registered" : "conflict-skipped",
          note: authUserId ? "auth user already existed — profile re-linked" : "could not resolve existing auth user id",
        });
      } else {
        report.push({ email, result: "failed", note: createErr.message });
        continue;
      }
    } else {
      authUserId = created?.user?.id || null;
      report.push({ email, result: "created" });
    }

    if (!authUserId) continue;

    // 2. Re-link the profile row to the auth user id
    const { error: updateErr } = await supabaseAdmin
      .from("customer_accounts")
      .update({ id: authUserId })
      .eq("id", row.id);

    if (updateErr) {
      report[report.length - 1].note = `auth user ready but profile re-link failed: ${updateErr.message}`;
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: report.length, report }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
