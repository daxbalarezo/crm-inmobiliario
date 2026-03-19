import React from 'react';
import { X, Box, Grid, Trash2, AlertTriangle, Upload, Lock, Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { Unit } from '../../types/definitions'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeModule: 'LOTE' | 'DEPA';
  inventory: Unit[];
  onImport: (text: string) => void;
  onDeleteAll: () => void;
  onDeleteUnit: (id: string) => void;
  // Actualizamos la firma para aceptar un segundo parámetro opcional
  onToggleStatus: (unit: Unit, specificStatus?: string) => void;
}

export default function InventoryModal({ isOpen, onClose, activeModule, inventory, onImport, onDeleteAll, onDeleteUnit, onToggleStatus }: Props) {
  if (!isOpen) return null;

  const groupedInventory = Object.entries(inventory.filter(u => u.type === activeModule).reduce((acc, unit) => {
    (acc[unit.group] = acc[unit.group] || []).push(unit);
    return acc;
  }, {} as Record<string, Unit[]>)).sort();

  // Estados que se quedan FIJOS (No se pueden cambiar con clic simple para evitar errores)
  const LOCKED_STATUSES = ['PARQUE', 'EDUCACION', 'OTROS'];

  const getCardStyle = (status: string) => {
      switch(status) {
          case 'DISPONIBLE': return 'bg-emerald-50 border-emerald-200';
          case 'SEPARADO': return 'bg-orange-50 border-orange-200';
          case 'VENDIDO': return 'bg-red-50 border-red-200 opacity-70';
          case 'PROMO': return 'bg-purple-50 border-purple-300 ring-2 ring-purple-100'; 
          case 'BLOQUEADO': return 'bg-gray-800 border-gray-600 text-gray-300';
          case 'PARQUE': return 'bg-[#e6f4ea] border-[#a8dab5]';
          case 'EDUCACION': return 'bg-yellow-50 border-yellow-200';
          case 'OTROS': return 'bg-slate-200 border-slate-300 opacity-60 grayscale';
          default: return 'bg-white border-gray-200';
      }
  };

  const getBadgeStyle = (status: string) => {
      switch(status) {
          case 'DISPONIBLE': return 'bg-emerald-200 text-emerald-800';
          case 'SEPARADO': return 'bg-orange-200 text-orange-800';
          case 'VENDIDO': return 'bg-red-200 text-red-800';
          case 'PROMO': return 'bg-purple-600 text-white shadow-sm';
          case 'BLOQUEADO': return 'bg-gray-700 text-white';
          case 'PARQUE': return 'bg-[#ceead6] text-[#137333]';
          case 'EDUCACION': return 'bg-yellow-200 text-yellow-800';
          case 'OTROS': return 'bg-slate-300 text-slate-700';
          default: return 'bg-gray-200 text-gray-800';
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl p-4 flex justify-between items-center max-w-7xl mx-auto w-full shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800"><Grid className="text-indigo-600"/> Stock: {activeModule}</h3>
        <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X/></button>
      </div>
      <div className="flex-1 bg-slate-100 overflow-y-auto p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-blue-900 flex items-center gap-2"><Upload size={18}/> Cargar Excel (Pegar Texto)</h4>
                <button onClick={onDeleteAll} className="text-red-600 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100"><AlertTriangle size={14}/> Borrar Todo</button>
             </div>
             <p className="text-xs text-gray-500 mb-2">Columnas requeridas: <strong>MZN | LOTE | AREA | DESCRIPCIÓN | PRECIO LISTA | ... | PRECIO CONTADO | ESTADO</strong></p>
             <textarea id="invInput" className="w-full h-24 border border-gray-200 rounded-xl p-3 text-xs font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Pega aquí las celdas..."></textarea>
             <button onClick={() => onImport((document.getElementById('invInput') as HTMLTextAreaElement).value)} className="mt-3 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all">Procesar Data</button>
          </div>
          {groupedInventory.map(([group, units]) => (
             <div key={group} className="bg-white p-6 rounded-2xl shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><Box size={18} className="text-indigo-500"/> {group}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                   {units.sort((a,b) => a.customId.localeCompare(b.customId, undefined, {numeric: true})).map(u => {
                      const isLocked = LOCKED_STATUSES.includes(u.status);
                      return (
                        <div key={u.id} className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 group ${getCardStyle(u.status)}`}>
                           {u.status === 'PROMO' && (
                               <div className="absolute -top-2 -right-2 bg-purple-600 text-white p-1 rounded-full shadow-md z-10">
                                   <Sparkles size={12} fill="white"/>
                               </div>
                           )}
                           
                           <div className="text-xs font-bold text-gray-400 mb-1">{u.type}</div>
                           <div className="text-lg font-black text-gray-800">{u.customId}</div>
                           {u.description && <div className="text-[9px] text-gray-500 italic truncate mb-1">{u.description}</div>}
                           <div className="text-[10px] text-gray-500 mb-1">{u.area} m²</div>
                           
                           <div className="space-y-0.5 mb-2">
                               <div className={`flex justify-between items-center text-xs font-bold ${u.status === 'BLOQUEADO' ? 'text-gray-400' : 'text-gray-600'}`}>
                                   <span className="text-[9px] font-normal opacity-70">Lista:</span>
                                   <span>S/ {u.price.toLocaleString()}</span>
                               </div>
                               {u.priceCash && u.priceCash > 0 && (
                                   <div className={`flex justify-between items-center text-xs font-bold ${u.status === 'BLOQUEADO' ? 'text-gray-500' : u.status === 'PROMO' ? 'text-purple-700' : 'text-emerald-600'}`}>
                                       <span className="text-[9px] font-normal opacity-70">Contado:</span>
                                       <span>S/ {u.priceCash.toLocaleString()}</span>
                                   </div>
                               )}
                           </div>

                           <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center uppercase ${getBadgeStyle(u.status)}`}>{u.status}</div>
                           
                           {/* --- LÓGICA DE BOTONES INTELIGENTE --- */}
                           <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                              {!isLocked ? (
                                <>
                                  {/* Si está SEPARADO, mostramos opción de Vender o Liberar */}
                                  {u.status === 'SEPARADO' ? (
                                      <div className="flex gap-2 w-full justify-center px-2">
                                          <button onClick={() => onToggleStatus(u)} className="flex-1 bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded hover:bg-emerald-600 flex justify-center items-center gap-1" title="Marcar Vendido">
                                              <CheckCircle2 size={14}/> Vender
                                          </button>
                                          <button onClick={() => onToggleStatus(u, 'DISPONIBLE')} className="flex-1 bg-red-500 text-white text-[10px] font-bold py-1.5 rounded hover:bg-red-600 flex justify-center items-center gap-1" title="Liberar Lote">
                                              <RotateCcw size={14}/> Caída
                                          </button>
                                      </div>
                                  ) : (
                                      /* Botón normal para otros estados */
                                      <button onClick={() => onToggleStatus(u)} className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-lg hover:bg-white/40">Cambiar Estado</button>
                                  )}
                                </>
                              ) : (
                                <div className="flex flex-col items-center text-white/80">
                                    <Lock size={20}/>
                                    <span className="text-[10px] font-bold mt-1">Fijo</span>
                                </div>
                              )}
                              
                              <button onClick={() => onDeleteUnit(u.id)} className="text-red-300 hover:text-red-500 bg-white/10 p-1.5 rounded-full mt-1"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}