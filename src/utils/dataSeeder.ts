import { supabase } from '../config/supabase';

const FIRST_NAMES = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Jorge', 'Lucia', 'Miguel', 'Carmen', 'Pedro', 'Laura', 'Diego', 'Elena', 'Fernando', 'Paula'];
const LAST_NAMES = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Suarez', 'Diaz', 'Flores', 'Ruiz', 'Torres', 'Ramirez', 'Cruz'];

const SOURCES = ['Facebook', 'Instagram', 'Web', 'Referido', 'Google Ads', 'Presencial'];
const STAGES = ['01 - Prospecto', '02 - Contactado', '03 - Negociación', '04 - Visita', '05 - Separación', '06 - Vendido', '07 - Perdido'];
const LOSS_REASONS = ['Precio muy alto', 'Falta de crédito', 'Eligió a la competencia', 'Ya no está interesado', 'No contesta'];
const INTEREST_LEVELS = ['Alto', 'Medio', 'Bajo'];

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export async function clearTestData(tenantId: string) {
  if (!tenantId) return;
  try {
    await supabase.from('leads').delete().eq('tenant_id', tenantId);
    // await supabase.from('lead_activities').delete().eq('tenant_id', tenantId);
  } catch (error) {
    console.error("Error clearing test data:", error);
  }
}

export const seedTestData = async (tenantId: string, users: any[]) => {
  if (!tenantId || users.length === 0) {
    throw new Error("Se necesita un tenantId y una lista de asesores");
  }

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const numLeads = 400;
  const leadsToInsert = [];
  
  for (let i = 0; i < numLeads; i++) {
    const assignedUser = randomItem(users);
    const createdAt = randomDate(sixMonthsAgo, now);
    const status = randomItem(STAGES);
    const isLost = status === '07 - Perdido';

    const leadData: any = {
      tenant_id: tenantId,
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

    // Lógica para inyectar presupuestos y montos según la etapa
    if (status === '03 - Negociación') {
      leadData.custom_data = {
        presupuesto: randomInt(100000, 500000)
      };
    } else if (status === '05 - Separación' || status === '06 - Vendido') {
      leadData.saved_proforma = {
        finalPrice: randomInt(100000, 500000),
        unitName: 'Dpto Seed',
        proformaId: 'seed',
        createdAt: new Date().toISOString()
      };
    }

    leadsToInsert.push(leadData);
  }

  // Insertar en Supabase en bloques de 100
  for (let i = 0; i < leadsToInsert.length; i += 100) {
    const chunk = leadsToInsert.slice(i, i + 100);
    const { error } = await supabase.from('leads').insert(chunk);
    if (error) {
      console.error("Error inserting seed chunk:", error);
    }
  }
};
