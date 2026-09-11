/**
 * One-time setup script.
 *
 * Reads DASHBOARD_PASSWORD from the environment (never committed, never
 * shipped to the client), hashes it with bcrypt, and writes ONLY the hash
 * to Supabase. DASHBOARD_PASSWORD itself is never stored anywhere.
 *
 * Usage:
 *   1. Fill in .env.local (see .env.example) with your Supabase project's
 *      URL, service role key, and the plaintext password you want to use.
 *   2. Run the schema in supabase/schema.sql against your project.
 *   3. npm run seed:password
 *   4. Remove DASHBOARD_PASSWORD from .env.local afterwards if you like —
 *      it's not read again at runtime, only by this script.
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) config({ path: '.env.local' });
else config();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.');
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
  console.log('   You can now remove DASHBOARD_PASSWORD from your environment if you want —');
  console.log('   it is not read again at runtime, only the stored hash is used.');
}

main();
