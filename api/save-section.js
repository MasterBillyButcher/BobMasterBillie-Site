// POST { password, action: "save" | "delete", slug, title, content }
//
// This is the only thing in the whole project allowed to write to
// reference_sections. It runs on Vercel's server, never in the
// browser, so two secrets live only here as environment variables:
//   SUPABASE_SERVICE_ROLE_KEY  — bypasses RLS entirely, must never
//                                 reach client-side code
//   EDIT_PASSWORD              — the shared editing password
//
// The password is re-checked here independently of verify-password.js
// — never trust a client's claim that it already unlocked editing.

const { createClient } = require("@supabase/supabase-js");
const { checkRateLimit, recordFailedAttempt } = require("./_lib/rate-limit.js");

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const editPassword = process.env.EDIT_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!editPassword || !supabaseUrl || !serviceRoleKey) {
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
  body = body || {};

  if (body.password !== editPassword) {
    // Deliberately vague — don't tell a caller whether the slug
    // exists or which part of the request was wrong.
    await recordFailedAttempt(supabase, ip);
    res.status(401).json({ ok: false, error: "Incorrect password" });
    return;
  }

  const action = body.action === "delete" ? "delete" : "save";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ ok: false, error: "Invalid slug — use lowercase letters, numbers, and hyphens only" });
    return;
  }

  if (action === "delete") {
    const { error } = await supabase.from("reference_sections").delete().eq("slug", slug);
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!title) {
    res.status(400).json({ ok: false, error: "Title is required" });
    return;
  }

  const { error } = await supabase
    .from("reference_sections")
    .upsert({ slug, title, content, updated_at: new Date().toISOString() }, { onConflict: "slug" });

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
};
