const fs = require('fs');
const dotenvStr = fs.readFileSync('.env', 'utf8');
const env = {};
dotenvStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/['\u0022]/g, '').trim();
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
// Read service key from .env if present, otherwise use anon
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

async function fetchTable(table) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?select=*', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  console.log('--- ' + table.toUpperCase() + ' ---');
  console.log(await res.text());
}
fetchTable('roles');
