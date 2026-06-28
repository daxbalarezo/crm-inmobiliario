const SUPABASE_URL = 'https://bnfqvyrifixefvawbiev.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZnF2eXJpZml4ZWZ2YXdiaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTE1MjgsImV4cCI6MjA5NzkyNzUyOH0.AUaYvjqsNWPkb3W5SEPNPC-TFAO_zRdHAs8wA5FrYok';

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  console.log('--- ' + table.toUpperCase() + ' ---');
  console.log(await res.text());
}
fetchTable('roles');
fetchTable('users');
fetchTable('tenants');
