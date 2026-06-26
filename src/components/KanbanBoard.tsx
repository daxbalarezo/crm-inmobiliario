import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import styles from './KanbanBoard.module.css';

interface KanbanBoardProps {
  leads: Lead[];
  onLeadStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  isAdminMode?: boolean; // God mode flag
}

const DEFAULT_PALETTE = ['#0176D3']; // Standard SLDS brand color

const FALLBACK_STAGES = ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO'];

export default function KanbanBoard({ leads, onLeadStatusChange, onLeadClick, isAdminMode }: KanbanBoardProps) {
  const { tenant } = useCRM();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const columns = useMemo(() => {
    const stages = tenant?.stages && tenant.stages.length > 0 ? tenant.stages : FALLBACK_STAGES;
    return stages.map((stage, index) => ({
      id: stage,
      title: stage.replace(/_/g, ' '),
      color: DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
    }));
  }, [tenant?.stages]);

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
      // Si por alguna razón el state no se seteó rápido
      onLeadStatusChange(leadId, statusId);
    } else if (draggedLeadId) {
      onLeadStatusChange(draggedLeadId, statusId);
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
    <div className={styles.boardContainer}>
      {columns.map(column => {
        const columnLeads = leads.filter(l => l.status === column.id);
        
        return (
          <div 
            key={column.id} 
            className={styles.column}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={styles.columnHeader}>
              <h3 className="slds-text-title_caps" style={{ color: '#0176D3' }}>{column.title}</h3>
              <span className="slds-badge slds-theme_success" style={{ backgroundColor: '#e2e8f0', color: '#080707' }}>{columnLeads.length}</span>
            </div>

            <div className={styles.columnBody}>
              {columnLeads.map(lead => (
                <div
                  key={lead.id}
                  className={`slds-box slds-box_x-small slds-theme_default ${styles.card}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onLeadClick(lead)}
                  style={{ marginBottom: '8px', cursor: 'pointer', position: 'relative' }}
                >
                  <div className="slds-grid slds-grid_align-spread slds-m-bottom_x-small">
                    <p className="slds-truncate" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>
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
                        }`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', marginLeft: '0.25rem' }}>
                          {lead.interestLevel}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.75rem' }}>
                    {lead.phone || 'Sin teléfono'}
                  </p>
                  
                  {isAdminMode && lead.assignedTo && (
                    <div className="slds-m-top_x-small slds-border_top slds-p-top_xx-small">
                      <p className="slds-text-color_weak slds-truncate" style={{ fontSize: '0.65rem' }}>
                        Agente: <strong>{lead.assignedTo}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
