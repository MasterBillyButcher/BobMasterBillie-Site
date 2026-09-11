const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

/**
 * TEST MODE ONLY: when AUTH_TEST_MODE=1, this module skips Supabase
 * entirely and uses an in-memory row instead, so `npm test` can run the
 * full auth flow without real credentials or network access. This flag
 * must never be set in production — nothing in server.js or lib/auth.js
 * sets it, and it isn't referenced anywhere outside this file.
 */
if (process.env.AUTH_TEST_MODE === '1') {
  const initialPassword = process.env.AUTH_TEST_INITIAL_PASSWORD || 'test-password-123456';
  const state = {
    id: 1,
    password_hash: bcrypt.hashSync(initialPassword, 10),
    password_version: 1,
    updated_at: new Date().toISOString(),
  };

  module.exports = {
    getAdminClient: () => null,
    async getDashboardAuthRow() {
      return { ...state };
    },
    async updateDashboardPassword(newHash) {
      state.password_hash = newHash;
      state.password_version += 1;
      state.updated_at = new Date().toISOString();
      return state.password_version;
    },
  };
} else {
  module.exports = createSupabaseBackedModule();
}

/**
 * This client uses the SERVICE ROLE key. It is only ever required from
 * server.js and lib/auth.js — never from anything in /public, which is
 * the only directory served to the browser.
 */
function createSupabaseBackedModule() {
  let cachedClient = null;
  const TABLE = 'dashboard_auth';
  const ROW_ID = 1;

  function getAdminClient() {
    if (cachedClient) return cachedClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedClient;
  }

  /** Fetches the single auth row (hash + version). Throws if not seeded yet. */
  async function getDashboardAuthRow() {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, password_hash, password_version, updated_at')
      .eq('id', ROW_ID)
      .single();

    if (error || !data) {
      throw new Error(
        'Dashboard auth is not configured. Run `npm run seed:password` after setting up Supabase.'
      );
    }

    return data;
  }

  /** Updates the password hash and bumps the version, invalidating old sessions. */
  async function updateDashboardPassword(newHash) {
    const supabase = getAdminClient();
    const current = await getDashboardAuthRow();
    const nextVersion = current.password_version + 1;

    const { error } = await supabase
      .from(TABLE)
      .update({
        password_hash: newHash,
        password_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ROW_ID);

    if (error) {
      throw new Error('Failed to update password.');
    }

    return nextVersion;
  }

  return { getAdminClient, getDashboardAuthRow, updateDashboardPassword };
}
