// src/pages/FollowUpsDashboard.tsx
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar as CalendarIcon, List, PhoneCall, 
  MessageCircle, CheckCircle, Clock, AlertCircle, MapPin, Building,
  ChevronDown, ChevronRight
} from 'lucide-react';
import CalendarView from '../components/CalendarView';
import { useCommercialData } from '../hooks/useCommercialData';
import LeadModal from '../components/LeadModal';
import { saveLeadService } from '../services/leads';
import type { Lead } from '../types/definitions';

export default function FollowUpsDashboard() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isOverdueOpen, setIsOverdueOpen] = useState(true);
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  
  // MOTOR DE PERSISTENCIA CONECTADO A FIREBASE
  const handleSave = async (leadData: Partial<Lead>) => {
    try {
      if (!leadData.tenantId || !leadData.projectId) {
        alert("Error de contexto: No se detectó la empresa o el proyecto activo.");
        return;
      }

      await saveLeadService(
        leadData, 
        leadData.id || null, 
        leadData.tenantId, 
        leadData.projectId, 
        leadData.assignedTo || 'unassigned'
      );
      
      setIsLeadModalOpen(false);
    } catch (error) {
      console.error("Error crítico al guardar prospecto:", error);
      alert("Hubo un error al guardar en la base de datos.");
    }
  };

  // 1. CONEXIÓN REAL A FIREBASE
  const { leads, loading } = useCommercialData();

  // 2. MOTOR DE CÁLCULO DE AGENDA
  const agendaData = useMemo(() => {
    if (!leads) return { overdue: [], today: [] };

    const today = new Date();
    // Ajuste estricto a zona horaria de Perú para evitar cruces de días por UTC
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const activeLeads = leads.filter(l => 
      l.nextFollowUpDate && 
      !['VENTA_CERRADA', 'NO_INTERESADO'].includes(l.status)
    );

    const overdue: any[] = [];
    const todayTasks: any[] = [];

    const projectNames: Record<string, string> = {
      'valle_pacora': 'Valle Pacora',
      'tierras_sol': 'Tierras del Sol',
      'torres_monaco': 'Las Torres de Mónaco'
    };

    activeLeads.forEach(lead => {
      // FIX CRÍTICO: Normalizamos la fecha aislando solo YYYY-MM-DD
      const leadDateStr = lead.nextFollowUpDate!.split('T')[0];

      const isOverdue = leadDateStr < todayStr;
      const isToday = leadDateStr === todayStr;

      const projectName = lead.projectId ? projectNames[lead.projectId] || lead.projectId : 'Sin Proyecto';
      // Mantenemos la distinción estricta de proyectos de lotización vs habilitación urbana
      const isLot = lead.projectId === 'valle_pacora' || lead.projectId === 'tierras_sol';

      const task = {
        id: lead.id,
        clientName: lead.name || 'Prospecto sin nombre',
        project: projectName,
        unitType: isLot ? 'Lotización' : 'Habilitación Urbana / Propiedad',
        interest: lead.interestLevel || 'Medio',
        actionType: 'Seguimiento', 
        note: lead.nextFollowUpNote || 'Contactar al cliente según lo agendado.',
        date: isOverdue ? `Atrasado (${leadDateStr})` : 'Hoy',
        isOverdue: isOverdue,
        phone: lead.phone || ''
      };

      if (isOverdue) overdue.push(task);
      else if (isToday) todayTasks.push(task);
    });

    return { overdue, today: todayTasks };
  }, [leads]);

  // PANTALLA DE CARGA
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6AC]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-[Poppins] font-extrabold text-[#0B2B40] tracking-tight">Agenda de Seguimientos</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* EL NUEVO BOTÓN */}
          <button 
            onClick={() => setIsLeadModalOpen(true)}
            className="bg-[#4DB6AC] text-[#0B2B40] hover:bg-[#3da096] px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <span className="text-lg leading-none">+</span> 
            <span className="hidden sm:inline">Nuevo Prospecto</span>
          </button>

          {/* TUS BOTONES ORIGINALES DE VISTA */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-[#0B2B40] shadow-sm' : 'text-slate-500 hover:text-[#0B2B40]'}`}
            >
              <List size={16} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white text-[#0B2B40] shadow-sm' : 'text-slate-500 hover:text-[#0B2B40]'}`}
            >
              <CalendarIcon size={16} /> Calendario
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por cliente, nota o proyecto..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4DB6AC] outline-none"
              />
            </div>
            <div className="flex gap-3">
              <select className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium focus:outline-none">
                <option value="">Todos los Proyectos</option>
                <option value="valle_pacora">Valle Pacora</option>
                <option value="torres_monaco">Las Torres de Mónaco</option>
              </select>
              <button className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 border border-slate-200">
                <Filter size={18} /> Filtros
              </button>
            </div>
          </div>

          {/* ATRASADOS */}
          <section className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => setIsOverdueOpen(!isOverdueOpen)}
              className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 pl-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-200 text-red-700">
                  <AlertCircle size={14} strokeWidth={3} />
                </span>
                <h3 className="font-bold text-lg text-red-900">
                  Atrasados <span className="ml-2 text-sm font-semibold text-red-600 bg-red-200 px-2 py-0.5 rounded-full">{agendaData.overdue.length}</span>
                </h3>
              </div>
              <div className={`text-red-700 transition-transform duration-300 ${isOverdueOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOverdueOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-4 space-y-3 bg-white/50 border-t border-red-100">
                  {agendaData.overdue.length === 0 ? (
                    <p className="text-center text-slate-500 font-medium py-4">No tienes tareas atrasadas.</p>
                  ) : (
                    agendaData.overdue.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* PARA HOY */}
          <section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => setIsTodayOpen(!isTodayOpen)}
              className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 pl-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-700">
                  <Clock size={14} strokeWidth={3} />
                </span>
                <h3 className="font-bold text-lg text-amber-900">
                  Para Hoy <span className="ml-2 text-sm font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">{agendaData.today.length}</span>
                </h3>
              </div>
              <div className={`text-amber-700 transition-transform duration-300 ${isTodayOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isTodayOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-4 space-y-3 bg-white/50 border-t border-amber-100">
                  {agendaData.today.length === 0 ? (
                    <p className="text-center text-slate-500 font-medium py-4">No tienes tareas programadas para hoy.</p>
                  ) : (
                    agendaData.today.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CalendarView leads={leads} />
        </div>
      )}
      <LeadModal  
        isOpen={isLeadModalOpen}  
        onClose={() => setIsLeadModalOpen(false)}  
        onSave={handleSave}
      />
    </div>
  );
}

// COMPONENTE SECUNDARIO
function TaskCard({ task }: { task: any }) {
  const isLot = task.unitType.includes('Lote');
  
  const handleWhatsApp = () => {
    if (task.phone) {
      window.open(`https://api.whatsapp.com/send?phone=${task.phone}&text=Hola ${task.clientName}, te escribo de Ganesha...`, '_blank');
    } else {
      alert('Este prospecto no tiene número de teléfono registrado.');
    }
  };

  return (
    <div className={`bg-white rounded-xl border ${task.isOverdue ? 'border-red-200' : 'border-slate-200'} shadow-sm p-5 flex flex-col xl:flex-row gap-5 justify-between group`}>
      <div className="flex gap-4 items-start w-full xl:w-1/3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${task.isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {task.clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-[#0B2B40] text-lg leading-none">{task.clientName}</h4>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${task.interest === 'Alto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {task.interest}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
            {isLot ? <MapPin size={14} /> : <Building size={14} />}
            <span>{task.project}</span>
          </div>
        </div>
      </div>
      <div className="w-full xl:w-1/3">
        <span className="text-sm font-bold text-[#0B2B40]">{task.date} - {task.actionType}</span>
        <p className="text-sm text-slate-600 mt-1">{task.note}</p>
      </div>
      <div className="w-full xl:w-auto flex gap-2 shrink-0">
        <button onClick={handleWhatsApp} className="bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#4CAF50] hover:text-white transition-colors px-4 py-2.5 rounded-xl font-bold border border-[#C8E6C9] flex items-center gap-2">
          <MessageCircle size={18}/> 
        </button>
        <button className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-[#0B2B40] hover:bg-slate-50 transition-colors">
          <CheckCircle size={18} className="text-[#4DB6AC]"/> Gestionar
        </button>
      </div>
    </div>
  );
}