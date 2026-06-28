import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testLogic() {
  const tenantId = '86a330a4-d0f9-4193-a82b-47740c92dfbd'; // Using the tenant_id we found
  
  const { data: leads } = await supabase.from('leads').select('*').eq('tenant_id', tenantId);
  const { data: users } = await supabase.from('users').select('*').eq('tenant_id', tenantId);
  
  const mappedLeads = leads.map(row => ({
    ...row,
    createdAt: row.created_at,
    assignedTo: row.assigned_to,
  }));
  
  const fetchedUsers = users.filter(u => u.role === 'agent');
  
  const stageCounts = {
    'PROSPECTO': 0,
    'SIN_CONTACTAR': 0,
    'EN_NEGOCIACION': 0,
    'VISITA': 0,
    'SEPARACION': 0,
    'VENDIDO': 0,
    'PERDIDO': 0
  };
  
  let totalClosed = 0;
  
  mappedLeads.forEach(l => {
    const statusStr = (l.status || '').toUpperCase();
    if (statusStr === 'VENDIDO' || statusStr === 'CERRADO') {
      stageCounts['VENDIDO']++;
      totalClosed++;
    } else if (statusStr === 'SEPARACION') {
      stageCounts['SEPARACION']++;
    } else if (statusStr === 'VISITA') {
      stageCounts['VISITA']++;
    } else if (statusStr === 'EN_NEGOCIACION' || statusStr === 'EN NEGOCIACION') {
      stageCounts['EN_NEGOCIACION']++;
    } else if (statusStr === 'SIN_CONTACTAR' || statusStr === 'SIN CONTACTAR' || statusStr === 'CONTACTADO') {
      stageCounts['SIN_CONTACTAR']++;
    } else if (statusStr === 'PROSPECTO' || statusStr === 'NUEVO') {
      stageCounts['PROSPECTO']++;
    } else if (statusStr === 'PERDIDO') {
      stageCounts['PERDIDO']++;
    }
  });
  
  console.log("Stage Counts:", stageCounts);
}

testLogic();
