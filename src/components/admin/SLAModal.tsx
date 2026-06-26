import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { AgentStats, SLALead } from '../../hooks/useAdminMetrics';

interface SLAModalProps {
  viewType: 'compliance' | 'forgotten' | 'worst';
  agent: AgentStats;
  onClose: () => void;
  slaTargetHours: number;
}

export default function SLAModal({ viewType, agent, onClose, slaTargetHours }: SLAModalProps) {
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const formatTime = (hours: number) => {
    if (hours === 0) return '0 min';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} h`;
  };

  const getHeaderTitle = () => {
    if (viewType === 'compliance') return 'Detalle de Cumplimiento SLA';
    if (viewType === 'forgotten') return 'Leads Olvidados (Sin Contactar)';
    if (viewType === 'worst') return 'Caso Crítico: Peor Tiempo';
    return 'Detalle de Tiempos';
  };

  const renderLeadsTable = (leads: SLALead[], title?: string, colorClass?: string) => {
    if (!leads || leads.length === 0) return null;

    return (
      <div className="slds-m-bottom_medium">
        {title && (
          <h3 className={`slds-text-heading_small slds-m-bottom_small ${colorClass || ''}`}>
            {title} ({leads.length})
          </h3>
        )}
        <div className="slds-scrollable_y" style={{ maxHeight: '300px' }}>
          <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped">
            <thead>
              <tr className="slds-line-height_reset">
                <th className="slds-text-title_caps" scope="col">
                  <div className="slds-truncate" title="Prospecto">PROSPECTO</div>
                </th>
                <th className="slds-text-title_caps" scope="col">
                  <div className="slds-truncate" title="Teléfono">TELÉFONO</div>
                </th>
                <th className="slds-text-title_caps" scope="col">
                  <div className="slds-truncate" title="Tiempo de Respuesta">TIEMPO</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.sort((a,b) => (b._ttfcHours||0) - (a._ttfcHours||0)).map(lead => (
                <tr key={lead.id} className="slds-hint-parent">
                  <td data-label="Prospecto">
                    <div className="slds-truncate slds-text-heading_small" style={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                      {lead.name.toLowerCase()}
                    </div>
                  </td>
                  <td data-label="Teléfono">
                    <div className="slds-truncate">{lead.phone || '-'}</div>
                  </td>
                  <td data-label="Tiempo de Respuesta">
                    <div className="slds-truncate slds-text-title_caps" style={{ fontWeight: 700 }}>
                      {formatTime(lead._ttfcHours || 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <section 
        role="dialog" 
        tabIndex={-1} 
        aria-modal="true" 
        className="slds-modal slds-fade-in-open slds-modal_medium"
      >
        <div className="slds-modal__container">
          <button 
            className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" 
            title="Cerrar"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
          >
            <X size={28} color="#FFFFFF" />
            <span className="slds-assistive-text">Cerrar</span>
          </button>
          
          <div className="slds-modal__header">
            <h1 className="slds-modal__title slds-hyphenate">{getHeaderTitle()}</h1>
            <p className="slds-m-top_x-small">
              Rendimiento de <strong style={{ textTransform: 'capitalize' }}>{agent.name.toLowerCase()}</strong>
            </p>
          </div>
          
          <div className="slds-modal__content slds-p-around_medium">
            {viewType === 'compliance' && (
              <>
                <div className="slds-grid slds-gutters slds-m-bottom_medium">
                  <div className="slds-col slds-size_1-of-2">
                    <div className="slds-box slds-box_small slds-theme_default slds-text-align_center">
                      <p className="slds-text-heading_small slds-text-color_success">Dentro de SLA (≤ {slaTargetHours}h)</p>
                      <p className="slds-text-heading_large slds-m-top_x-small">{agent.compliantLeadsList.length}</p>
                    </div>
                  </div>
                  <div className="slds-col slds-size_1-of-2">
                    <div className="slds-box slds-box_small slds-theme_default slds-text-align_center">
                      <p className="slds-text-heading_small slds-text-color_error">Con Retraso (&gt; {slaTargetHours}h)</p>
                      <p className="slds-text-heading_large slds-m-top_x-small">{agent.nonCompliantLeadsList.length}</p>
                    </div>
                  </div>
                </div>
                
                {renderLeadsTable(agent.nonCompliantLeadsList, 'Leads con retraso', 'slds-text-color_error')}
                {renderLeadsTable(agent.compliantLeadsList, 'Leads a tiempo', 'slds-text-color_success')}
              </>
            )}

            {viewType === 'forgotten' && (
              <>
                <div className="slds-scoped-notification slds-media slds-media_center slds-theme_warning slds-m-bottom_medium" role="status">
                  <div className="slds-media__figure">
                    <span className="slds-icon_container slds-icon-utility-warning" title="warning">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ fill: '#FFFFFF' }}>
                        <path d="M12.99 3.03l8.83 15.3c.47.82-.13 1.86-1.07 1.86H3.25c-.94 0-1.54-1.04-1.07-1.86l8.83-15.3c.48-.82 1.48-.82 1.98 0zm-1.63 12.63v1.86c0 .28.22.5.5.5h.28c.28 0 .5-.22.5-.5v-1.86c0-.28-.22-.5-.5-.5h-.28c-.28 0-.5.22-.5.5zm0-6.17v4.61c0 .28.22.5.5.5h.28c.28 0 .5-.22.5-.5V9.49c0-.28-.22-.5-.5-.5h-.28c-.28 0-.5.22-.5.5z"/>
                      </svg>
                    </span>
                  </div>
                  <div className="slds-media__body">
                    <p style={{ color: '#FFFFFF' }}>Estos leads superaron la meta SLA y <strong>todavía no tienen ninguna actividad registrada</strong>.</p>
                  </div>
                </div>
                {agent.uncontactedLeadsList.length > 0 ? (
                  renderLeadsTable(agent.uncontactedLeadsList)
                ) : (
                  <p className="slds-text-align_center slds-text-color_weak slds-p-around_medium">No hay leads olvidados.</p>
                )}
              </>
            )}

            {viewType === 'worst' && (
              <>
                <div className="slds-scoped-notification slds-media slds-media_center slds-theme_error slds-m-bottom_medium" role="status">
                  <div className="slds-media__figure">
                    <span className="slds-icon_container slds-icon-utility-error" title="error">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ fill: '#FFFFFF' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    </span>
                  </div>
                  <div className="slds-media__body">
                    <p style={{ color: '#FFFFFF' }}>Este es el prospecto crítico que tuvo que esperar la mayor cantidad de tiempo antes de recibir su primer contacto.</p>
                  </div>
                </div>
                {agent.worstLead ? (
                  renderLeadsTable([agent.worstLead])
                ) : (
                  <p className="slds-text-align_center slds-text-color_weak slds-p-around_medium">No hay registros de tiempo.</p>
                )}
              </>
            )}
          </div>
          
          <div className="slds-modal__footer">
            <button className="slds-button slds-button_neutral" onClick={onClose}>Cerrar Detalle</button>
          </div>
        </div>
      </section>
      <div className="slds-backdrop slds-backdrop_open" role="presentation"></div>
    </>
  );
}
