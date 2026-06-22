import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdvancedReports } from '../hooks/useAdvancedReports';
import styles from './AdvancedReportsDashboard.module.css';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';

export default function AdvancedReportsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'source';

  const { tenant } = useCRM();
  const { loading, leads, activities, users } = useAdvancedReports();
  
  const [reportType, setReportType] = useState<string>(initialType);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const dynamicStages = tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO', 'CERRADO'];

  // Apply filters
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Time filter
    if (timeRange !== 'all') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      result = result.filter(l => {
        if (!l.createdAt) return false;
        const dateObj = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
        if (isNaN(dateObj.getTime())) return false;

        if (timeRange === 'this_month') {
          return dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth;
        } else if (timeRange === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return dateObj.getFullYear() === year && dateObj.getMonth() === lastMonth;
        } else if (timeRange === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return dateObj >= sixMonthsAgo;
        } else if (timeRange === 'this_year') {
          return dateObj.getFullYear() === currentYear;
        }
        return true;
      });
    }

    // Agent filter
    if (selectedAgent !== 'all') {
      result = result.filter(l => l.assignedTo === selectedAgent);
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter(l => l.status === stageFilter);
    }

    // Report Type specific filtering
    if (reportType === 'workload') {
      // Solo activos
      result = result.filter(l => l.status !== 'VENDIDO' && l.status !== 'CERRADO' && l.status !== 'PERDIDO');
    } else if (reportType === 'loss_reasons') {
      // Solo perdidos
      result = result.filter(l => l.status === 'PERDIDO');
    }

    return result;
  }, [leads, timeRange, selectedAgent, stageFilter, reportType]);

  const filteredActivities = useMemo(() => {
    let result = activities || [];

    if (timeRange !== 'all') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      result = result.filter(a => {
        if (!a.createdAt) return false;
        const dateObj = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        if (isNaN(dateObj.getTime())) return false;

        if (timeRange === 'this_month') {
          return dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth;
        } else if (timeRange === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return dateObj.getFullYear() === year && dateObj.getMonth() === lastMonth;
        } else if (timeRange === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return dateObj >= sixMonthsAgo;
        } else if (timeRange === 'this_year') {
          return dateObj.getFullYear() === currentYear;
        }
        return true;
      });
    }

    if (selectedAgent !== 'all') {
      result = result.filter(a => a.userId === selectedAgent);
    }

    return result;
  }, [activities, timeRange, selectedAgent]);

  const getUserName = (uid: string) => users.find(u => u.uid === uid)?.name || 'Sin asignar';
  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.name || 'Desconocido';

  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setReportType(val);
    setSearchParams({ type: val });
  };

  const renderTable = () => {
    if ((reportType !== 'productivity' && filteredLeads.length === 0) || (reportType === 'productivity' && filteredActivities.length === 0)) {
      return (
        <div className={styles.emptyState}>
          No hay datos disponibles para los filtros seleccionados.
        </div>
      );
    }

    if (reportType === 'source') {
      // Agrupar por fuente
      const sourceMap: Record<string, Lead[]> = {};
      filteredLeads.forEach(l => {
        const src = l.source || 'Desconocido';
        if (!sourceMap[src]) sourceMap[src] = [];
        sourceMap[src].push(l);
      });
      const sources = Object.keys(sourceMap).sort((a, b) => sourceMap[b].length - sourceMap[a].length);

      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Fuente</th>
              <th className={styles.th}>Nombre del Lead</th>
              <th className={styles.th}>Asesor Asignado</th>
              <th className={styles.th}>Etapa</th>
              <th className={styles.th}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(src => (
              sourceMap[src].map((lead, index) => {
                const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                return (
                  <tr key={lead.id} className={styles.tr} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                    {index === 0 ? (
                      <td className={styles.td} rowSpan={sourceMap[src].length} style={{ fontWeight: 600, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                        {src} <span className={styles.badgeDefault} style={{ marginLeft: 8 }}>{sourceMap[src].length}</span>
                      </td>
                    ) : null}
                    <td className={styles.td}>{lead.name}</td>
                    <td className={styles.td}>{getUserName(lead.assignedTo)}</td>
                    <td className={styles.td}>{lead.status?.replace(/_/g, ' ')}</td>
                    <td className={styles.td}>{dateObj.toLocaleDateString()}</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === 'workload') {
      // Agrupar por asesor
      const agentMap: Record<string, Lead[]> = {};
      filteredLeads.forEach(l => {
        const agent = l.assignedTo || 'unassigned';
        if (!agentMap[agent]) agentMap[agent] = [];
        agentMap[agent].push(l);
      });
      const agents = Object.keys(agentMap).sort((a, b) => agentMap[b].length - agentMap[a].length);

      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Asesor</th>
              <th className={styles.th}>Lead Activo</th>
              <th className={styles.th}>Etapa</th>
              <th className={styles.th}>Nivel de Interés</th>
              <th className={styles.th}>Antigüedad (Días)</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              agentMap[agentId].map((lead, index) => {
                const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                const daysOld = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <tr key={lead.id} className={styles.tr} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                    {index === 0 ? (
                      <td className={styles.td} rowSpan={agentMap[agentId].length} style={{ fontWeight: 600, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                        {getUserName(agentId)} <span className={styles.badgeWarning} style={{ marginLeft: 8 }}>{agentMap[agentId].length}</span>
                      </td>
                    ) : null}
                    <td className={styles.td}>{lead.name}</td>
                    <td className={styles.td}>{lead.status?.replace(/_/g, ' ')}</td>
                    <td className={styles.td}>{lead.interestLevel || 'Medio'}</td>
                    <td className={styles.td}>{daysOld} días</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === 'loss_reasons') {
      // Agrupar por motivo de pérdida
      const reasonMap: Record<string, Lead[]> = {};
      filteredLeads.forEach(l => {
        const reason = l.lossReason || 'No especificado';
        if (!reasonMap[reason]) reasonMap[reason] = [];
        reasonMap[reason].push(l);
      });
      const reasons = Object.keys(reasonMap).sort((a, b) => reasonMap[b].length - reasonMap[a].length);

      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Motivo de Pérdida</th>
              <th className={styles.th}>Nombre del Lead</th>
              <th className={styles.th}>Asesor Asignado</th>
              <th className={styles.th}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map(reason => (
              reasonMap[reason].map((lead, index) => {
                const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                return (
                  <tr key={lead.id} className={styles.tr} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                    {index === 0 ? (
                      <td className={styles.td} rowSpan={reasonMap[reason].length} style={{ fontWeight: 600, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                        {reason} <span className={styles.badgeError} style={{ marginLeft: 8 }}>{reasonMap[reason].length}</span>
                      </td>
                    ) : null}
                    <td className={styles.td}>{lead.name}</td>
                    <td className={styles.td}>{getUserName(lead.assignedTo)}</td>
                    <td className={styles.td}>{dateObj.toLocaleDateString()}</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === 'productivity') {
      // Agrupar por asesor
      const agentMap: Record<string, any[]> = {};
      filteredActivities.forEach(a => {
        const agent = a.userId || 'unassigned';
        if (!agentMap[agent]) agentMap[agent] = [];
        agentMap[agent].push(a);
      });
      const agents = Object.keys(agentMap).sort((a, b) => agentMap[b].length - agentMap[a].length);

      return (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Asesor</th>
              <th className={styles.th}>Tipo de Actividad</th>
              <th className={styles.th}>Lead Relacionado</th>
              <th className={styles.th}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              agentMap[agentId].map((act, index) => {
                const dateObj = act.createdAt?.toDate ? act.createdAt.toDate() : new Date(act.createdAt || Date.now());
                
                return (
                  <tr key={act.id} className={styles.tr}>
                    {index === 0 ? (
                      <td className={styles.td} rowSpan={agentMap[agentId].length} style={{ fontWeight: 600, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                        {getUserName(agentId)} <span className={styles.badgeInfo} style={{ marginLeft: 8 }}>{agentMap[agentId].length}</span>
                      </td>
                    ) : null}
                    <td className={styles.td} style={{ textTransform: 'capitalize' }}>{act.type}</td>
                    <td className={styles.td}>{getLeadName(act.leadId)}</td>
                    <td className={styles.td}>{dateObj.toLocaleString()}</td>
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando datos para el reporte...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reportes Avanzados</h2>
        <p className={styles.subtitle}>Explorador de datos y cruce de información</p>
      </div>

      <div className={styles.controlsCard}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Tipo de Reporte</label>
          <select value={reportType} onChange={handleReportTypeChange} className={styles.filterSelect}>
            <option value="source">Fuentes de Adquisición</option>
            <option value="workload">Carga de Trabajo Activa</option>
            <option value="loss_reasons">Análisis de Ventas Perdidas</option>
            <option value="productivity">Métricas de Productividad</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Período</label>
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className={styles.filterSelect}>
            <option value="all">Histórico Total</option>
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
            <option value="last_6_months">Últimos 6 meses</option>
            <option value="this_year">Este año</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Asesor</label>
          <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className={styles.filterSelect}>
            <option value="all">Todos los asesores</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Etapa</label>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className={styles.filterSelect}>
            <option value="all">Todas las etapas</option>
            {dynamicStages.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
            <option value="PERDIDO">PERDIDO</option>
          </select>
        </div>
      </div>

      <div className={styles.resultsCard}>
        <div className={styles.resultsHeader}>
          <h3 className={styles.resultsTitle}>
            {reportType === 'source' ? 'Prospectos por Canal de Origen' : 
             reportType === 'workload' ? 'Carga de Trabajo por Asesor' :
             reportType === 'loss_reasons' ? 'Prospectos Perdidos por Motivo' :
             'Registro de Actividades por Asesor'}
          </h3>
          <span className={styles.resultsBadge}>{reportType === 'productivity' ? filteredActivities.length : filteredLeads.length} Registros</span>
        </div>
        <div className={styles.tableContainer}>
          {renderTable()}
        </div>
      </div>

      {isLeadModalOpen && selectedLead && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          lead={selectedLead}
          onSave={async () => { setIsLeadModalOpen(false); }}
        />
      )}
    </div>
  );
}
