const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

async function checkDB() {
  const { data: authUsers, error: authErr } = await sb.auth.admin.listUsers();
  console.log('--- Utilisateurs dans Auth ---');
  if (authErr) console.error(authErr);
  else {
    console.log(`${authUsers.users.length} compte(s) trouvé(s).`);
    authUsers.users.forEach(u => console.log(`- ${u.email} (Tel: ${u.phone}) confirmed_at: ${u.email_confirmed_at}`));
  }
}
checkDB();
