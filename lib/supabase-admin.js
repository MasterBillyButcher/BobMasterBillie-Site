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
  const items = [];
  let nextItemId = 1;

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
    async upsertDashboardPassword(newHash) {
      state.password_hash = newHash;
      state.password_version += 1;
      state.updated_at = new Date().toISOString();
      return state.password_version;
    },
    async listItems(section) {
      return items
        .filter((i) => i.section === section)
        .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    },
    async createItem({ section, title, body, url }) {
      const maxPosition = items
        .filter((i) => i.section === section)
        .reduce((max, i) => Math.max(max, i.position), -1);
      const item = {
        id: String(nextItemId++),
        section,
        title,
        body: body || null,
        url: url || null,
        position: maxPosition + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      items.push(item);
      return item;
    },
    async updateItem(id, { title, body, url }) {
      const item = items.find((i) => i.id === id);
      if (!item) throw new Error('Item not found.');
      if (title !== undefined) item.title = title;
      if (body !== undefined) item.body = body || null;
      if (url !== undefined) item.url = url || null;
      item.updated_at = new Date().toISOString();
      return item;
    },
    async deleteItem(id) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return false;
      items.splice(idx, 1);
      return true;
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

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedClient;
  }

  async function fetchRowRaw() {
    const supabase = getAdminClient();
    return supabase
      .from(TABLE)
      .select('id, password_hash, password_version, updated_at')
      .eq('id', ROW_ID)
      .single();
  }

  /** Fetches the single auth row (hash + version). Throws if not seeded yet. */
  async function getDashboardAuthRow() {
    const { data, error } = await fetchRowRaw();
    if (error || !data) {
      throw new Error('Dashboard auth is not configured. Visit /setup.html once to set your password.');
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

  /**
   * Sets the password whether or not a row exists yet — used by the
   * /setup.html flow, which is the ONLY way this app writes to Supabase
   * without already knowing the current password. Guarded in server.js
   * by SETUP_SECRET, not by a logged-in session (there may be none yet).
   */
  async function upsertDashboardPassword(newHash) {
    const supabase = getAdminClient();
    const { data: current } = await fetchRowRaw();
    const nextVersion = current ? current.password_version + 1 : 1;

    const { error } = await supabase.from(TABLE).upsert(
      {
        id: ROW_ID,
        password_hash: newHash,
        password_version: nextVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw new Error('Failed to set password.');
    }

    return nextVersion;
  }

  /**
   * Generic list-item storage backing Commands, Predictions, Channels,
   * Stream Notes, Backlog, Veto Power, Quick Links, and CV. One table,
   * distinguished by `section`. Same lockdown as dashboard_auth: RLS on,
   * no anon/authenticated policies, accessed only via this service-role
   * client, only after requireAuthApi has already checked the session.
   */
  const ITEMS_TABLE = 'dashboard_items';

  async function listItems(section) {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .select('id, section, title, body, url, position, created_at, updated_at')
      .eq('section', section)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to load items.');
    return data || [];
  }

  async function createItem({ section, title, body, url }) {
    const supabase = getAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from(ITEMS_TABLE)
      .select('position')
      .eq('section', section)
      .order('position', { ascending: false })
      .limit(1);

    if (fetchErr) throw new Error('Failed to load items.');
    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .insert({
        section,
        title,
        body: body || null,
        url: url || null,
        position: nextPosition,
      })
      .select('id, section, title, body, url, position, created_at, updated_at')
      .single();

    if (error) throw new Error('Failed to create item.');
    return data;
  }

  async function updateItem(id, { title, body, url }) {
    const supabase = getAdminClient();
    const patch = { updated_at: new Date().toISOString() };
    if (title !== undefined) patch.title = title;
    if (body !== undefined) patch.body = body || null;
    if (url !== undefined) patch.url = url || null;

    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .update(patch)
      .eq('id', id)
      .select('id, section, title, body, url, position, created_at, updated_at')
      .single();

    if (error || !data) throw new Error('Item not found.');
    return data;
  }

  async function deleteItem(id) {
    const supabase = getAdminClient();
    const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', id);
    if (error) throw new Error('Failed to delete item.');
    return true;
  }

  return {
    getAdminClient,
    getDashboardAuthRow,
    updateDashboardPassword,
    upsertDashboardPassword,
    listItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
