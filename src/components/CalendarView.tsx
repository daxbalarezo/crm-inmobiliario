// src/components/CalendarView.tsx
import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es as esLocale } from 'date-fns/locale'; 
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'es': esLocale };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Tipamos temporalmente con any[] para asegurar escalabilidad sin romper la compilación
export default function CalendarView({ leads }: { leads: any[] }) {
  
  // Motor de mapeo: De Firebase al Calendario
  const events = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    return leads
      // Filtramos leads que tengan fecha y no estén cerrados/descartados
      .filter(lead => lead.nextFollowUpDate && !['VENTA_CERRADA', 'NO_INTERESADO'].includes(lead.status))
      .map(lead => {
        // Parseamos la fecha manualmente (YYYY-MM-DD) para evitar saltos al día anterior por el UTC
        const [year, month, day] = lead.nextFollowUpDate.split('-');
        // Agendamos el bloque visual al mediodía (12:00) para unificación en la vista mensual
        const eventDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);

        return {
          title: `${lead.actionType || 'Seguimiento'}: ${lead.name || 'Prospecto'}`,
          start: eventDate,
          end: new Date(eventDate.getTime() + 60 * 60 * 1000), // Bloque de 1 hora de duración
          resource: lead // Almacenamos la data real por si en el futuro abrimos un modal al hacer clic
        };
      });
  }, [leads]);

  return (
    <div className="h-[650px] bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día"
        }}
        className="font-[Poppins] font-medium text-slate-700"
      />
    </div>
  );
}