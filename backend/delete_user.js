const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);
async function run() {
  const { data: users, error: selectErr } = await sb.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'bakouanebenezer00@gmail.com');
  if (user) {
    await sb.auth.admin.deleteUser(user.id);
    console.log("User deleted.");
  } else {
    console.log("User not found.");
  }
}
run();
