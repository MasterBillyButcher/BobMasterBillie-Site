// Fill these in from Supabase: Project Settings > API Keys.
// Use the publishable / anon key here, NEVER the secret / service_role key.
// This file is loaded in the browser, anyone can read it, that's
// expected: what actually protects the data is the Row Level Security
// policy in sql/reference-sections.sql, not secrecy of this key.
const SUPABASE_URL = "https://pmubujryzedkaxkakfit.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdWJ1anJ5emVka2F4a2FrZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzMzMzIsImV4cCI6MjA5Nzk0OTMzMn0.JuslK1ybs23iIg1DF8B37MN3Qff2aNpJPL_W05eCIA4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
