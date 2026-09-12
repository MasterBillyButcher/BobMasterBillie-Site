// POST { password, action: "add" | "remove" | "adjust", ... }
//   add:    { username }               -> creates a new entry at count 0
//   remove: { id }                      -> deletes an entry entirely
//   adjust: { id, delta }               -> atomic +/- on veto_count
//
// Same security model as the other /api files: password re-checked
// here independently, actual write uses the service_role key, never
// exposed to the browser. The adjust action goes through
// adjust_veto_entry(), a single atomic SQL statement, so two people
// clicking +/- on the same person at nearly the same moment can't
// race each other into a wrong number.

const { createClient } = require("@supabase/supabase-js");
const { checkRateLimit, recordFailedAttempt } = require("./_lib/rate-limit.js");

const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

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
    await recordFailedAttempt(supabase, ip);
    res.status(401).json({ ok: false, error: "Incorrect password" });
    return;
  }

  const action = body.action;

  if (action === "add") {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username) {
      res.status(400).json({ ok: false, error: "username is required" });
      return;
    }
    if (username.length > 60) {
      res.status(400).json({ ok: false, error: "username is too long (60 characters max)" });
      return;
    }
    const id = `veto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await supabase.from("veto_entries").insert({ id, username, veto_count: 0 });
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true, id, username, veto_count: 0 });
    return;
  }

  if (action === "remove") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      res.status(400).json({ ok: false, error: "id is required" });
      return;
    }
    const { error } = await supabase.from("veto_entries").delete().eq("id", id);
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "adjust") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const delta = Number(body.delta);
    if (!ID_PATTERN.test(id)) {
      res.status(400).json({ ok: false, error: "Invalid entry id" });
      return;
    }
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
      res.status(400).json({ ok: false, error: "delta must be a non-zero integer, at most 1000 in magnitude" });
      return;
    }
    const { data, error } = await supabase.rpc("adjust_veto_entry", { p_id: id, p_delta: delta });
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    if (data === null) {
      res.status(404).json({ ok: false, error: `No veto entry with id "${id}"` });
      return;
    }
    res.status(200).json({ ok: true, veto_count: data });
    return;
  }

  res.status(400).json({ ok: false, error: 'action must be "add", "remove", or "adjust"' });
};
