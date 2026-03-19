import React, { useState } from 'react';
import { 
  X, Send, AlarmClock, Trash2, Edit3, Grid, 
  MessageCircle, Calculator, User, Phone, Mail, History, Save, Fingerprint, Calendar, Bot, ArrowLeft, ClipboardPaste, AlertCircle
} from 'lucide-react';
import { importLeadsBatchService } from '../../services/leads';
import type { Lead } from '../../types/definitions'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'EDIT' | 'VIEW';
  setMode: (mode: 'EDIT' | 'VIEW') => void;
  formData: Partial<Lead>;
  setFormData: (data: Partial<Lead>) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  activeModule: 'LOTE' | 'DEPA';
  activeTab: 'CLIENTE' | 'PROPIEDAD' | 'HISTORIAL';
  setActiveTab: (tab: 'CLIENTE' | 'PROPIEDAD' | 'HISTORIAL') => void;
  onOpenUnitSelector: () => void;
  newInteractionNote: string;
  setNewInteractionNote: (s: string) => void;
  newInteractionType: string;
  setNewInteractionType: (s: string) => void;
  onAddInteraction: () => void;
  tempTimeString: string;
  setTempTimeString: (s: string) => void;
  updateDatePart: (s: string) => void;
  updateTimePart: (s: string) => void;
  getDateValue: () => string;
  formatDate: (s: string) => string;
  onOpenWhatsApp: () => void;
  onOpenProforma: () => void;
}

