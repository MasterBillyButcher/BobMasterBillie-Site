// Deploy with: supabase functions deploy discord-notify
// JWT verification stays ON: only a logged-in dashboard user can
// trigger this, via supabase.functions.invoke. Posting directly from
// the browser to a Discord webhook URL is unreliable (Discord doesn't
// consistently allow that cross-origin), so this proxies it server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { clientId, message } = await req.json();
  if (!clientId || !message) {
    return new Response(JSON.stringify({ error: "clientId and message are required" }), { status: 400, headers: corsHeaders });
  }

  const { data: client } = await supabase.from("clients").select("discord_webhook_url").eq("id", clientId).maybeSingle();
  if (!client?.discord_webhook_url) {
    return new Response(JSON.stringify({ ok: false, reason: "no webhook configured" }), { status: 200, headers: corsHeaders });
  }

  try {
    await fetch(client.discord_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200, headers: corsHeaders });
  }
});
