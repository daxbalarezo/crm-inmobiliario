import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
  const { data: users, error } = await supabase.from('users').select('uid, name, role, tenant_id');
  console.log("Error:", error);
  console.log("Users:", users);
}

checkUsers();
