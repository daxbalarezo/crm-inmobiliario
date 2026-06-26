const url = 'https://bnfqvyrifixefvawbiev.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZnF2eXJpZml4ZWZ2YXdiaWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTE1MjgsImV4cCI6MjA5NzkyNzUyOH0.AUaYvjqsNWPkb3W5SEPNPC-TFAO_zRdHAs8wA5FrYok';

async function check() {
  console.log("--- USERS ---");
  const res = await fetch(`${url}/rest/v1/users?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const users = await res.json();
  console.log(JSON.stringify(users, null, 2));

  console.log("--- INVITATIONS ---");
  const res2 = await fetch(`${url}/rest/v1/user_invitations?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const invs = await res2.json();
  console.log(JSON.stringify(invs, null, 2));
}
check();
