import React, { useState, useMemo } from 'react';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import styles from './KanbanBoard.module.css';

interface KanbanBoardProps {
  leads: Lead[];
  onLeadStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  isAdminMode?: boolean; // God mode flag
}

const DEFAULT_PALETTE = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#059669', '#ef4444', '#6366f1'];

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
            <div className={styles.columnHeader} style={{ borderTopColor: column.color }}>
              <h3 className={styles.columnTitle}>{column.title}</h3>
              <span className={styles.columnCount}>{columnLeads.length}</span>
            </div>

            <div className={styles.columnBody}>
              {columnLeads.map(lead => (
                <div
                  key={lead.id}
                  className={styles.card}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onLeadClick(lead)}
                >
                  <div className={styles.cardHeader}>
                    <p className={styles.leadName}>{lead.name}</p>
                    {lead.interestLevel && (
                      <span className={`${styles.badge} ${styles['badge' + lead.interestLevel]}`}>
                        {lead.interestLevel}
                      </span>
                    )}
                  </div>
                  <p className={styles.leadPhone}>{lead.phone}</p>
                  
                  {isAdminMode && (
                    <div className={styles.adminInfo}>
                      <span className={styles.agentAvatar} title="Agente Asignado">
                        {lead.assignedTo?.substring(0, 2).toUpperCase() || 'AG'}
                      </span>
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
