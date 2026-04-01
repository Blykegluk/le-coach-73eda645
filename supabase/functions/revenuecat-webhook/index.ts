import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Map RevenueCat product IDs to tiers
const PRODUCT_TIER_MAP: Record<string, { tier: string; limit: number }> = {
  "theperfectcoach_essential_monthly": { tier: "essential", limit: 10 },
  "theperfectcoach_pro_monthly": { tier: "pro", limit: 30 },
  "theperfectcoach_unlimited_monthly": { tier: "unlimited", limit: -1 },
  // iOS variants (same mapping)
  "theperfectcoach_essential_monthly_ios": { tier: "essential", limit: 10 },
  "theperfectcoach_pro_monthly_ios": { tier: "pro", limit: 30 },
  "theperfectcoach_unlimited_monthly_ios": { tier: "unlimited", limit: -1 },
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RC-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate webhook via shared secret
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("REVENUECAT_WEBHOOK_SECRET not set");

    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      log("Unauthorized webhook attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    if (!event) {
      log("No event in body");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;
    const productId = event.product_id;
    const expirationMs = event.expiration_at_ms;

    log("Received event", { type: eventType, appUserId, productId });

    if (!appUserId) {
      log("No app_user_id, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle subscription activation/renewal events
    const activationEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
      "SUBSCRIPTION_EXTENDED",
    ];

    // Handle subscription deactivation events
    // NOTE: CANCELLATION = user cancelled but still has access until expiry
    //        EXPIRATION = subscription actually expired, revoke now
    const deactivationEvents = [
      "EXPIRATION",
    ];

    // Info events: user cancelled but still active until period ends
    const infoEvents = [
      "CANCELLATION",
      "SUBSCRIPTION_PAUSED",
    ];

    if (activationEvents.includes(eventType)) {
      const mapping = PRODUCT_TIER_MAP[productId];
      if (!mapping) {
        log("Unknown product_id, skipping", { productId });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = expirationMs
        ? new Date(expirationMs).toISOString()
        : null;

      const { error } = await supabase
        .from("subscription_entitlements")
        .upsert({
          user_id: appUserId,
          tier: mapping.tier,
          daily_message_limit: mapping.limit,
          revenuecat_app_user_id: appUserId,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) {
        log("Error upserting entitlement", { error: error.message });
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Entitlement activated", { tier: mapping.tier, expiresAt });
    } else if (deactivationEvents.includes(eventType)) {
      // Remove entitlement row → user falls back to trial
      const { error } = await supabase
        .from("subscription_entitlements")
        .delete()
        .eq("user_id", appUserId);

      if (error) {
        log("Error deleting entitlement", { error: error.message });
      } else {
        log("Entitlement deactivated (back to trial)");
      }
    } else if (infoEvents.includes(eventType)) {
      // User cancelled or paused — still active until expiry, just log
      log("Info event, access unchanged until expiry", { type: eventType });
    } else if (eventType === "BILLING_ISSUE") {
      // Grace period: keep current tier, just log
      log("Billing issue, keeping current tier (grace period)");
    } else {
      log("Unhandled event type, ignoring", { type: eventType });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
