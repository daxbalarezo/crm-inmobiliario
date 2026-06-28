import { supabase } from '../config/supabase';

const FIRST_NAMES = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Jorge', 'Lucia', 'Miguel', 'Carmen', 'Pedro', 'Laura', 'Diego', 'Elena', 'Fernando', 'Paula'];
const LAST_NAMES = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Suarez', 'Diaz', 'Flores', 'Ruiz', 'Torres', 'Ramirez', 'Cruz'];

const SOURCES = ['TikTok', 'Facebook Ads', 'Instagram Ads', 'Tráfico Orgánico', 'Referido', 'Ferias Inmobiliarias', 'Portales Inmobiliarios', 'WhatsApp', 'Walk-in / Letrero', 'Google Ads'];
const LOSS_REASONS = ['Precio / Presupuesto', 'Perdido ante competidor', 'No hay decisión / Pospuesto', 'No encaja / Características', 'No contesta / Incontactable', 'Financiamiento rechazado', 'Fuera de Perfil', 'Otro'];
const INTEREST_LEVELS = ['Alto', 'Medio', 'Bajo'];

// Official Pipeline Stages
const STAGES = ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO', 'PERDIDO'];

// Helper to generate UUID v4
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Weighted random stage selector
const getWeightedStageIndex = (totalStages: number) => {
  const rand = Math.random() * 100;
  if (totalStages === 0) return 0;
  
  if (totalStages <= 3) {
    return Math.floor(Math.random() * totalStages);
  }
  
  if (rand < 25) return 0; // 25% Primera columna
  if (rand < 40) return 1; // 15% Segunda columna
  if (rand < 55) return 2; // 15% Tercera columna (Negociación)
  if (rand < 65 && totalStages > 3) return 3; // 10% Cuarta columna
  if (rand < 75 && totalStages > 4) return totalStages - 3; // 10% Antepenúltima (Separación)
  if (rand < 85 && totalStages > 5) return totalStages - 2; // 10% Penúltima (Vendido)
  return totalStages - 1; // 15% Última (Perdidos)
};

export async function clearTestData(tenantId: string) {
  if (!tenantId) return;
  try {
    await supabase.from('lead_activities').delete().eq('tenant_id', tenantId);
    await supabase.from('leads').delete().eq('tenant_id', tenantId);
  } catch (error) {
    console.error("Error clearing test data:", error);
  }
}

export const seedTestData = async (tenantId: string, users: any[], stages: any[], projectId?: string) => {
  if (!tenantId || users.length === 0 || stages.length === 0) {
    throw new Error("Se necesita un tenantId, una lista de asesores y las etapas del embudo.");
  }

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const numLeads = 400;
  const leadsToInsert = [];
  const activitiesToInsert = [];
  
  for (let i = 0; i < numLeads; i++) {
    const assignedUser = randomItem(users);
    const createdAt = randomDate(sixMonthsAgo, now);
    const stageObj = stages[getWeightedStageIndex(stages.length)];
    const status = stageObj.name;
    const isLost = status.toUpperCase().includes('PERDID');
    const isVendido = status.toUpperCase().includes('VENDID') || status.toUpperCase().includes('CERRAD');
    const isNegociacion = status.toUpperCase().includes('NEGOCIACI');
    const isSeparacion = status.toUpperCase().includes('SEPARACI');
    const leadId = uuidv4();

    const leadData: any = {
      id: leadId,
      tenant_id: tenantId,
      project_id: projectId || undefined,
      assigned_to: assignedUser.uid || assignedUser.id,
      name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      email: `test_${i}_${Date.now()}@example.com`,
      phone: `+51 9${randomInt(10000000, 99999999)}`,
      source: randomItem(SOURCES),
      status,
      interest_level: randomItem(INTEREST_LEVELS),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    if (isLost) {
      leadData.loss_reason = randomItem(LOSS_REASONS);
    }

    if (isNegociacion || status.toUpperCase().includes('VISIT')) {
      leadData.custom_data = { presupuesto: randomInt(100000, 500000) };
    } else if (isSeparacion || isVendido) {
      leadData.saved_proforma = {
        finalPrice: randomInt(100000, 500000),
        unitName: `Dpto ${randomInt(100, 900)}`,
        proformaId: `PROF-${randomInt(1000, 9999)}`,
        createdAt: new Date(createdAt.getTime() + 86400000).toISOString()
      };
    }

    // Generate Activities Based on Stage
    let numActivities = 0;
    if (isLost) {
      numActivities = randomInt(1, 2);
    } else if (isNegociacion) {
      numActivities = randomInt(2, 4);
    } else if (isSeparacion || isVendido) {
      numActivities = randomInt(3, 5);
    } else {
      numActivities = randomInt(0, 1);
    }

    const actionTypes = ['note', 'call', 'whatsapp', 'status_change', 'meeting', 'proforma'];
    
    for (let a = 0; a < numActivities; a++) {
      const actDate = new Date(createdAt.getTime() + (a * 3600000) + randomInt(1000, 3600000));
      activitiesToInsert.push({
        id: uuidv4(),
        tenant_id: tenantId,
        lead_id: leadId,
        user_id: assignedUser.uid || assignedUser.id,
        user_name: assignedUser.name || 'Asesor',
        action_type: randomItem(actionTypes),
        description: `Actividad generada automáticamente (Seeder)`,
        status: 'completed',
        created_at: actDate.toISOString()
      });
    }

    leadsToInsert.push(leadData);
  }

  // Insert in chunks of 100
  for (let i = 0; i < leadsToInsert.length; i += 100) {
    const chunk = leadsToInsert.slice(i, i + 100);
    const { error } = await supabase.from('leads').insert(chunk);
    if (error) console.error("Error inserting leads chunk:", error);
  }

  for (let i = 0; i < activitiesToInsert.length; i += 100) {
    const chunk = activitiesToInsert.slice(i, i + 100);
    const { error } = await supabase.from('lead_activities').insert(chunk);
    if (error) console.error("Error inserting activities chunk:", error);
  }
};

