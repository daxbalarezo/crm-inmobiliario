// src/utils/helpers.ts

export const checkAlertStatus = (dateStr?: string) => {
  if (!dateStr) return 'none';
  const now = new Date();
  const todayStart = new Date(now.setHours(0,0,0,0));
  const reminderDate = new Date(new Date(dateStr).setHours(0,0,0,0));
  const nextWeek = new Date(todayStart); nextWeek.setDate(todayStart.getDate() + 7);
  
  if (reminderDate < todayStart) return 'overdue';
  if (reminderDate.getTime() === todayStart.getTime()) return 'today';
  if (reminderDate > todayStart && reminderDate <= nextWeek) return 'upcoming';
  return 'future';
};

export const getInterestColor = (level?: string) => {
    switch(level) {
        case 'Alto': return 'bg-emerald-500 ring-4 ring-emerald-100'; 
        case 'Medio': return 'bg-amber-400 ring-4 ring-amber-100'; 
        case 'Bajo': return 'bg-rose-500 ring-4 ring-rose-100'; 
        default: return 'bg-gray-300';
    }
};

export const getStatusColor = (status: string) => {
    switch(status) {
        case 'Nuevo': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'Contactado': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'No Contesta': return 'bg-rose-100 text-rose-800 border-rose-200';
        case 'Visita Proyecto': case 'Visita Piloto': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'Separación': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Vendido': return 'bg-emerald-500 text-white shadow-md shadow-emerald-200';
        case 'No Interesado': return 'bg-slate-200 text-slate-500 border-slate-300';
        default: return 'bg-gray-100 text-gray-600';
    }
};

export const formatDateShort = (isoString: string) => {
    try { const date = new Date(isoString); return `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`; } catch (e) { return ""; }
}

export const formatDate = (isoString: string) => {
    try { return new Date(isoString).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return isoString; }
};