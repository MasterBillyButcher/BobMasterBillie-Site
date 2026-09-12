// POST { password, action: "add" | "remove", title?, id? }
//
// Same security model as save-section.js and adjust-counter.js: the
// password is re-checked here independently, and the actual write
// uses the service_role key, never exposed to the browser.

const { createClient } = require("@supabase/supabase-js");

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

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  if (body.password !== editPassword) {
    res.status(401).json({ ok: false, error: "Incorrect password" });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (body.action === "remove") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      res.status(400).json({ ok: false, error: "id is required" });
      return;
    }
    const { error } = await supabase.from("backlog_items").delete().eq("id", id);
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  // default action: add
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }
  if (title.length > 200) {
    res.status(400).json({ ok: false, error: "title is too long (200 characters max)" });
    return;
  }

  const id = `backlog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("backlog_items").insert({ id, title });

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, id, title });
};
