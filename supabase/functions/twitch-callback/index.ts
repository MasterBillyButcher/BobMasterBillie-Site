// Deploy with: supabase functions deploy twitch-callback --no-verify-jwt
// (Twitch redirects the browser here directly with no Supabase auth
// header attached, trust comes from having a valid `code` Twitch
// itself issued after the broadcaster/mod approved the scope.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID")!;
const TWITCH_CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET")!;
const SITE_FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")! + "/functions/v1";
const DASHBOARD_URL = Deno.env.get("DASHBOARD_URL")!; // e.g. https://your-site.example.com/index.html

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const clientId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectBack = (status: string) => {
    const target = new URL(DASHBOARD_URL);
    target.searchParams.set("twitch", status);
    return Response.redirect(target.toString(), 302);
  };

  if (error || !code || !clientId) return redirectBack("denied");

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (!client || !client.twitch_user_id) return redirectBack("error");

  try {
    const redirectUri = `${SITE_FUNCTIONS_URL}/twitch-callback`;
    // Completing this exchange registers the broadcaster/mod's consent
    // with Twitch. We don't need to keep the resulting user token.
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID, client_secret: TWITCH_CLIENT_SECRET,
        code, grant_type: "authorization_code", redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error("Twitch rejected the authorization code: " + (await tokenRes.text()));

    const appTokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: TWITCH_CLIENT_ID, client_secret: TWITCH_CLIENT_SECRET, grant_type: "client_credentials" }),
    });
    const appToken = (await appTokenRes.json()).access_token;

    const condition = { broadcaster_user_id: client.twitch_user_id };
    const results = await Promise.allSettled([
      createSubscription("channel.ban", condition, appToken),
      createSubscription("channel.unban", condition, appToken),
    ]);
    const ids = results.filter(r => r.status === "fulfilled").map((r: any) => r.value.id);
    const failures = results.filter(r => r.status === "rejected");
    if (failures.length) console.error("Some Twitch subscriptions failed:", failures.map((f: any) => f.reason?.message));

    await supabase.from("clients").update({ twitch_subscription_ids: ids.join(",") }).eq("id", clientId);
    return redirectBack(ids.length ? "connected" : "error");
  } catch (err) {
    console.error(err);
    return redirectBack("error");
  }
});

async function createSubscription(type: string, condition: Record<string, string>, appToken: string) {
  const callbackUrl = `${SITE_FUNCTIONS_URL}/twitch-webhook`;
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${appToken}`, "Client-Id": TWITCH_CLIENT_ID, "Content-Type": "application/json" },
    body: JSON.stringify({
      type, version: "1", condition,
      transport: { method: "webhook", callback: callbackUrl, secret: Deno.env.get("TWITCH_WEBHOOK_SECRET") },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Twitch rejected the "${type}" subscription: ${JSON.stringify(data)}`);
  return data.data[0];
}
