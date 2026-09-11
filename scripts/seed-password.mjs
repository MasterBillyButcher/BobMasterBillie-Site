/**
 * One-time setup script.
 *
 * Reads DASHBOARD_PASSWORD from the environment, hashes it with bcrypt,
 * and writes ONLY the hash to Supabase. DASHBOARD_PASSWORD itself is
 * never stored anywhere.
 *
 * Usage:
 *   1. Fill in .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      and the plaintext password you want to use.
 *   2. Run the SQL in supabase/schema.sql against your project first.
 *   3. npm run seed:password
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) config({ path: '.env.local' });
else config();

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  if (!password || password.length < 10) {
    console.error('Set DASHBOARD_PASSWORD to a value at least 10 characters long.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const hash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('dashboard_auth')
    .upsert(
      { id: 1, password_hash: hash, password_version: 1, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Failed to seed password:', error.message);
    process.exit(1);
  }

  console.log('✅ Dashboard password seeded successfully.');
}

main();
