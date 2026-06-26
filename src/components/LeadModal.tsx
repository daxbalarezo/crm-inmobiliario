// src/components/LeadModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, User } from 'lucide-react';
import type { Lead, CustomFieldDefinition } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import { useTenantSchema } from '../hooks/useTenantSchema';
import LeadFinanceTab from './LeadFinanceTab';
import LeadTimeline from './LeadTimeline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  agents?: {id: string, name: string}[];
}

const SOURCES = [
  'Facebook Formularios', 'TikTok Formularios',
  'Base de Datos', 'Orgánicos', 'Feria', 'Referidos',
];

export default function LeadModal({ isOpen, onClose, lead, onSave, onDelete, agents }: Props) {
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
        status: tenant?.pipeline_stages?.[0]?.name || tenant?.stages?.[0] || 'PROSPECTO', // Fallback dinámico al 1er stage
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
  const dynamicStages = tenant?.pipeline_stages?.map(s => s.name) || tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO'];

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
    <>
      <section role="dialog" tabIndex={-1} aria-modal="true" className="slds-modal slds-fade-in-open slds-modal_large">
        <div className="slds-modal__container" style={{ width: '80%', maxWidth: '900px' }}>
          
          {/* HEADER SLDS */}
          <header className="slds-modal__header">
            <button 
              className="slds-button slds-button_icon slds-modal__close" 
              title="Cerrar"
              onClick={onClose}
            >
              <X size={24} />
              <span className="slds-assistive-text">Cerrar</span>
            </button>
            <h2 className="slds-text-heading_medium slds-hyphenate">
              {isEditing ? (formData.name || 'Prospecto') : 'Nuevo Prospecto'}
            </h2>
            {isEditing && formData.phone && (
              <p className="slds-m-top_x-small slds-text-color_weak">{formData.phone}</p>
            )}

            {isEditing && (
              <div className="slds-tabs_default slds-m-top_medium">
                <ul className="slds-tabs_default__nav" role="tablist">
                  <li className={`slds-tabs_default__item ${activeTab === 'info' ? 'slds-is-active' : ''}`} title="Información" role="presentation">
                    <a className="slds-tabs_default__link" href="#" role="tab" onClick={(e) => { e.preventDefault(); setActiveTab('info'); }}>
                      Información
                    </a>
                  </li>
                  {userPermissions?.finance?.read !== 'none' && (
                    <li className={`slds-tabs_default__item ${activeTab === 'finance' ? 'slds-is-active' : ''}`} title="Finanzas y Separación" role="presentation">
                      <a className="slds-tabs_default__link" href="#" role="tab" onClick={(e) => { e.preventDefault(); setActiveTab('finance'); }}>
                        Finanzas y Separación
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </header>

          {/* CONTENIDO SLDS */}
          <div className="slds-modal__content slds-p-around_medium" style={{ backgroundColor: '#f4f6f9' }}>
            {activeTab === 'info' ? (
              <form id="lead-form" onSubmit={handleSave}>
                <div className="slds-box slds-theme_default slds-m-bottom_medium">
                  
                  {/* Fila 1 */}
                  <div className="slds-grid slds-gutters slds-m-bottom_small">
                    <div className="slds-col slds-size_1-of-1">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">
                          <abbr className="slds-required" title="required">* </abbr>Nombre Completo
                        </label>
                        <div className="slds-form-element__control">
                          <input
                            required
                            type="text"
                            className="slds-input"
                            placeholder="Ej: Juan Pérez García"
                            value={formData.name ?? ''}
                            onChange={e => update({ name: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2 */}
                  <div className="slds-grid slds-gutters slds-m-bottom_small">
                    <div className="slds-col slds-size_1-of-2">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">
                          <abbr className="slds-required" title="required">* </abbr>Teléfono
                        </label>
                        <div className="slds-form-element__control">
                          <input
                            required
                            type="text"
                            className="slds-input"
                            placeholder="999 999 999"
                            value={formData.phone ?? ''}
                            onChange={e => update({ phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="slds-col slds-size_1-of-2">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">Email</label>
                        <div className="slds-form-element__control">
                          <input
                            type="email"
                            className="slds-input"
                            placeholder="correo@email.com"
                            value={formData.email ?? ''}
                            onChange={e => update({ email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 3 */}
                  <div className="slds-grid slds-gutters slds-m-bottom_small">
                    <div className="slds-col slds-size_1-of-1">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">Etapa del Prospecto</label>
                        <div className="slds-form-element__control">
                          <div className="slds-select_container">
                            <select
                              className="slds-select"
                              value={formData.status ?? (dynamicStages[0] || 'PROSPECTO')}
                              onChange={e => update({ status: e.target.value })}
                            >
                              {dynamicStages.map(s => <option key={s} value={s}>{s}</option>)}
                              {!dynamicStages.includes('PERDIDO') && <option value="PERDIDO">PERDIDO</option>}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motivo de pérdida */}
                  {formData.status === 'PERDIDO' && (
                    <div className="slds-grid slds-gutters slds-m-bottom_small">
                      <div className="slds-col slds-size_1-of-1">
                        <div className="slds-form-element slds-has-error">
                          <label className="slds-form-element__label">
                            <abbr className="slds-required" title="required">* </abbr>Motivo de Pérdida
                          </label>
                          <div className="slds-form-element__control">
                            <div className="slds-select_container">
                              <select
                                required
                                className="slds-select"
                                value={formData.lossReason ?? ''}
                                onChange={e => update({ lossReason: e.target.value })}
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
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fila 4 */}
                  <div className="slds-grid slds-gutters slds-m-bottom_small">
                    <div className="slds-col slds-size_1-of-2">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">Nivel de Interés</label>
                        <div className="slds-form-element__control">
                          <div className="slds-select_container">
                            <select
                              className="slds-select"
                              value={formData.interestLevel ?? 'Medio'}
                              onChange={e => update({ interestLevel: e.target.value as any })}
                            >
                              <option value="Alto">Alto</option>
                              <option value="Medio">Medio</option>
                              <option value="Bajo">Bajo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="slds-col slds-size_1-of-2">
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">Fuente</label>
                        <div className="slds-form-element__control">
                          <div className="slds-select_container">
                            <select
                              className="slds-select"
                              value={formData.source ?? ''}
                              onChange={e => update({ source: e.target.value })}
                            >
                              <option value="">Seleccionar...</option>
                              {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila Asignación (Visible para Managers/Owners) */}
                  {agents && agents.length > 0 && (userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                    <div className="slds-grid slds-gutters slds-m-bottom_small">
                      <div className="slds-col slds-size_1-of-1">
                        <div className="slds-form-element">
                          <label className="slds-form-element__label">
                            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Asignado A
                          </label>
                          <div className="slds-form-element__control">
                            <div className="slds-select_container">
                              <select
                                className="slds-select"
                                value={formData.assignedTo ?? ''}
                                onChange={e => update({ assignedTo: e.target.value })}
                              >
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campos Personalizados (Dinámicos) */}
                {fields.length > 0 && (
                  <div className="slds-box slds-theme_default slds-m-bottom_medium">
                    <h3 className="slds-text-heading_small slds-m-bottom_medium">Información Adicional</h3>
                    <div className="slds-grid slds-wrap slds-gutters">
                      {fields.map(field => (
                        <div key={field.id} className={`slds-col slds-m-bottom_small ${field.type === 'string' ? 'slds-size_1-of-1' : 'slds-size_1-of-2'}`}>
                          <div className="slds-form-element">
                            <label className="slds-form-element__label">
                              {field.required && <abbr className="slds-required" title="required">* </abbr>}
                              {field.label}
                            </label>
                            <div className="slds-form-element__control">
                              {field.type === 'select' ? (
                                <div className="slds-select_container">
                                  <select
                                    required={field.required}
                                    className="slds-select"
                                    value={formData.customData?.[field.id] || ''}
                                    onChange={e => updateCustom(field.id, e.target.value)}
                                  >
                                    <option value="">Seleccionar...</option>
                                    {field.options?.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : field.type === 'boolean' ? (
                                <div className="slds-checkbox">
                                  <input
                                    type="checkbox"
                                    id={`checkbox-${field.id}`}
                                    required={field.required}
                                    checked={!!formData.customData?.[field.id]}
                                    onChange={e => updateCustom(field.id, e.target.checked)}
                                  />
                                  <label className="slds-checkbox__label" htmlFor={`checkbox-${field.id}`}>
                                    <span className="slds-checkbox_faux"></span>
                                    <span className="slds-form-element__label">Sí / No</span>
                                  </label>
                                </div>
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  required={field.required}
                                  className="slds-input"
                                  placeholder={`Ingresar ${field.label.toLowerCase()}`}
                                  value={formData.customData?.[field.id] || ''}
                                  onChange={e => updateCustom(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isEditing && lead && (
                  <div className="slds-box slds-theme_default">
                    <h3 className="slds-text-heading_small slds-m-bottom_medium">Línea de Tiempo</h3>
                    <LeadTimeline lead={lead as Lead} />
                  </div>
                )}
              </form>
            ) : (
              <LeadFinanceTab lead={lead as Lead} />
            )}
          </div>

          {/* FOOTER SLDS */}
          <footer className="slds-modal__footer slds-grid slds-grid_align-spread">
            <div>
              {isEditing && onDelete && formData.id && userPermissions?.leads?.delete && (
                <button
                  type="button"
                  onClick={() => { if(window.confirm('¿Eliminar prospecto?')) { onDelete(formData.id!); onClose(); } }}
                  className="slds-button slds-button_destructive"
                >
                  <Trash2 size={16} className="slds-button__icon slds-button__icon_left" />
                  Eliminar Prospecto
                </button>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={onClose}
                className="slds-button slds-button_neutral"
              >
                Cancelar
              </button>
              {((!isEditing && userPermissions.leads.create) || (isEditing && userPermissions.leads.update)) && activeTab === 'info' && (
                <button
                  type="submit"
                  form="lead-form"
                  disabled={saving}
                  className="slds-button slds-button_brand"
                >
                  <Save size={16} className="slds-button__icon slds-button__icon_left" />
                  {saving ? 'Guardando...' : isEditing ? 'Actualizar Prospecto' : 'Guardar Prospecto'}
                </button>
              )}
            </div>
          </footer>
        </div>
      </section>
      <div className="slds-backdrop slds-backdrop_open" role="presentation"></div>
    </>
  );
}