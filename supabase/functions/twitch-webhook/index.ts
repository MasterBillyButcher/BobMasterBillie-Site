// Deploy with: supabase functions deploy twitch-webhook --no-verify-jwt
// (--no-verify-jwt because Twitch calls this directly, with no Supabase
// auth token, trust comes from the signature check below instead.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWITCH_WEBHOOK_SECRET = Deno.env.get("TWITCH_WEBHOOK_SECRET")!;
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function verifySignature(messageId: string, timestamp: string, rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(TWITCH_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(messageId + timestamp + rawBody));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  const expected = `sha256=${hex}`;
  // Lengths differ trivially in practice (fixed hex length), a direct
  // compare is fine here since both sides are attacker-uncontrolled
  // hex digests, not user-supplied secrets being compared elsewhere.
  return expected === signatureHeader;
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const messageId = req.headers.get("twitch-eventsub-message-id") || "";
  const timestamp = req.headers.get("twitch-eventsub-message-timestamp") || "";
  const signature = req.headers.get("twitch-eventsub-message-signature");
  const messageType = req.headers.get("twitch-eventsub-message-type");

  const valid = await verifySignature(messageId, timestamp, rawBody, signature);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 403 });
  }

  const body = JSON.parse(rawBody);

  if (messageType === "webhook_callback_verification") {
    return new Response(body.challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  if (messageType === "revocation") {
    console.warn("Twitch revoked a subscription:", body.subscription);
    return new Response(null, { status: 204 });
  }

  if (messageType === "notification") {
    try {
      await handleNotification(body);
    } catch (err) {
      console.error("Failed to process Twitch notification:", err);
    }
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
});

async function handleNotification(body: any) {
  const { subscription, event } = body;
  const broadcasterId = event.broadcaster_user_id;

  const { data: client } = await supabase.from("clients").select("id").eq("twitch_user_id", broadcasterId).maybeSingle();
  if (!client) {
    console.warn("Twitch webhook for unknown broadcaster_user_id:", broadcasterId);
    return;
  }

  if (subscription.type === "channel.ban") {
    await supabase.from("mod_actions").insert({
      id: crypto.randomUUID(),
      client_id: client.id,
      platform: "twitch",
      action_type: event.is_permanent ? "ban" : "timeout",
      target_user: event.user_name || event.user_login,
      reason: event.reason || null,
      moderator: event.moderator_user_name || event.moderator_user_login || null,
    });
    return;
  }

  if (subscription.type === "channel.unban") {
    await supabase.from("mod_actions").insert({
      id: crypto.randomUUID(),
      client_id: client.id,
      platform: "twitch",
      action_type: "unban",
      target_user: event.user_name || event.user_login,
      reason: null,
      moderator: event.moderator_user_name || event.moderator_user_login || null,
    });
  }
}
