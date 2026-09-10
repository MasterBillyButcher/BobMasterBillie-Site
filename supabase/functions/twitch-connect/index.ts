// Deploy with: supabase functions deploy twitch-connect
// (JWT verification stays ON, default, since this is only ever called
// from the dashboard by a logged-in user via supabase.functions.invoke,
// which attaches the session token automatically.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID")!;
const SITE_FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")! + "/functions/v1";
const TWITCH_EVENTSUB_SCOPES = Deno.env.get("TWITCH_EVENTSUB_SCOPES") || "channel:moderate";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { clientId } = await req.json();
  if (!clientId) {
    return new Response(JSON.stringify({ error: "clientId is required" }), { status: 400, headers: corsHeaders });
  }

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client) {
    return new Response(JSON.stringify({ error: "Unknown client" }), { status: 404, headers: corsHeaders });
  }
  if (!client.twitch_channel) {
    return new Response(JSON.stringify({ error: "This client has no Twitch channel set yet." }), { status: 400, headers: corsHeaders });
  }

  try {
    if (!client.twitch_user_id) {
      const appToken = await getAppAccessToken();
      const user = await getUserByLogin(client.twitch_channel, appToken);
      await supabase.from("clients").update({ twitch_user_id: user.id }).eq("id", clientId);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }

  const redirectUri = `${SITE_FUNCTIONS_URL}/twitch-callback`;
  const authorizeUrl = new URL("https://id.twitch.tv/oauth2/authorize");
  authorizeUrl.searchParams.set("client_id", TWITCH_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", TWITCH_EVENTSUB_SCOPES);
  authorizeUrl.searchParams.set("state", clientId);
  authorizeUrl.searchParams.set("force_verify", "true");

  return new Response(JSON.stringify({ authorizeUrl: authorizeUrl.toString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function getAppAccessToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: Deno.env.get("TWITCH_CLIENT_SECRET")!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error("Could not get a Twitch app access token: " + (await res.text()));
  return (await res.json()).access_token;
}

async function getUserByLogin(login: string, appToken: string) {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
    headers: { Authorization: `Bearer ${appToken}`, "Client-Id": TWITCH_CLIENT_ID },
  });
  if (!res.ok) throw new Error("Could not look up the Twitch channel: " + (await res.text()));
  const data = await res.json();
  if (!data.data?.length) throw new Error(`No Twitch channel found for login "${login}".`);
  return data.data[0];
}
