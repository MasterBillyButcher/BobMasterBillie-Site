// POST { password } -> { ok: true } or { ok: false }
// Used by the "Unlock editing" button to check the password before
// showing edit controls. Does not write to reference_sections,
// veto_entries, or backlog_items — save-section.js/veto.js/backlog.js
// each re-check the password again independently, so this endpoint
// succeeding is not itself a write credential, it's just a UX
// convenience.
//
// Rate-limited the same way as every other /api file: too many wrong
// guesses from one IP in a short window gets rejected before the
// password is even compared. See api/_lib/rate-limit.js for why this
// matters — a password with no limit on guess speed isn't really
// protecting anything.

const { createClient } = require("@supabase/supabase-js");
const { checkRateLimit, recordFailedAttempt } = require("./_lib/rate-limit.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const editPassword = process.env.EDIT_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!editPassword || !supabaseUrl || !serviceRoleKey) {
    // Misconfiguration: an env var was never set in Vercel. Fail
    // closed (deny), not open, and say so plainly rather than a
    // generic 500.
    res.status(500).json({
      ok: false,
      error: "Server is missing EDIT_PASSWORD, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
    });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { allowed, ip } = await checkRateLimit(supabase, req);
  if (!allowed) {
    res.status(429).json({ ok: false, error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const submitted = body && typeof body.password === "string" ? body.password : "";

  const correct = submitted === editPassword;
  if (!correct) {
    await recordFailedAttempt(supabase, ip);
  }

  res.status(200).json({ ok: correct });
};
