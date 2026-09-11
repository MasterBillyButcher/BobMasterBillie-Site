// POST { password } -> { ok: true } or { ok: false }
// Used by the "Unlock editing" button on reference.html to check the
// password before showing edit controls. Does not write anything —
// save-section.js re-checks the password again independently, so
// this endpoint being called successfully is not itself a write
// credential; it's just a UX convenience.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const editPassword = process.env.EDIT_PASSWORD;
  if (!editPassword) {
    // Misconfiguration: the env var was never set in Vercel. Fail
    // closed (deny), not open, and say so plainly rather than a
    // generic 500.
    res.status(500).json({ ok: false, error: "EDIT_PASSWORD is not configured on the server" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const submitted = body && typeof body.password === "string" ? body.password : "";

  res.status(200).json({ ok: submitted === editPassword });
};
