/**
 * check-alarms — Supabase Edge Function
 * Fires Web Push notifications for alarms that are due.
 *
 * Deploy: supabase functions deploy check-alarms --no-verify-jwt
 *
 * Required env vars:
 *   ALARM_CHECK_SECRET   — shared secret for the Authorization header
 *   VAPID_PRIVATE_KEY    — base64url raw P-256 private scalar (32 bytes)
 *   VAPID_PUBLIC_KEY     — base64url uncompressed P-256 point (65 bytes, 04||x||y)
 *   VAPID_SUBJECT        — mailto: or https: URI identifying the sender
 *   SUPABASE_URL         — injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
 *
 * Web Push implemented from scratch with the Web Crypto API (RFC 8291 + RFC 8292).
 * No npm:web-push or any other external library is used.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function b64uEncode(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64uDecode(s: string): Uint8Array {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const d = p + "=".repeat((4 - (p.length % 4)) % 4);
  return Uint8Array.from(atob(d), (c) => c.charCodeAt(0));
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let pos = 0;
  for (const a of arrs) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

// ─── HMAC-SHA-256 ─────────────────────────────────────────────────────────────

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// ─── HKDF-Expand (RFC 5869) ───────────────────────────────────────────────────

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  len: number,
): Promise<Uint8Array> {
  const out = new Uint8Array(len);
  let prev = new Uint8Array(0);
  let pos = 0;
  for (let ctr = 1; pos < len; ctr++) {
    prev = await hmacSha256(prk, concat(prev, info, new Uint8Array([ctr])));
    const take = Math.min(prev.length, len - pos);
    out.set(prev.slice(0, take), pos);
    pos += take;
  }
  return out;
}

// ─── Web Push Encryption  (RFC 8291 — aes128gcm) ─────────────────────────────

async function encryptWebPush(
  plaintext: Uint8Array,
  p256dh: string, // subscriber public key  (base64url, 65-byte uncompressed)
  auth: string,   // subscriber auth secret  (base64url, 16 bytes)
): Promise<Uint8Array> {
  // 1. Ephemeral sender key pair
  const senderKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const senderPub = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKP.publicKey),
  );

  // 2. Import recipient public key
  const recipPub = b64uDecode(p256dh);
  const recipKey = await crypto.subtle.importKey(
    "raw",
    recipPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // 3. ECDH — shared secret (32 bytes)
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: recipKey },
      senderKP.privateKey,
      256,
    ),
  );

  // 4. PRK_key = HMAC(auth_secret, shared_secret)  [HKDF-Extract, auth as salt]
  const authBytes = b64uDecode(auth);
  const prkKey = await hmacSha256(authBytes, sharedSecret);

  // 5. IKM = HKDF-Expand(PRK_key, "WebPush: info\0" || recip_pub || sender_pub, 32)
  const keyInfo = concat(
    enc.encode("WebPush: info\x00"),
    recipPub,
    senderPub,
  );
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  // 6. Random record salt (16 bytes) + PRK = HMAC(salt, IKM)  [HKDF-Extract]
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmacSha256(salt, ikm);

  // 7. Content-Encryption Key (16 bytes) and Nonce (12 bytes)
  const cek = await hkdfExpand(prk, enc.encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdfExpand(prk, enc.encode("Content-Encoding: nonce\x00"), 12);

  // 8. Encrypt:  plaintext || 0x02 (last-record delimiter)
  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cekKey,
      concat(plaintext, new Uint8Array([0x02])),
    ),
  );

  // 9. RFC 8291 content header: salt(16) | rs(4 BE) | idlen(1) | keyid(65)
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, 4096, false); // rs = 4096 (big-endian)

  return concat(salt, rsBytes, new Uint8Array([senderPub.length]), senderPub, ciphertext);
}

// ─── VAPID JWT  (RFC 8292 — ES256) ───────────────────────────────────────────

async function buildVapidJwt(
  audience: string,     // e.g. "https://fcm.googleapis.com"
  subject: string,      // e.g. "mailto:admin@example.com"
  privKeyB64: string,   // raw P-256 private scalar, base64url (32 bytes)
  pubKeyB64: string,    // uncompressed P-256 point, base64url (65 bytes: 04||x||y)
): Promise<string> {
  const headerB64 = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payloadB64 = b64uEncode(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
        sub: subject,
      }),
    ),
  );
  const signingInput = enc.encode(`${headerB64}.${payloadB64}`);

  // Build EC private key JWK from raw bytes
  const privBytes = b64uDecode(privKeyB64);
  const pubBytes = b64uDecode(pubKeyB64);
  // pubBytes layout: 0x04 (1 byte) || x (32 bytes) || y (32 bytes)
  const xBytes = pubBytes.slice(1, 33);
  const yBytes = pubBytes.slice(33, 65);

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: b64uEncode(privBytes),
      x: b64uEncode(xBytes),
      y: b64uEncode(yBytes),
      ext: true,
      key_ops: ["sign"],
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // ECDSA P-256 SHA-256 → IEEE P1363 (r||s, 64 bytes) — correct format for JWT ES256
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, signingInput),
  );

  return `${headerB64}.${payloadB64}.${b64uEncode(sig)}`;
}

// ─── Send a single Web Push message ──────────────────────────────────────────

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function sendWebPush(sub: PushSubscription, payload: string): Promise<void> {
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    throw new Error("VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY env vars not set");
  }

  const body = await encryptWebPush(
    enc.encode(payload),
    sub.keys.p256dh,
    sub.keys.auth,
  );

  const { protocol, host } = new URL(sub.endpoint);
  const audience = `${protocol}//${host}`;
  const jwt = await buildVapidJwt(audience, VAPID_SUBJECT, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Push service HTTP ${res.status}: ${text}`);
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }
}

function isSubscriptionGone(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as unknown as Record<string, unknown>).status;
  return status === 410 || status === 404;
}

// ─── Edge Function handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // POST only
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Auth check
  const secret = Deno.env.get("ALARM_CHECK_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    console.warn("[check-alarms] Unauthorized — bad or missing ALARM_CHECK_SECRET");
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch alarms that need to fire right now
  console.log("[check-alarms] Calling get_alarms_to_fire...");
  const { data: alarms, error: alarmsErr } = await supabase.rpc("get_alarms_to_fire");

  if (alarmsErr) {
    console.error("[check-alarms] get_alarms_to_fire failed:", alarmsErr.message);
    return new Response(JSON.stringify({ error: alarmsErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const alarmList = alarms ?? [];
  console.log(`[check-alarms] Alarms to fire: ${alarmList.length}`);

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const alarm of alarmList) {
    processed++;
    const label = alarm.label ?? alarm.title ?? String(alarm.id);
    console.log(`[check-alarms] Processing alarm ${alarm.id} ("${label}")`);

    // Get push subscriptions for this alarm's owner
    const { data: subs, error: subsErr } = await supabase.rpc(
      "get_user_alarm_subscriptions",
      { alarm_id: alarm.id },
    );

    if (subsErr) {
      console.error(
        `[check-alarms] get_user_alarm_subscriptions failed for alarm ${alarm.id}:`,
        subsErr.message,
      );
      failed++;
    } else {
      const subList = subs ?? [];
      console.log(
        `[check-alarms]   ${subList.length} subscription(s) for alarm ${alarm.id}`,
      );

      // Push payload
      const pushPayload = JSON.stringify({
        title: alarm.title ?? `⏰ ${label}`,
        body: alarm.body ?? `Your alarm "${label}" is ringing!`,
        alarmId: alarm.id,
        soundId: alarm.sound_id ?? alarm.sound ?? "beep",
      });

      for (const row of subList) {
        const subId = row.id;
        // The subscription JSON is stored in row.subscription (or row itself if flat)
        const pushSub: PushSubscription = row.subscription ?? {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };

        try {
          console.log(`[check-alarms]   Sending push → subscription ${subId}...`);
          await sendWebPush(pushSub, pushPayload);
          sent++;
          console.log(`[check-alarms]   ✓ Push sent → subscription ${subId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[check-alarms]   ✗ Push failed → subscription ${subId}: ${msg}`,
          );

          // Subscription expired or removed — clean it up
          if (isSubscriptionGone(err)) {
            console.log(
              `[check-alarms]   Deleting gone subscription ${subId}`,
            );
            const { error: delErr } = await supabase.rpc(
              "delete_alarm_subscription",
              { subscription_id: subId },
            );
            if (delErr) {
              console.error(
                "[check-alarms]   delete_alarm_subscription failed:",
                delErr.message,
              );
            }
          }
          failed++;
        }
      }
    }

    // Mark alarm as triggered (regardless of push success)
    const { error: trigErr } = await supabase.rpc("alarm_mark_triggered", {
      alarm_id: alarm.id,
    });
    if (trigErr) {
      console.error(
        `[check-alarms] alarm_mark_triggered failed for alarm ${alarm.id}:`,
        trigErr.message,
      );
    } else {
      console.log(`[check-alarms] ✓ Alarm ${alarm.id} marked as triggered`);
    }
  }

  const summary = { processed, sent, failed };
  console.log("[check-alarms] Finished:", summary);
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
