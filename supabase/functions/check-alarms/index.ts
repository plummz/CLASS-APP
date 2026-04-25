import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// Web Push payload encryption/signing
async function sendWebPush(
  subscription: { endpoint: string; auth: string; p256dh: string },
  payload: { title: string; body: string; alarmId: number; soundId: string }
): Promise<{ ok: boolean; error?: string; statusCode?: number }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { ok: false, error: "VAPID keys not configured" };
  }

  const vapidHeader = createVapidAuthHeader(
    subscription,
    VAPID_PUBLIC,
    VAPID_PRIVATE,
    "mailto:admin@class-app.local"
  );

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: vapidHeader.Authorization,
        "Crypto-Key": vapidHeader["Crypto-Key"],
        TTL: "43200", // 12 hours
      },
      body: await encryptPayload(payload, subscription),
    });

    if (response.status === 410) {
      // Subscription no longer valid
      return { ok: false, error: "Gone", statusCode: 410 };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: response.statusText,
        statusCode: response.status,
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// Simplified VAPID header creation (Production should use a proper library)
function createVapidAuthHeader(
  subscription: any,
  publicKey: string,
  privateKey: string,
  mailto: string
): { Authorization: string; "Crypto-Key": string } {
  // In production, use the 'web-push' npm package
  // This is a simplified mock for demonstration
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 43200; // 12 hours

  // Note: Proper VAPID implementation requires ECDSA signing
  // For production, use: npm install web-push
  // Then: import webpush from 'web-push'
  // and: webpush.setVapidDetails(mailto, publicKey, privateKey)

  return {
    Authorization: `vapid t=${Buffer.from(
      JSON.stringify({ aud: subscription.endpoint, exp, sub: mailto })
    ).toString("base64")},k=${publicKey}`,
    "Crypto-Key": `p256ecdsa=${publicKey}`,
  };
}

// Simplified payload encryption (Production should use proper encryption)
async function encryptPayload(payload: any, subscription: any): Promise<any> {
  // In production, use the 'web-push' library which handles encryption
  // This returns JSON stringified payload as a placeholder
  return JSON.stringify(payload);
}

async function checkAlarms() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Get all alarms that should fire
  const { data: alarms, error: alarmsError } = await supabase
    .rpc("get_alarms_to_fire");

  if (alarmsError) {
    console.error("Error fetching alarms:", alarmsError);
    return { error: "Failed to fetch alarms", code: 500 };
  }

  if (!alarms || alarms.length === 0) {
    return { message: "No alarms to fire", processed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const alarm of alarms) {
    try {
      // Get subscriptions for this user
      const { data: subscriptions, error: subError } = await supabase
        .rpc("get_user_alarm_subscriptions", { p_user_id: alarm.user_id });

      if (subError) {
        console.error(`Error fetching subscriptions for user ${alarm.user_id}:`, subError);
        failed++;
        continue;
      }

      if (!subscriptions || subscriptions.length === 0) {
        // No subscriptions — just mark as triggered
        await supabase.rpc("alarm_mark_triggered", { p_alarm_id: alarm.id });
        processed++;
        continue;
      }

      // Send push to each subscription
      const pushPayload = {
        title: `🔔 Alarm: ${alarm.label}`,
        body: `Set for ${alarm.alarm_time}`,
        alarmId: alarm.id,
        soundId: alarm.sound_id,
      };

      for (const sub of subscriptions) {
        const result = await sendWebPush(
          {
            endpoint: sub.endpoint,
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
          pushPayload
        );

        if (!result.ok && result.statusCode === 410) {
          // Remove invalid subscription
          await supabase.rpc("delete_alarm_subscription", {
            p_subscription_id: sub.id,
          });
        }
      }

      // Mark alarm as triggered
      await supabase.rpc("alarm_mark_triggered", { p_alarm_id: alarm.id });
      processed++;
    } catch (error) {
      console.error(`Error processing alarm ${alarm.id}:`, error);
      failed++;
    }
  }

  return { message: "Alarms checked", processed, failed };
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  // Optional: Verify authorization header (cron secret or API key)
  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("ALARM_CHECK_SECRET");

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await checkAlarms();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Alarm check failed:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
