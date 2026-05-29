const { loginUser } = require('./supabase-client');
async function test() {
  const session = await loginUser('bakouanebenezer00@gmail.com', '12345678');
  console.log("data.session:", session.session);
}
test();
