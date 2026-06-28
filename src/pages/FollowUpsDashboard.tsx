// src/pages/FollowUpsDashboard.tsx
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar as CalendarIcon, List,  
  MessageCircle, CheckCircle, Clock, AlertCircle, MapPin, Building,
  ChevronDown, ChevronRight
} from 'lucide-react';
import CalendarView from '../components/CalendarView';
import { useCommercialData } from '../hooks/useCommercialData';
import LeadModal from '../components/LeadModal';
import { saveLeadService } from '../services/leads';
import type { Lead } from '../types/definitions';
import styles from './FollowUpsDashboard.module.css';

export default function FollowUpsDashboard() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isOverdueOpen, setIsOverdueOpen] = useState(true);
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  
  const handleSave = async (leadData: Partial<Lead>) => {
    try {
      if (!leadData.tenantId || !leadData.projectId) {
        alert("Error de contexto: No se detectó la empresa o el proyecto activo.");
        return;
      }

      await saveLeadService(
        leadData, 
        leadData.id || null, 
        leadData.tenantId, 
        leadData.projectId, 
        leadData.assignedTo || 'unassigned'
      );
      
      setIsLeadModalOpen(false);
    } catch (error) {
      console.error("Error crítico al guardar prospecto:", error);
      alert("Hubo un error al guardar en la base de datos.");
    }
  };

  const { leads, loading } = useCommercialData();

  const agendaData = useMemo(() => {
    if (!leads) return { overdue: [], today: [] };

    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const activeLeads = leads.filter(l => 
      l.nextFollowUpDate && 
      !['VENTA_CERRADA', 'NO_INTERESADO'].includes(l.status)
    );

    const overdue: any[] = [];
    const todayTasks: any[] = [];

    const projectNames: Record<string, string> = {
      'proyecto_a': 'Proyecto A',
      'proyecto_b': 'Proyecto B'
    };

    activeLeads.forEach(lead => {
      const leadDateStr = lead.nextFollowUpDate!.split('T')[0];

      const isOverdue = leadDateStr < todayStr;
      const isToday = leadDateStr === todayStr;

      const projectName = lead.projectId ? projectNames[lead.projectId] || lead.projectId : 'Sin Proyecto';
      const isLot = lead.projectId === 'proyecto_a';

      const task = {
        id: lead.id,
        clientName: lead.name || 'Prospecto sin nombre',
        project: projectName,
        unitType: isLot ? 'Lotización' : 'Habilitación Urbana / Propiedad',
        interest: lead.interestLevel || 'Medio',
        actionType: 'Seguimiento', 
        note: lead.nextFollowUpNote || 'Contactar al cliente según lo agendado.',
        date: isOverdue ? `Atrasado (${leadDateStr})` : 'Hoy',
        isOverdue: isOverdue,
        phone: lead.phone || ''
      };

      if (isOverdue) overdue.push(task);
      else if (isToday) todayTasks.push(task);
    });

    return { overdue, today: todayTasks };
  }, [leads]);

  if (loading) {
    return (
      <div className={styles.loaderContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      
      {/* CABECERA */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Agenda de Seguimientos</h2>
        </div>
        
        <div className={styles.headerActions}>
          <button onClick={() => setIsLeadModalOpen(true)} className={styles.btnPrimary}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> 
            <span>Nuevo Prospecto</span>
          </button>

          <div className={styles.viewToggleGroup}>
            <button 
              onClick={() => setViewMode('list')}
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
            >
              <List size={16} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
            >
              <CalendarIcon size={16} /> Calendario
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BARRA DE FILTROS */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={20} />
              <input 
                type="text" 
                placeholder="Buscar por cliente, nota o proyecto..." 
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterControls}>
              <select className={styles.projectSelect}>
                <option value="">Todos los Proyectos</option>
                <option value="proyecto_a">Proyecto A</option>
                <option value="proyecto_b">Proyecto B</option>
              </select>
              <button className={styles.btnFilter}>
                <Filter size={18} /> Filtros
              </button>
            </div>
          </div>

          {/* ATRASADOS */}
          <section className={`${styles.sectionCard} ${styles.sectionDanger}`}>
            <button 
              onClick={() => setIsOverdueOpen(!isOverdueOpen)}
              className={`${styles.sectionHeader} ${styles.sectionHeaderDanger}`}
            >
              <div className={styles.sectionTitleGroup}>
                <span className={`${styles.iconWrapper} ${styles.iconDanger}`}>
                  <AlertCircle size={14} strokeWidth={3} />
                </span>
                <h3 className={`${styles.sectionTitle} ${styles.textDanger}`}>
                  Atrasados <span className={`${styles.countBadge} ${styles.badgeDanger}`}>{agendaData.overdue.length}</span>
                </h3>
              </div>
              <div className={`${styles.chevron} ${styles.chevronDanger} ${isOverdueOpen ? styles.chevronExpanded : ''}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            <div className={`${styles.accordionContent} ${isOverdueOpen ? styles.accordionExpanded : styles.accordionCollapsed}`}>
              <div className={styles.accordionInner}>
                <div className={`${styles.tasksList} ${styles.borderDanger}`}>
                  {agendaData.overdue.length === 0 ? (
                    <p className={styles.emptyText}>No tienes tareas atrasadas.</p>
                  ) : (
                    agendaData.overdue.map((task: any) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* PARA HOY */}
          <section className={`${styles.sectionCard} ${styles.sectionWarning}`}>
            <button 
              onClick={() => setIsTodayOpen(!isTodayOpen)}
              className={`${styles.sectionHeader} ${styles.sectionHeaderWarning}`}
            >
              <div className={styles.sectionTitleGroup}>
                <span className={`${styles.iconWrapper} ${styles.iconWarning}`}>
                  <Clock size={14} strokeWidth={3} />
                </span>
                <h3 className={`${styles.sectionTitle} ${styles.textWarning}`}>
                  Para Hoy <span className={`${styles.countBadge} ${styles.badgeWarning}`}>{agendaData.today.length}</span>
                </h3>
              </div>
              <div className={`${styles.chevron} ${styles.chevronWarning} ${isTodayOpen ? styles.chevronExpanded : ''}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            <div className={`${styles.accordionContent} ${isTodayOpen ? styles.accordionExpanded : styles.accordionCollapsed}`}>
              <div className={styles.accordionInner}>
                <div className={`${styles.tasksList} ${styles.borderWarning}`}>
                  {agendaData.today.length === 0 ? (
                    <p className={styles.emptyText}>No tienes tareas programadas para hoy.</p>
                  ) : (
                    agendaData.today.map((task: any) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      ) : (
        <div>
          <CalendarView leads={leads} />
        </div>
      )}
      <LeadModal  
        isOpen={isLeadModalOpen}  
        onClose={() => setIsLeadModalOpen(false)}  
        onSave={handleSave}
      />
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const isLot = task.unitType.includes('Lote');
  
  const handleWhatsApp = () => {
    if (task.phone) {
      window.open(`https://api.whatsapp.com/send?phone=${task.phone}&text=Hola ${task.clientName}, te escribo de la Inmobiliaria...`, '_blank');
    } else {
      alert('Este prospecto no tiene número de teléfono registrado.');
    }
  };

  return (
    <div className={`${styles.taskCard} ${task.isOverdue ? styles.taskCardDanger : ''}`}>
      <div className={styles.taskLeft}>
        <div className={`${styles.taskAvatar} ${task.isOverdue ? styles.avatarDanger : styles.avatarNeutral}`}>
          {task.clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className={styles.taskClientGroup}>
            <h4 className={styles.taskClientName}>{task.clientName}</h4>
            <span className={`${styles.interestBadge} ${task.interest === 'Alto' ? styles.interestHigh : styles.interestMid}`}>
              {task.interest}
            </span>
          </div>
          <div className={styles.taskProject}>
            {isLot ? <MapPin size={14} /> : <Building size={14} />}
            <span>{task.project}</span>
          </div>
        </div>
      </div>
      <div className={styles.taskMiddle}>
        <span className={styles.taskDateAction}>{task.date} - {task.actionType}</span>
        <p className={styles.taskNote}>{task.note}</p>
      </div>
      <div className={styles.taskActions}>
        <button onClick={handleWhatsApp} className={styles.btnWhatsapp}>
          <MessageCircle size={18}/> 
        </button>
        <button className={styles.btnManage}>
          <CheckCircle size={18} className={styles.iconSuccess}/> Gestionar
        </button>
      </div>
    </div>
  );
}