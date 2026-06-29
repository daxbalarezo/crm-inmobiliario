import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log("Fetching non-existent role...");
    const { data, error } = await supabase.from('roles').select('name, base_role, permissions').eq('id', 'e6217ba9-ac1f-454f-bcaf-ceca7ac9d3d2').single();
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (e) {
    console.error("CAUGHT EXCEPTION:", e);
  }
}

test();
