const { createClient } = require("@supabase/supabase-js");

// Service-role client — full DB access, bypasses RLS. Only ever
// imported by code running on the server (api/*.js). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set as Vercel environment variables,
// never committed and never shipped to the browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
