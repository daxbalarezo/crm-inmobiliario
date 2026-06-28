import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
  console.log("Fetching leads...");
  const { data: leads, error: err1 } = await supabase.from('leads').select('*');
  console.log("Leads error:", err1);
  console.log("Total leads:", leads?.length);
  if (leads?.length > 0) {
    console.log("First lead:", leads[0]);
  }

  console.log("\nFetching users...");
  const { data: users, error: err2 } = await supabase.from('users').select('*');
  console.log("Users error:", err2);
  console.log("Total users:", users?.length);
  if (users?.length > 0) {
    console.log("First user:", users[0]);
  }
}

checkData();