export default function LeadModal({ 
  isOpen, onClose, mode, setMode, formData, setFormData, onSave, onDelete, 
  activeModule, activeTab, setActiveTab, onOpenUnitSelector, 
  newInteractionNote, setNewInteractionNote, newInteractionType, setNewInteractionType, 
  onAddInteraction, tempTimeString, setTempTimeString, updateDatePart, updateTimePart, 
  getDateValue, formatDate, onOpenWhatsApp, onOpenProforma 
}: Props) {
  
  const [showStrategyScreen, setShowStrategyScreen] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // --- LÓGICA DE PEGADO RÁPIDO ---
  const handleProcessPaste = async () => {
    if (!pasteText.trim()) return;
    setIsImporting(true);
    try {
      const rows = pasteText.split('\n').filter(r => r.trim() !== '');
      const leads = rows.map(row => {
        const cols = row.split('\t');
        return {
          name: cols[1]?.trim() || 'Sin Nombre',
          phone: cols[2]?.trim() || '',
          source: cols[3]?.trim() || 'Pegado desde Excel',
          statusLote: 'Nuevo',
          statusDepa: 'Nuevo',
          interestLevel: 'Medio' as const,
          contactDate: new Date().toISOString()
        };
      }).filter(l => l.phone !== '');

      if (leads.length > 0) {
        await importLeadsBatchService(leads, activeModule);
        alert(`Éxito: Se importaron ${leads.length} prospectos.`);
        onClose();
      }
    } catch (err) {
      alert("Error al procesar el pegado masivo.");
    } finally {
      setIsImporting(false);
      setShowPasteArea(false);
      setPasteText('');
    }
  };

  const STAGES = activeModule === 'LOTE' 
    ? ['Nuevo', 'Contactado', 'No Contesta', 'Visita Proyecto', 'Separación', 'Vendido', 'No Interesado']
    : ['Nuevo', 'Contactado', 'No Contesta', 'Visita Piloto', 'Separación', 'Vendido', 'No Interesado'];

  const SOURCES = ['Facebook Formularios', 'TikTok Formularios', 'Base de Datos', 'Orgánicos', 'Feria', 'Referidos'];

  const getDisplayDate = () => {
      if (formData.contactDate) {
          try { return new Date(formData.contactDate).toISOString().split('T')[0]; } catch {}
          return formData.contactDate; 
      }
      if (formData.createdAt && typeof formData.createdAt === 'object' && 'seconds' in formData.createdAt) {
          return new Date(formData.createdAt.seconds * 1000).toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-gray-200 relative">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md z-10">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {showPasteArea ? 'Pegado Rápido' : showStrategyScreen ? 'Estrategia IA' : (mode === 'EDIT' ? (formData.id ? '✏️ Editar Lead' : '✨ Nuevo Cliente') : formData.name)}
          </h3>
          <div className="flex gap-2">
             {!formData.id && mode === 'EDIT' && !showStrategyScreen && (
                <button onClick={() => setShowPasteArea(!showPasteArea)} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-indigo-200 transition-all">
                    <ClipboardPaste size={16}/> {showPasteArea ? 'Volver' : 'Pegar Excel'}
                </button>
             )}
             {!showPasteArea && (
                <button onClick={() => setShowStrategyScreen(!showStrategyScreen)} className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold text-xs transition-all ${showStrategyScreen ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                    {showStrategyScreen ? <><ArrowLeft size={16}/> Volver</> : <><Bot size={18}/> Estrategia</>}
                </button>
             )}
             {mode === 'VIEW' && (
                 <div className="flex gap-2">
                    <button onClick={() => setMode('EDIT')} className="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-100"><Edit3 size={18}/></button>
                    <button onClick={() => onDelete(formData.id!)} className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100"><Trash2 size={18}/></button>
                 </div>
             )}
             <button onClick={onClose} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {showPasteArea ? (
            /* --- PESTAÑA PEGADO RÁPIDO --- */
            <div className="p-6 h-full flex flex-col gap-4 animate-in fade-in">
               <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-800 text-xs flex items-start gap-3 shadow-sm">
                  <AlertCircle size={20} className="shrink-0"/>
                  <p>Selecciona tus filas en Excel, cópialas y pégalas aquí. Se guardarán automáticamente con estado 'Nuevo'.</p>
               </div>
               <textarea className="flex-1 w-full p-4 border-2 border-dashed border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-xs" placeholder="Pega aquí los datos de Excel..." value={pasteText} onChange={e => setPasteText(e.target.value)} />
               <button onClick={handleProcessPaste} disabled={isImporting || !pasteText} className="bg-indigo-600 text-white w-full py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-indigo-700 transition-all">
                  {isImporting ? 'Importando...' : 'Procesar e Importar Todos'}
               </button>
            </div>
          ) : showStrategyScreen ? (
            /* --- PESTAÑA ESTRATEGIA IA --- */
            <div className="p-6 h-full flex flex-col animate-in fade-in">
                <textarea className="flex-1 w-full border-2 border-amber-200 rounded-xl p-4 outline-none text-gray-700 leading-relaxed" placeholder="Escribe aquí los pasos a seguir..." value={formData.aiStrategy || ''} onChange={e => setFormData({...formData, aiStrategy: e.target.value})} />
                <button onClick={(e) => { onSave(e); setShowStrategyScreen(false); }} className="mt-4 bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-amber-600 transition-all"><Save size={20}/> Guardar Estrategia</button>
            </div>
          ) : mode === 'VIEW' ? (
            /* --- MODO VISTA --- */
            <div className="p-6 space-y-6 animate-in fade-in">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-black text-gray-800">{formData.name}</h2>
                    {formData.dni && <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Fingerprint size={12}/> DNI: {formData.dni}</p>}
                    <p className="text-indigo-600 font-bold flex items-center gap-2 mt-2"><Phone size={16}/> {formData.phone}</p>
                    <p className="text-gray-500 text-sm flex items-center gap-2"><Mail size={16}/> {formData.email || 'Sin email'}</p>
                    <div className="mt-4 flex gap-2">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-200">
                            {activeModule === 'LOTE' ? formData.statusLote : formData.statusDepa}
                        </span>
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{formData.source}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onOpenProforma} className="bg-white border-2 border-indigo-50 p-4 rounded-xl flex flex-col items-center gap-2 text-indigo-600 font-bold hover:border-indigo-500 transition-all shadow-sm"><Calculator size={24}/> Cotizar</button>
                    <button onClick={onOpenWhatsApp} className="bg-white border-2 border-green-50 p-4 rounded-xl flex flex-col items-center gap-2 text-green-600 font-bold hover:border-green-500 transition-all shadow-sm"><MessageCircle size={24}/> WhatsApp</button>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><History size={14}/> Historial de Bitácora</h4>
                    <div className="pl-4 border-l-2 border-slate-100 space-y-6">
                        {formData.interactions?.map(i => (
                            <div key={i.id} className="relative">
                                <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-indigo-400 rounded-full ring-4 ring-white"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{i.type}</span>
                                    <span className="text-[10px] text-gray-400">{formatDate(i.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">{i.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          ) : (
            /* --- MODO EDICIÓN --- */
            <form onSubmit={onSave} className="flex flex-col h-full bg-slate-50 animate-in fade-in">
                <div className="flex bg-white border-b px-6 pt-2 gap-6">
                    <button type="button" onClick={() => setActiveTab('CLIENTE')} className={`pb-3 text-xs font-black border-b-2 transition-colors ${activeTab === 'CLIENTE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>CLIENTE</button>
                    <button type="button" onClick={() => setActiveTab('PROPIEDAD')} className={`pb-3 text-xs font-black border-b-2 transition-colors ${activeTab === 'PROPIEDAD' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>PROPIEDAD</button>
                    <button type="button" onClick={() => setActiveTab('HISTORIAL')} className={`pb-3 text-xs font-black border-b-2 transition-colors ${activeTab === 'HISTORIAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>BITÁCORA</button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-5">
                    {activeTab === 'CLIENTE' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase">Nombre Completo</label><input required className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">DNI</label><input className="w-full border rounded-xl p-3 text-sm outline-none" value={formData.dni || ''} onChange={e => setFormData({...formData, dni: e.target.value})}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</label><input required className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})}/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Email</label><input className="w-full border rounded-xl p-3 text-sm outline-none" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Estado</label>
                                    <select className="w-full border rounded-xl p-3 text-sm font-bold text-indigo-700 outline-none" value={activeModule === 'LOTE' ? formData.statusLote : formData.statusDepa} onChange={e => activeModule === 'LOTE' ? setFormData({...formData, statusLote: e.target.value}) : setFormData({...formData, statusDepa: e.target.value})}>
                                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Fuente</label>
                                    <select className="w-full border rounded-xl p-3 text-sm outline-none" value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value})}>
                                        <option value="">Seleccionar...</option>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Fecha de Ingreso</label><input type="date" className="w-full border rounded-xl p-3 text-sm font-bold" value={getDisplayDate()} onChange={e => setFormData({...formData, contactDate: new Date(e.target.value).toISOString()})}/></div>
                        </div>
                    )}

                    {activeTab === 'PROPIEDAD' && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold text-indigo-900 mb-3 uppercase">Detalles de Inversión</label>
                            <button type="button" onClick={onOpenUnitSelector} className="w-full bg-indigo-50 border border-indigo-100 text-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-100 flex items-center justify-center gap-2 mb-4 transition-colors">
                                <Grid size={18}/> {formData.loteType ? 'Cambiar Unidad' : 'Seleccionar del Plano'}
                            </button>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Unidad</label><input className="w-full border rounded-lg p-2 text-sm font-bold text-gray-700" value={formData.loteType || ''} onChange={e => setFormData({...formData, loteType: e.target.value})}/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Área (m²)</label><input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-gray-700" value={formData.area || ''} onChange={e => setFormData({...formData, area: Number(e.target.value)})}/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Precio</label><input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-gray-700" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})}/></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'HISTORIAL' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Añadir Nueva Nota</label>
                                <div className="flex gap-2">
                                    <select className="border-r pr-2 text-xs font-bold bg-transparent outline-none text-gray-500" value={newInteractionType} onChange={(e) => setNewInteractionType(e.target.value)}><option>Nota</option><option>Llamada</option><option>WhatsApp</option><option>Visita</option></select>
                                    <input className="flex-1 text-sm outline-none" placeholder="¿Qué conversaste hoy?" value={newInteractionNote} onChange={e => setNewInteractionNote(e.target.value)}/>
                                    <button type="button" onClick={onAddInteraction} className="text-indigo-600 hover:scale-110 transition-transform"><Send size={18}/></button>
                                </div>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1"><AlarmClock size={14}/> Próximo Recordatorio</h4>
                                    {formData.nextFollowUpDate && (<button type="button" onClick={() => setFormData({...formData, nextFollowUpDate: null, nextFollowUpNote: ''})} className="text-[10px] text-red-500 hover:text-red-700 font-bold bg-white px-2 py-0.5 rounded border border-red-100">Eliminar</button>)}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input type="date" className="flex-1 border rounded-lg p-2 text-sm bg-white" value={getDateValue()} onChange={(e) => updateDatePart(e.target.value)}/>
                                    <input type="text" placeholder="HH:MM" className="w-20 border rounded-lg p-2 text-sm bg-white text-center" value={tempTimeString} onChange={(e) => { const val = e.target.value; setTempTimeString(val); if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) { updateTimePart(val); }}} />
                                </div>
                                <input type="text" className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="¿Por qué motivo llamarás?" value={formData.nextFollowUpNote || ''} onChange={(e) => setFormData({...formData, nextFollowUpNote: e.target.value})}/>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={() => setMode('VIEW')} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Save size={18}/> Guardar Cambios</button>
                </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}