// Shared by every /api/*.js file. Lives under api/_lib/ specifically
// because Vercel turns every file directly under /api into a public
// route — the underscore-prefixed folder tells it not to do that for
// this one, since it's a helper module, not an endpoint.
//
// Without this, the password check is guessable at unlimited speed —
// a "password" that can be tried infinitely fast isn't really
// protecting anything. This closes that gap: after too many wrong
// guesses from the same IP in a short window, further attempts are
// rejected before the password is even compared, regardless of
// whether the guess would have been correct.

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 10;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

// Returns { allowed: true } or { allowed: false }. Call this BEFORE
// comparing the submitted password against EDIT_PASSWORD, so an
// attacker who's already over the limit can't extract any signal
// (timing or otherwise) from further guesses.
async function checkRateLimit(supabase, req) {
  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", windowStart);

  if (error) {
    // Fail OPEN on infrastructure errors (e.g. the table doesn't
    // exist yet because sql/auth-attempts.sql hasn't been run) rather
    // than locking every user out of a working password because of a
    // missing migration. This is a deliberate tradeoff: availability
    // over rate-limiting when the rate-limiter itself is broken.
    console.warn("Rate limit check failed, allowing request:", error.message);
    return { allowed: true, ip };
  }

  return { allowed: (count || 0) < MAX_ATTEMPTS, ip };
}

// Call this after a submitted password turns out to be wrong.
// Best-effort — a failure to record shouldn't block the response the
// user already got.
async function recordFailedAttempt(supabase, ip) {
  try {
    await supabase.from("auth_attempts").insert({ ip });
    // opportunistic cleanup of old rows, so this table doesn't grow
    // forever — not critical to correctness (the time-window query
    // above ignores old rows regardless), just housekeeping.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("auth_attempts").delete().lt("created_at", cutoff);
  } catch (e) {
    console.warn("Could not record failed attempt:", e.message);
  }
}

module.exports = { checkRateLimit, recordFailedAttempt, WINDOW_MINUTES, MAX_ATTEMPTS };
