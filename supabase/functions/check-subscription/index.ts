import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIAL_DAYS = 7;

const TIER_LIMITS: Record<string, number> = {
  trial: 10,
  essential: 10,
  pro: 30,
  unlimited: -1,
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUB] ${step}${d}`);
};

/** Returns today's date in Europe/Paris as YYYY-MM-DD */
function getLocalDate(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    log("User authenticated", { email: user.email });

    // Count today's messages (used for all tiers)
    const today = getLocalDate();
    const { count: messagesUsedToday } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    // Check if user is a tester (bypass subscription)
    const { data: testerData } = await supabase
      .from("testers")
      .select("id")
      .eq("email", user.email!.toLowerCase())
      .maybeSingle();

    if (testerData) {
      log("User is a tester");
      return new Response(JSON.stringify({
        subscribed: true,
        is_in_trial: false,
        is_tester: true,
        tier: "unlimited",
        daily_message_limit: -1,
        messages_used_today: messagesUsedToday ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription_entitlements
    const { data: entitlement, error: entErr } = await supabase
      .from("subscription_entitlements")
      .select("tier, daily_message_limit, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (entErr) {
      log("Error reading entitlements, trying RevenueCat fallback", { error: entErr.message });
      // Fallback: call RevenueCat REST API
      const rcResponse = await fetchRevenueCatSubscriber(user.id);
      if (rcResponse) return rcResponse;
    }

    // Active subscription?
    if (entitlement && entitlement.tier !== "trial" && entitlement.expires_at) {
      const expiresAt = new Date(entitlement.expires_at);
      if (expiresAt > new Date()) {
        log("Active subscription", { tier: entitlement.tier });
        return new Response(JSON.stringify({
          subscribed: true,
          is_in_trial: false,
          tier: entitlement.tier,
          daily_message_limit: entitlement.daily_message_limit,
          messages_used_today: messagesUsedToday ?? 0,
          subscription_end: entitlement.expires_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // No active subscription → check trial
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isInTrial = daysSinceCreation < TRIAL_DAYS;
    const trialDaysRemaining = isInTrial ? TRIAL_DAYS - daysSinceCreation : 0;

    log("Trial check", { daysSinceCreation, isInTrial, trialDaysRemaining });

    return new Response(JSON.stringify({
      subscribed: false,
      is_in_trial: isInTrial,
      trial_days_remaining: trialDaysRemaining,
      tier: "trial",
      daily_message_limit: TIER_LIMITS.trial,
      messages_used_today: messagesUsedToday ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/** Fallback: fetch subscriber status from RevenueCat REST API */
async function fetchRevenueCatSubscriber(userId: string): Promise<Response | null> {
  const apiKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const entitlements = data?.subscriber?.entitlements;
    if (!entitlements) return null;

    // Check for any active entitlement
    for (const [, ent] of Object.entries(entitlements) as [string, any][]) {
      if (ent.expires_date && new Date(ent.expires_date) > new Date()) {
        const productId = ent.product_identifier ?? "";
        let tier = "essential";
        let limit = 10;
        if (productId.includes("unlimited")) { tier = "unlimited"; limit = -1; }
        else if (productId.includes("pro")) { tier = "pro"; limit = 30; }

        return new Response(JSON.stringify({
          subscribed: true,
          is_in_trial: false,
          tier,
          daily_message_limit: limit,
          messages_used_today: 0, // Can't count without DB, approximate
          subscription_end: ent.expires_date,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (e) {
    log("RevenueCat fallback failed", { error: String(e) });
  }

  return null;
}
