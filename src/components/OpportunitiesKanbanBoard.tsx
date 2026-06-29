import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Opportunity } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
interface KanbanBoardProps {
  opportunities: Opportunity[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onClick: (opp: Opportunity) => void;
  isAdminMode?: boolean; // God mode flag
  agents?: {id: string, name: string}[];
}

const DEFAULT_PALETTE = ['#0176D3']; // Standard SLDS brand color

const FALLBACK_STAGES = ['NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO'];

export default function OpportunitiesKanbanBoard({ opportunities, onStatusChange, onClick, isAdminMode, agents }: KanbanBoardProps) {
  const { tenant } = useCRM();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (tenant?.pipeline_stages && tenant.pipeline_stages.length > 0) {
      return tenant.pipeline_stages.map((stage) => ({
        id: stage.name, // Guardamos el nombre en el status del lead
        title: stage.name,
        color: stage.color || DEFAULT_PALETTE[0]
      }));
    }
    
    // Fallback si la inmobiliaria aún no heredó plantillas
    return FALLBACK_STAGES.map((stage, index) => ({
      id: stage,
      title: stage.replace(/_/g, ' '),
      color: DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
    }));
  }, [tenant?.pipeline_stages]);

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
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId && leadId !== draggedLeadId) {
      onStatusChange(leadId, statusId);
    } else if (draggedLeadId) {
      onStatusChange(draggedLeadId, statusId);
    }
    setDraggedLeadId(null);
  };

  const isStalled = (opp: Opportunity) => {
    if (['GANADA', 'PERDIDA'].includes(opp.stage)) return false;
    
    let lastActivityTime = opp.updatedAt || opp.createdAt;
    if (!lastActivityTime) return false;
    
    const dateObj = lastActivityTime.toDate ? lastActivityTime.toDate() : new Date(lastActivityTime);
    const diffTime = Math.abs(new Date().getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 14;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: 'calc(100vh - 250px)' }}>
      {columns.map(column => {
        const columnOpps = opportunities.filter(o => o.stage === column.id);
        const columnTotalValue = columnOpps.reduce((sum, o) => sum + (o.amount || 0), 0);

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
                <span className="slds-badge slds-theme_shade" style={{ color: '#444', fontSize: '0.75rem' }}>{columnOpps.length}</span>
              </div>
              <div className="slds-m-top_xx-small" style={{ fontSize: '0.8125rem', color: '#444', fontWeight: 400 }}>
                {formatCurrency(columnTotalValue)}
              </div>
            </div>

            <div className="slds-panel__body slds-scrollable_y" style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {columnOpps.map(opp => (
                <div
                  key={opp.id}
                  className="slds-card slds-card_boundary"
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onClick(opp)}
                  style={{ cursor: 'grab', marginBottom: 0, borderLeft: `4px solid ${column.color}` }}
                >
                  <div className="slds-card__body slds-card__body_inner slds-p-around_small">
                    <div className="slds-grid slds-grid_align-spread slds-m-bottom_xx-small">
                      <p className="slds-truncate" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0176D3', textTransform: 'capitalize' }}>
                        {opp.name.toLowerCase()}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isStalled(opp) && (
                          <div title="Oportunidad Estancada: Sin actividad en más de 14 días" style={{ display: 'inline-flex', alignItems: 'center', color: '#ea001e', marginRight: '4px' }}>
                            <AlertTriangle size={14} />
                          </div>
                        )}
                        {opp.probability && (
                          <span className={`slds-badge slds-theme_shade`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginLeft: '0.25rem' }}>
                            {opp.probability}%
                          </span>
                        )}
                      </div>
                    </div>

                    {(opp.amount || 0) > 0 && (
                      <p className="slds-m-bottom_xx-small" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#181818' }}>
                        {formatCurrency(opp.amount)}
                      </p>
                    )}

                    <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      Cuenta Asociada
                    </p>
                    
                    {isAdminMode && opp.assignedTo && (
                      <div className="slds-m-top_x-small slds-border_top slds-p-top_xx-small">
                        <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                          Agente: <span style={{ fontWeight: 400, color: '#181818' }}>{(agents?.find(a => a.id === opp.assignedTo)?.name || opp.assignedTo).toLowerCase()}</span>
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
  );
}
