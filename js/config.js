// Fill these in from Supabase: Project Settings > API Keys.
// Use the publishable / anon key here, NEVER the secret / service_role key.
// This file is loaded in the browser, anyone can read it, that's
// expected: what actually protects the data is the Row Level Security
// policy in sql/reference-sections.sql, not secrecy of this key.
const SUPABASE_URL = "https://jboticuqevufjrwjmeyc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qTXNTtDxFnay9VmVGJTEMQ_32vo0w_5";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
