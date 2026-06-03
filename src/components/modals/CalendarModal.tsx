// src/components/modals/CalendarModal.tsx
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Phone, User, MapPin } from 'lucide-react';
import type { Lead } from '../../types/definitions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onViewLead: (lead: Lead) => void;
}

export default function CalendarModal({ isOpen, onClose, leads, onViewLead }: Props) {
  // Empezamos con el mes y año actual
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isOpen) return null;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Días del mes actual y el primer día de la semana para armar la grilla
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo, 1 = Lunes...

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Generamos la estructura visual de los días
  const days = [];
  // Espacios en blanco para los días antes del día 1
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Los días reales del mes
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Obtenemos la fecha de hoy para resaltarla en el calendario
  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-50 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-gray-200 relative">
        
        {/* HEADER DEL CALENDARIO */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-700">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 capitalize">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agenda Mensual de Seguimientos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={goToToday} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg hover:bg-indigo-100 transition-colors">
              Hoy
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={prevMonth} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all"><ChevronRight size={20}/></button>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <button onClick={onClose} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* GRILLA DEL CALENDARIO */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-black text-gray-400 uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Celdas de los días */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-2 overflow-y-auto pb-4">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="bg-gray-100/50 rounded-xl border border-dashed border-gray-200"></div>;
              }

              // Formateamos la fecha a YYYY-MM-DD para cruzarla fácil con la base de datos
              const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              // Filtramos los leads que tienen recordatorio para este día específico
              const dayLeads = leads.filter(l => l.nextFollowUpDate && l.nextFollowUpDate.startsWith(dateString));

              return (
                <div key={day} className={`bg-white rounded-xl border p-2 flex flex-col gap-1 transition-all hover:border-indigo-300 hover:shadow-md ${isToday(day) ? 'ring-2 ring-indigo-500 border-transparent shadow-sm' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${isToday(day) ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                      {day}
                    </span>
                    {dayLeads.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {dayLeads.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Contenedor escrolleable para no romper la celda si hay muchas llamadas */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {dayLeads.map(lead => {
                      // Sacamos la hora para mostrarla
                      const timeStr = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      
                      // 💡 DETECTOR DE VISITAS POR ESTADO DE LEAD (Estructurado y sin fallas)
                      const currentStage = lead.type === 'LOTE' ? lead.statusLote : lead.statusDepa;
                      const isVisit = currentStage === 'Visita Proyecto' || currentStage === 'Visita Piloto';
                      
                      // Asignación de colores dinámicos
                      let containerClass = '';
                      let titleClass = '';
                      let subTextClass = '';

                      if (isVisit) {
                          containerClass = 'bg-emerald-500 border-emerald-600 hover:bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400';
                          titleClass = 'text-white';
                          subTextClass = 'text-emerald-100';
                      } else if (lead.type === 'DEPA') {
                          containerClass = 'bg-purple-50 border-purple-100 hover:border-purple-300';
                          titleClass = 'text-purple-800';
                          subTextClass = 'text-gray-500';
                      } else {
                          containerClass = 'bg-amber-50 border-amber-100 hover:border-amber-300';
                          titleClass = 'text-amber-800';
                          subTextClass = 'text-gray-500';
                      }
                      
                      return (
                        <div 
                          key={lead.id} 
                          onClick={() => { onClose(); onViewLead(lead); }}
                          className={`p-1.5 rounded-lg text-[10px] cursor-pointer border transition-all hover:scale-[1.02] flex flex-col gap-0.5 ${containerClass}`}
                          title={`Estado: ${currentStage} | Motivo: ${lead.nextFollowUpNote || 'Sin nota'}`}
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className={`truncate ${titleClass}`}>{lead.name}</span>
                            {isVisit && <MapPin size={12} className="shrink-0 animate-bounce text-emerald-100" />}
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <span className={`flex items-center gap-0.5 ${subTextClass}`}>
                              {isVisit ? <MapPin size={8}/> : <Phone size={8}/>} {timeStr}
                            </span>
                            <span className={`font-medium uppercase ${isVisit ? 'text-emerald-100 font-bold' : 'text-gray-400'}`}>
                              {lead.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}