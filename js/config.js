// Fill these in from Supabase: Project Settings > API Keys.
// Use the publishable / anon key here, NEVER the secret / service_role key.
// This file is loaded in the browser, anyone can read it, that's
// expected: what actually protects the data is the Row Level Security
// policy in sql/reference-sections.sql, not secrecy of this key.
const SUPABASE_URL = "https://tarhfinmsjdygvdnpdyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcmhmaW5tc2pkeWd2ZG5wZHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODc2NTIsImV4cCI6MjEwNDc2MzY1Mn0.-ILrWYBKXULuK3UapXh1U5xun734Fx5QkRXp89IIPlk";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
