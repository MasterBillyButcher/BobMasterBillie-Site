// POST { password, id, delta } -> { ok: true, value: <new number> }
//
// Same security model as save-section.js: the password is re-checked
// here independently, and the actual write uses the service_role key
// (never exposed to the browser). The increment itself happens
// inside a single Postgres statement (adjust_reference_counter), so
// two people clicking +/- at nearly the same moment can't race each
// other into a wrong number — there's no "read the value, then write
// it back" round trip on this end at all.

const { createClient } = require("@supabase/supabase-js");

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

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  if (body.password !== editPassword) {
    res.status(401).json({ ok: false, error: "Incorrect password" });
    return;
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const delta = Number(body.delta);

  if (!ID_PATTERN.test(id)) {
    res.status(400).json({ ok: false, error: "Invalid counter id" });
    return;
  }
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
    res.status(400).json({ ok: false, error: "delta must be a non-zero integer, at most 1000 in magnitude" });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc("adjust_reference_counter", {
    p_id: id,
    p_delta: delta,
  });

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }
  if (data === null) {
    res.status(404).json({ ok: false, error: `No counter with id "${id}"` });
    return;
  }

  res.status(200).json({ ok: true, value: data });
};
