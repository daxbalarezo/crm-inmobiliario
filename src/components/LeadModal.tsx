// src/components/LeadModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, User } from 'lucide-react';
import type { Lead, CustomFieldDefinition } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import { useTenantSchema } from '../hooks/useTenantSchema';
import LeadFinanceTab from './LeadFinanceTab';
import LeadTimeline from './LeadTimeline';
import styles from './LeadModal.module.css';

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
  const { tenantId, activeProjectId, userProfile, tenant, userPermissions } = useCRM();
  const { fields } = useTenantSchema('lead');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'finance'>('info');

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
  const updateCustom = (id: string, value: any) => {
    setFormData(p => ({
      ...p,
      customData: { ...(p.customData || {}), [id]: value }
    }));
  };

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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* ── HEADER ── */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>
                {hasName ? initials : <User size={20} strokeWidth={2.5} />}
              </div>
              <div>
                <h3 className={styles.title}>
                  {isEditing ? (formData.name || 'Prospecto') : 'Nuevo Prospecto'}
                </h3>
                {isEditing && formData.phone && (
                  <p className={styles.subtitle}>{formData.phone}</p>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
              {isEditing && onDelete && formData.id && userPermissions?.leads?.delete && (
                <button
                  type="button"
                  onClick={() => { if(window.confirm('¿Eliminar prospecto?')) { onDelete(formData.id!); onClose(); } }}
                  className={`${styles.btnAction} ${styles.btnDelete}`}
                >
                  <Trash2 size={16}/>
                </button>
              )}
              <button type="button" onClick={onClose} className={`${styles.btnAction} ${styles.btnClose}`}>
                <X size={18}/>
              </button>
            </div>
          </div>
          
          {isEditing && (
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginTop: '16px' }}>
              <button 
                type="button"
                onClick={() => setActiveTab('info')}
                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'info' ? '2px solid var(--primary-color)' : '2px solid transparent', padding: '8px 4px', fontWeight: activeTab === 'info' ? 600 : 400, color: activeTab === 'info' ? 'var(--primary-color)' : '#64748b', cursor: 'pointer' }}
              >
                Información
              </button>
              {userPermissions?.finance?.read !== 'none' && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('finance')}
                  style={{ background: 'none', border: 'none', borderBottom: activeTab === 'finance' ? '2px solid var(--primary-color)' : '2px solid transparent', padding: '8px 4px', fontWeight: activeTab === 'finance' ? 600 : 400, color: activeTab === 'finance' ? 'var(--primary-color)' : '#64748b', cursor: 'pointer' }}
                >
                  Finanzas y Separación
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── CONTENIDO ── */}
        {activeTab === 'info' ? (
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formBody}>
            
            {/* Nombre */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nombre Completo *
              </label>
              <input
                required
                className={styles.input}
                placeholder="Ej: Juan Pérez García"
                value={formData.name ?? ''}
                onChange={e => update({ name: e.target.value })}
              />
            </div>

            {/* Teléfono + Email */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Teléfono *
                </label>
                <input
                  required
                  className={styles.input}
                  placeholder="999 999 999"
                  value={formData.phone ?? ''}
                  onChange={e => update({ phone: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Email
                </label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="correo@email.com"
                  value={formData.email ?? ''}
                  onChange={e => update({ email: e.target.value })}
                />
              </div>
            </div>

            {/* Etapa */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Etapa del Prospecto
              </label>
              <select
                className={styles.select}
                value={formData.status ?? (dynamicStages[0] || 'PROSPECTO')}
                onChange={e => update({ status: e.target.value })}
              >
                {dynamicStages.map(s => <option key={s} value={s}>{s}</option>)}
                {!dynamicStages.includes('PERDIDO') && <option value="PERDIDO">PERDIDO</option>}
              </select>
            </div>

            {/* Motivo de Pérdida (Condicional) */}
            {formData.status === 'PERDIDO' && (
              <div className={styles.formGroup} style={{ marginTop: 12 }}>
                <label className={styles.label} style={{ color: '#ef4444' }}>
                  Motivo de Pérdida *
                </label>
                <select
                  required
                  className={styles.select}
                  value={formData.lossReason ?? ''}
                  onChange={e => update({ lossReason: e.target.value })}
                  style={{ borderColor: '#ef4444' }}
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="Precio/Presupuesto">Precio/Presupuesto insuficiente</option>
                  <option value="Competencia">Compró a la competencia</option>
                  <option value="Crédito Rechazado">Crédito hipotecario rechazado</option>
                  <option value="Incontactable">No contesta / Incontactable</option>
                  <option value="Proyecto no encaja">El proyecto no encaja con lo que busca</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>
            )}

            {/* Interés + Fuente */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Nivel de Interés
                </label>
                <select
                  className={styles.select}
                  value={formData.interestLevel ?? 'Medio'}
                  onChange={e => update({ interestLevel: e.target.value as any })}
                >
                  <option value="Alto">Alto</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Fuente
                </label>
                <select
                  className={styles.select}
                  value={formData.source ?? ''}
                  onChange={e => update({ source: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Campos Personalizados (Dinámicos) */}
            {fields.length > 0 && (
              <>
                <hr className={styles.divider} />
                <h4 className={styles.sectionTitle}>
                  Información Adicional
                </h4>
                <div className={styles.formRow}>
                  {fields.map(field => (
                    <div key={field.id} className={field.type === 'string' ? "" : ""} style={{ gridColumn: field.type === 'string' ? '1 / -1' : 'auto' }}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          {field.label} {field.required && '*'}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            required={field.required}
                            className={styles.select}
                          value={formData.customData?.[field.id] || ''}
                          onChange={e => updateCustom(field.id, e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <div className={styles.checkboxWrapper}>
                          <input
                            type="checkbox"
                            required={field.required}
                            className={styles.checkbox}
                            checked={!!formData.customData?.[field.id]}
                            onChange={e => updateCustom(field.id, e.target.checked)}
                          />
                          <span className={styles.checkboxLabel}>Sí / No</span>
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          className={styles.input}
                          placeholder={`Ingresar ${field.label.toLowerCase()}`}
                          value={formData.customData?.[field.id] || ''}
                          onChange={e => updateCustom(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        />
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>

          {isEditing && lead && (
            <div style={{ padding: '0 24px' }}>
              <LeadTimeline lead={lead as Lead} />
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.btnCancel}
            >
              Cancelar
            </button>
            {((!isEditing && userPermissions.leads.create) || (isEditing && userPermissions.leads.update)) && (
              <button
                type="submit"
                disabled={saving}
                className={styles.btnSave}
              >
                <Save size={16}/>
                {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar Prospecto'}
              </button>
            )}
          </div>
        </form>
        ) : (
          <LeadFinanceTab lead={lead as Lead} />
        )}
      </div>
    </div>
  );
}