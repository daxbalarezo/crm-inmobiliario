import React, { useState, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import { formatPhoneNumber } from '../utils/helpers';
interface KanbanBoardProps {
  leads: Lead[];
  onLeadStatusChange: (leadId: string, newStatus: string, extraData?: Partial<Lead>) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  isAdminMode?: boolean; // God mode flag
  agents?: {id: string, name: string}[];
}

const DEFAULT_PALETTE = ['#0176D3']; // Standard SLDS brand color

const FALLBACK_LEAD_STATUSES = ['NUEVO', 'CONTACTADO', 'DESCARTADO'];

export default function KanbanBoard({ leads, onLeadStatusChange, onLeadClick, isAdminMode, agents }: KanbanBoardProps) {
  const { tenant } = useCRM();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState<{leadId: string, statusId: string} | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [lossNotes, setLossNotes] = useState('');

  const columns = useMemo(() => {
    if (tenant?.lead_statuses && tenant.lead_statuses.length > 0) {
      return tenant.lead_statuses.map((status) => ({
        id: status.name, // Guardamos el nombre en el status del lead
        title: status.name,
        color: status.color || DEFAULT_PALETTE[0]
      }));
    }
    
    // Fallback si la inmobiliaria aún no heredó plantillas
    return FALLBACK_LEAD_STATUSES.map((status, index) => ({
      id: status,
      title: status.replace(/_/g, ' '),
      color: DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
    }));
  }, [tenant?.lead_statuses]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    // Para efecto visual
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necesario para permitir el drop
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      if (statusId === 'DESCARTADO') {
        setDiscardPrompt({ leadId, statusId });
        setLossReason('');
        setLossNotes('');
      } else {
        onLeadStatusChange(leadId, statusId);
      }
    }
    setDraggedLeadId(null);
  };

  const isStalled = (lead: Lead) => {
    if (['VENDIDO', 'VENTA_CERRADA', 'NO_INTERESADO', 'VENTA_CAIDA'].includes(lead.status)) return false;
    
    let lastActivityTime = lead.updatedAt || lead.createdAt;
    if (!lastActivityTime) return false;
    
    const dateObj = lastActivityTime.toDate ? lastActivityTime.toDate() : new Date(lastActivityTime);
    const diffTime = Math.abs(new Date().getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 14;
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: 'calc(100vh - 250px)' }}>
      {columns.map(column => {
        const columnLeads = leads.filter(l => l.status === column.id);

        return (
          <div 
            key={column.id} 
            className="slds-panel slds-size_small"
            style={{ 
              backgroundColor: '#f3f3f3', 
              borderRadius: '0.25rem',
              minWidth: '320px', 
              maxWidth: '320px', 
              display: 'flex', 
              flexDirection: 'column',
              border: '1px solid var(--slds-border)'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="slds-panel__header" style={{ borderTop: `4px solid ${column.color}`, backgroundColor: 'white', borderRadius: '0.25rem 0.25rem 0 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <h2 className="slds-truncate slds-text-title_caps" style={{ fontWeight: 700, color: '#181818', fontSize: '0.8125rem' }} title={column.title}>
                  {column.title}
                </h2>
                <span className="slds-badge slds-theme_shade" style={{ color: '#444', fontSize: '0.75rem' }}>{columnLeads.length}</span>
              </div>
            </div>

            <div className="slds-panel__body slds-scrollable_y" style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {columnLeads.map(lead => (
                <div
                  key={lead.id}
                  className="slds-card slds-card_boundary"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onLeadClick(lead)}
                  style={{ cursor: 'grab', marginBottom: 0, borderLeft: `4px solid ${column.color}` }}
                >
                  <div className="slds-card__body slds-card__body_inner slds-p-around_small">
                    <div className="slds-grid slds-grid_align-spread slds-m-bottom_xx-small">
                      <p className="slds-truncate" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0176D3', textTransform: 'capitalize' }}>
                        {lead.name.toLowerCase()}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isStalled(lead) && (
                          <div title="Oportunidad Estancada: Sin actividad en más de 14 días" style={{ display: 'inline-flex', alignItems: 'center', color: '#ea001e', marginRight: '4px' }}>
                            <AlertTriangle size={14} />
                          </div>
                        )}
                        {lead.interestLevel && (
                          <span className={`slds-badge ${
                            lead.interestLevel === 'Alto' ? 'slds-theme_error' : 
                            lead.interestLevel === 'Medio' ? 'slds-theme_warning' : ''
                          }`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginLeft: '0.25rem' }}>
                            {lead.interestLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {(lead.savedProforma?.finalPrice || 0) > 0 && (
                      <p className="slds-m-bottom_xx-small" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#181818' }}>
                        {formatCurrency(lead.savedProforma!.finalPrice)}
                      </p>
                    )}

                    <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      {formatPhoneNumber(lead.phone) || 'Sin teléfono'}
                    </p>
                    
                    {isAdminMode && lead.assignedTo && (
                      <div className="slds-m-top_x-small slds-border_top slds-p-top_xx-small">
                        <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                          Agente: <span style={{ fontWeight: 400, color: '#181818' }}>{(agents?.find(a => a.id === lead.assignedTo)?.name || lead.assignedTo).toLowerCase()}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>

      {/* Modal de Descarte */}
      {discardPrompt && (
        <>
          <div className="slds-backdrop slds-backdrop_open" style={{ zIndex: 9998 }}></div>
          <section role="dialog" className="slds-modal slds-fade-in-open" style={{ zIndex: 9999 }}>
            <div className="slds-modal__container" style={{ maxWidth: '400px' }}>
              <header className="slds-modal__header slds-theme_error slds-theme_alert-texture">
                <button 
                  className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse"
                  onClick={() => setDiscardPrompt(null)}
                >
                  <X size={20} />
                </button>
                <h2 className="slds-text-heading_medium slds-text-color_inverse">Descartar Prospecto</h2>
              </header>
              <div className="slds-modal__content slds-p-around_medium">
                <div className="slds-form-element slds-has-error slds-m-bottom_small">
                  <label className="slds-form-element__label">
                    <abbr className="slds-required" title="required">* </abbr>Motivo de Descarte
                  </label>
                  <div className="slds-form-element__control">
                    <div className="slds-select_container">
                      <select
                        className="slds-select"
                        value={lossReason}
                        onChange={e => setLossReason(e.target.value)}
                      >
                        <option value="">Seleccionar motivo...</option>
                        <option value="Datos Falsos / Incontactable">Datos Falsos / Incontactable</option>
                        <option value="No le alcanza / No califica al crédito">No le alcanza / No califica al crédito</option>
                        <option value="Compró a la competencia">Compró a la competencia</option>
                        <option value="Ya no está interesado">Ya no está interesado</option>
                        <option value="Busca otro tipo de inmueble">Busca otro tipo de inmueble</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="slds-form-element">
                  <label className="slds-form-element__label">Notas (Opcional)</label>
                  <div className="slds-form-element__control">
                    <textarea 
                      className="slds-textarea" 
                      rows={2} 
                      value={lossNotes}
                      onChange={e => setLossNotes(e.target.value)}
                      placeholder="Agrega comentarios adicionales..."
                    />
                  </div>
                </div>
              </div>
              <footer className="slds-modal__footer">
                <button 
                  className="slds-button slds-button_neutral" 
                  onClick={() => setDiscardPrompt(null)}
                >
                  Cancelar
                </button>
                <button 
                  className="slds-button slds-button_destructive"
                  disabled={!lossReason}
                  onClick={() => {
                    onLeadStatusChange(discardPrompt.leadId, discardPrompt.statusId, {
                      lossReason,
                      lossNotes
                    });
                    setDiscardPrompt(null);
                  }}
                >
                  Confirmar Descarte
                </button>
              </footer>
            </div>
          </section>
        </>
      )}
    </>
  );
}
