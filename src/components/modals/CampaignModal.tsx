// src/components/modals/CampaignModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Megaphone, Send, Users, AlertCircle, MessageCircle, Play } from 'lucide-react';
import type { Lead } from '../../types/definitions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  activeModule: 'LOTE' | 'DEPA';
}

export default function CampaignModal({ isOpen, onClose, leads, activeModule }: Props) {
  const [selectedStage, setSelectedStage] = useState('Incubadora');
  const [messageTemplate, setMessageTemplate] = useState('Hola {nombre}, soy Daniel de Inmobiliaria Ganesha. Tenemos los últimos bonos de Techo Propio disponibles este mes y me acordé de ti. ¿Te envío la info actualizada?');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  // Filtramos a quiénes vamos a atacar
  const targetLeads = useMemo(() => {
    return leads.filter(l => 
      l.type === activeModule && 
      (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === selectedStage &&
      l.phone // Aseguramos que tengan número
    );
  }, [leads, activeModule, selectedStage]);

  const handleSendNext = () => {
    if (currentIndex >= targetLeads.length) return;

    const currentLead = targetLeads[currentIndex];
    const phone = currentLead.phone.replace(/\D/g, ''); // Limpiar el número
    
    // Reemplazamos {nombre} por el primer nombre del cliente
    const firstName = currentLead.name.split(' ')[0] || 'amigo';
    const finalMessage = messageTemplate.replace(/{nombre}/gi, firstName);

    // Abrir WhatsApp
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMessage)}`, '_blank');
    
    // Pasar al siguiente automáticamente en la lista
    setCurrentIndex(prev => prev + 1);
  };

  const resetCampaign = () => {
    setCurrentIndex(0);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-50 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-gray-200">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-xl text-green-700">
              <Megaphone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800">Campaña WhatsApp (Modo Ráfaga)</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seguimiento Masivo Seguro</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONFIGURACIÓN DE LA CAMPAÑA */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Selecciona el Grupo</label>
              <select 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                value={selectedStage}
                onChange={(e) => { setSelectedStage(e.target.value); setCurrentIndex(0); }}
              >
                <option value="No Contesta">No Contesta (Recientes)</option>
                <option value="Incubadora">Incubadora (Enfriados)</option>
                <option value="Nuevo">Nuevos sin tocar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between">
                <span>2. Escribe tu guión</span>
                <span className="text-green-600 bg-green-50 px-2 rounded">Usa {"{nombre}"}</span>
              </label>
              <textarea 
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Hola {nombre}, te escribo porque..."
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-2">
              <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5"/>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>¿Por qué Ráfaga Manual?</strong> WhatsApp bloquea los números que usan bots para mandar cientos de mensajes de golpe. Haciendo clic uno por uno aquí, es 100% seguro.
              </p>
            </div>
          </div>

          {/* EJECUCIÓN MODO RÁFAGA */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            
            <div className="bg-gray-50 w-full rounded-xl p-4 mb-6 border border-gray-100">
              <h4 className="font-black text-gray-800 flex justify-center items-center gap-2 mb-1">
                <Users size={18} className="text-indigo-500"/>
                {targetLeads.length} Clientes en lista
              </h4>
              <p className="text-xs text-gray-500">Módulo: {activeModule}</p>
            </div>

            {targetLeads.length === 0 ? (
              <p className="text-sm font-bold text-gray-400 py-10">No hay prospectos en esta etapa.</p>
            ) : currentIndex >= targetLeads.length ? (
              <div className="py-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                  <Send size={32} />
                </div>
                <h4 className="text-lg font-black text-gray-800">¡Campaña Terminada!</h4>
                <p className="text-sm text-gray-500 mb-4">Has contactado a los {targetLeads.length} leads.</p>
                <button onClick={resetCampaign} className="text-xs font-bold text-green-600 underline">Volver a empezar</button>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex justify-between items-center mb-2 text-xs font-bold text-gray-500 uppercase px-2">
                  <span>Progreso</span>
                  <span>{currentIndex + 1} de {targetLeads.length}</span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex) / targetLeads.length) * 100}%` }}></div>
                </div>

                <div className="mb-6 p-4 border-2 border-green-100 bg-green-50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Siguiente en la lista:</p>
                  <p className="font-black text-lg text-gray-800">{targetLeads[currentIndex].name}</p>
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1"><MessageCircle size={14}/> {targetLeads[currentIndex].phone}</p>
                </div>

                <button 
                  onClick={handleSendNext}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-green-700 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 group"
                >
                  <Play className="group-hover:translate-x-1 transition-transform"/>
                  Abrir WhatsApp y Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}