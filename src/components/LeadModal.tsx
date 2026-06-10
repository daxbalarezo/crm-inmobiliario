// src/components/LeadModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, User } from 'lucide-react';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const SOURCES = [
  'Facebook Formularios', 'TikTok Formularios',
  'Base de Datos', 'Orgánicos', 'Feria', 'Referidos',
];

export default function LeadModal({ isOpen, onClose, lead, onSave, onDelete }: Props) {
  const { tenantId, activeProjectId, userProfile, tenant } = useCRM();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (lead) {
      setFormData(lead);
    } else {
      setFormData({
        status: tenant?.stages?.[0] || 'PROSPECTO', // Fallback dinámico al 1er stage
        interestLevel: 'Medio',
        tenantId: tenantId ?? '',
        projectId: activeProjectId ?? '',
        assignedTo: userProfile?.uid ?? '',
        contactDate: new Date().toISOString(),
      });
    }
  }, [isOpen, lead, tenantId, activeProjectId, userProfile, tenant]);

  if (!isOpen) return null;

  const dynamicSources = tenant?.sources || SOURCES;
  const dynamicStages = tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO', 'CERRADO'];

  const isEditing = !!lead?.id;
  const update = (patch: Partial<Lead>) => setFormData(p => ({ ...p, ...patch }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { 
      await onSave(formData); 
      onClose(); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSaving(false); 
    }
  };

  const hasName = formData.name && formData.name.trim().length > 0;
  const initials = hasName ? formData.name!.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : '';

  return (
    <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── HEADER ── */}
        <div className="bg-[#0B2B40] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4DB6AC] flex items-center justify-center text-[#0B2B40] font-black text-base shrink-0">
                {hasName ? initials : <User size={20} strokeWidth={2.5} />}
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">
                  {isEditing ? (formData.name || 'Prospecto') : 'Nuevo Prospecto'}
                </h3>
                {isEditing && formData.phone && (
                  <p className="text-[#4DB6AC] text-xs font-medium mt-0.5">{formData.phone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && onDelete && formData.id && (
                <button
                  type="button"
                  onClick={() => { if(window.confirm('¿Eliminar prospecto?')) { onDelete(formData.id!); onClose(); } }}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-all"
                >
                  <Trash2 size={16}/>
                </button>
              )}
              <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <X size={18}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENIDO ── */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            
            {/* Nombre */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Nombre Completo *
              </label>
              <input
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] focus:border-transparent outline-none transition-all"
                placeholder="Ej: Juan Pérez García"
                value={formData.name ?? ''}
                onChange={e => update({ name: e.target.value })}
              />
            </div>

            {/* Teléfono + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Teléfono *
                </label>
                <input
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] outline-none transition-all"
                  placeholder="999 999 999"
                  value={formData.phone ?? ''}
                  onChange={e => update({ phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] outline-none transition-all"
                  placeholder="correo@email.com"
                  value={formData.email ?? ''}
                  onChange={e => update({ email: e.target.value })}
                />
              </div>
            </div>

            {/* Etapa */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Etapa del Prospecto
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] outline-none transition-all"
                value={formData.status ?? (dynamicStages[0] || 'PROSPECTO')}
                onChange={e => update({ status: e.target.value })}
              >
                {dynamicStages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Interés + Fuente */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Nivel de Interés
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] outline-none transition-all"
                  value={formData.interestLevel ?? 'Medio'}
                  onChange={e => update({ interestLevel: e.target.value as any })}
                >
                  <option value="Alto">Alto</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Fuente
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#0B2B40] bg-white focus:ring-2 focus:ring-[#4DB6AC] outline-none transition-all"
                  value={formData.source ?? ''}
                  onChange={e => update({ source: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

          </div>

          {/* ── FOOTER ── */}
          <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0B2B40] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#154260] disabled:opacity-50 transition-all text-sm shadow-md"
            >
              <Save size={16}/>
              {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar Prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}