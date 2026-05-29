const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

async function checkDB() {
  const { data: publicUsers, error: pubErr } = await sb.from('users').select('*');
  console.log('--- Utilisateurs dans la table publique (profils) ---');
  if (pubErr) console.error(pubErr);
  else {
    console.log(`${publicUsers.length} profil(s) trouvé(s).`);
    publicUsers.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}, Phone: ${u.phone}`));
  }
}
checkDB();
