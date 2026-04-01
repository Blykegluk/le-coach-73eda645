import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities
async function generatePushPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ endpoint: string; headers: Record<string, string>; body: Uint8Array }> {
  // For Deno, use the web-push compatible approach via fetch to the push endpoint
  // with VAPID JWT authentication
  const encoder = new TextEncoder();

  // Create VAPID JWT
  const header = { typ: "JWT", alg: "ES256" };
  const audience = new URL(subscription.endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:contact@theperfectcoach.ai",
  };

  // Import VAPID private key
  const rawPrivateKey = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    await pkcs8FromRaw(rawPrivateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const jwtUnsigned =
    base64url(encoder.encode(JSON.stringify(header))) +
    "." +
    base64url(encoder.encode(JSON.stringify(claims)));

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(jwtUnsigned)
  );

  const jwt = jwtUnsigned + "." + base64url(new Uint8Array(signature));

  return {
    endpoint: subscription.endpoint,
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: encoder.encode(payload),
  };
}

function base64url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function pkcs8FromRaw(rawKey: Uint8Array): Promise<ArrayBuffer> {
  // Wrap raw 32-byte EC private key in PKCS8 DER structure for P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY = "BMY6YivPbi4BQzAZ2wvhqCNSr20YzRYUcWpOAMawWGT1hbyW9uCCAzE0-GF-gWn2weGyif3nZNy4FM2QhAe-RTw";

    if (!VAPID_PRIVATE_KEY) {
      throw new Error("VAPID_PRIVATE_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, title, body } = await req.json();
    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (fetchError) throw fetchError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No push subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushData = await generatePushPayload(sub, payload, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY);
        const pushRes = await fetch(pushData.endpoint, {
          method: "POST",
          headers: pushData.headers,
          body: pushData.body,
        });

        if (pushRes.status === 201) {
          sent++;
        } else if (pushRes.status === 410 || pushRes.status === 404) {
          // Subscription expired, mark for deletion
          expired.push(sub.endpoint);
        } else {
          console.error(`Push failed for endpoint: ${pushRes.status}`);
        }
      } catch (err) {
        console.error("Push send error:", err);
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expired);
      console.log(`Cleaned ${expired.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({ sent, expired: expired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
