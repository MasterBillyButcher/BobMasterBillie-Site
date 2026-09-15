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
  const docs = {};

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
    async getDoc(section) {
      return docs[section] || { section, content: '', previous_content: null, previous_updated_at: null, updated_at: null };
    },
    async saveDoc(section, content) {
      const existing = docs[section];
      const doc = {
        section,
        content,
        previous_content: existing ? existing.content : null,
        previous_updated_at: existing ? existing.updated_at : null,
        updated_at: new Date().toISOString(),
      };
      docs[section] = doc;
      return doc;
    },
    async revertDoc(section) {
      const existing = docs[section];
      if (!existing || existing.previous_content === null || existing.previous_content === undefined) {
        throw new Error('Nothing to revert to.');
      }
      const doc = {
        section,
        content: existing.previous_content,
        previous_content: null,
        previous_updated_at: null,
        updated_at: new Date().toISOString(),
      };
      docs[section] = doc;
      return doc;
    },
    async listDocs(sections, { full } = {}) {
      return sections.map((section) => {
        const doc = docs[section];
        if (full) {
          return doc ? { ...doc } : { section, content: '', updated_at: null };
        }
        return { section, updated_at: doc ? doc.updated_at : null };
      });
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
  /**
   * One free-text document per section — Twitch, Nightbot, Commands,
   * Predictions, Channels, Notes, Backlog, Veto, Links, CV. Same
   * lockdown as dashboard_auth: RLS on, no anon/authenticated policies,
   * accessed only via this service-role client, only after
   * requireAuthApi has already checked the session.
   */
  const DOCS_TABLE = 'dashboard_docs';

  async function getDoc(section) {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from(DOCS_TABLE)
      .select('section, content, previous_content, previous_updated_at, updated_at')
      .eq('section', section)
      .maybeSingle();

    if (error) throw new Error('Failed to load document.');
    return (
      data || { section, content: '', previous_content: null, previous_updated_at: null, updated_at: null }
    );
  }

  async function saveDoc(section, content) {
    const supabase = getAdminClient();
    const existing = await getDoc(section);

    const { data, error } = await supabase
      .from(DOCS_TABLE)
      .upsert(
        {
          section,
          content,
          previous_content: existing.updated_at ? existing.content : null,
          previous_updated_at: existing.updated_at || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'section' }
      )
      .select('section, content, previous_content, previous_updated_at, updated_at')
      .single();

    if (error) throw new Error('Failed to save document.');
    return data;
  }

  async function revertDoc(section) {
    const supabase = getAdminClient();
    const existing = await getDoc(section);

    if (existing.previous_content === null || existing.previous_content === undefined) {
      throw new Error('Nothing to revert to.');
    }

    const { data, error } = await supabase
      .from(DOCS_TABLE)
      .update({
        content: existing.previous_content,
        previous_content: null,
        previous_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('section', section)
      .select('section, content, previous_content, previous_updated_at, updated_at')
      .single();

    if (error) throw new Error('Failed to revert document.');
    return data;
  }

  async function listDocs(sections, { full } = {}) {
    const supabase = getAdminClient();
    const columns = full ? 'section, content, updated_at' : 'section, updated_at';
    const { data, error } = await supabase.from(DOCS_TABLE).select(columns).in('section', sections);

    if (error) throw new Error('Failed to load documents.');
    const bySection = new Map((data || []).map((d) => [d.section, d]));
    return sections.map(
      (section) => bySection.get(section) || (full ? { section, content: '', updated_at: null } : { section, updated_at: null })
    );
  }

  return {
    getAdminClient,
    getDashboardAuthRow,
    updateDashboardPassword,
    upsertDashboardPassword,
    getDoc,
    saveDoc,
    revertDoc,
    listDocs,
  };
}
