// Deploy with: supabase functions deploy discord-poll
// Scheduled via pg_cron + pg_net, see sql/schedule-discord-poll.sql.
// JWT verification stays ON (default): pg_cron calls this with the
// project's anon key as the bearer token, which is a valid Supabase
// JWT. The actual database writes below use the service role key
// regardless of who called this function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_API = "https://discord.com/api/v10";
// 20 = MEMBER_KICK, 22 = MEMBER_BAN_ADD, 23 = MEMBER_BAN_REMOVE, 24 = MEMBER_UPDATE (covers timeouts)
const ACTION_TYPES = [20, 22, 23, 24];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (_req) => {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, discord_guild_id, discord_last_audit_id")
    .not("discord_guild_id", "is", null);

  const summary = [];
  for (const client of clients || []) {
    try {
      const actions = await fetchNewModActions(client.discord_guild_id, client.discord_last_audit_id);
      let logged = 0;
      let lastId = client.discord_last_audit_id;

      for (const action of actions) {
        if (!action.skip) {
          await supabase.from("mod_actions").insert({
            id: crypto.randomUUID(),
            client_id: client.id,
            platform: "discord",
            action_type: action.actionType,
            target_user: action.targetUser,
            reason: action.reason,
            moderator: action.moderator,
          });
          logged++;
        }
        lastId = action.entryId;
      }

      if (lastId && lastId !== client.discord_last_audit_id) {
        await supabase.from("clients").update({ discord_last_audit_id: lastId }).eq("id", client.id);
      }
      summary.push({ clientId: client.id, checked: actions.length, logged });
    } catch (err) {
      console.error(`Discord poll failed for client ${client.id}:`, err);
      summary.push({ clientId: client.id, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ polled: (clients || []).length, summary }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});

async function fetchNewModActions(guildId: string, after: string | null) {
  const results: any[] = [];
  for (const actionType of ACTION_TYPES) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/audit-logs`);
    url.searchParams.set("action_type", String(actionType));
    url.searchParams.set("limit", "20");

    const res = await fetch(url, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
    if (!res.ok) { console.error(`Discord audit log fetch failed for guild ${guildId}:`, await res.text()); continue; }
    const data = await res.json();
    const usersById = Object.fromEntries((data.users || []).map((u: any) => [u.id, u]));

    for (const entry of data.audit_log_entries || []) {
      if (after && BigInt(entry.id) <= BigInt(after)) continue;
      results.push(normaliseEntry(entry, actionType, usersById));
    }
  }
  results.sort((a, b) => (BigInt(a.entryId) < BigInt(b.entryId) ? -1 : 1));
  return results;
}

function normaliseEntry(entry: any, actionType: number, usersById: Record<string, any>) {
  const target = usersById[entry.target_id];
  const moderator = usersById[entry.user_id];
  const targetUser = target ? target.username : entry.target_id || "unknown";
  const moderatorName = moderator ? moderator.username : undefined;

  if (actionType === 20) return { entryId: entry.id, actionType: "kick", targetUser, reason: entry.reason, moderator: moderatorName };
  if (actionType === 22) return { entryId: entry.id, actionType: "ban", targetUser, reason: entry.reason, moderator: moderatorName };
  if (actionType === 23) return { entryId: entry.id, actionType: "unban", targetUser, reason: entry.reason, moderator: moderatorName };

  const timeoutChange = (entry.changes || []).find((c: any) => c.key === "communication_disabled_until");
  if (timeoutChange) return { entryId: entry.id, actionType: "timeout", targetUser, reason: entry.reason, moderator: moderatorName };
  return { entryId: entry.id, actionType: "other", targetUser, reason: entry.reason, moderator: moderatorName, skip: true };
}
