import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Download } from 'lucide-react';
import { useAdvancedReports } from '../hooks/useAdvancedReports';
import styles from './AdvancedReportsDashboard.module.css';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';

const ITEMS_PER_PAGE = 10;

export default function AdvancedReportsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'source';

  const { tenant, userProfile } = useCRM();
  const { loading, leads, activities, users } = useAdvancedReports();
  
  const [reportType, setReportType] = useState<string>(initialType);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputText, setPageInputText] = useState('1');

  useEffect(() => {
    setCurrentPage(1);
    setPageInputText('1');
    setSelectedSubFilter(null);
  }, [timeRange, selectedAgent, stageFilter, reportType]);

  const dynamicStages = tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO'];

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

  const modalFilteredLeads = useMemo(() => {
    if (!selectedSubFilter) return filteredLeads;
    if (reportType === 'source') return filteredLeads.filter(l => (l.source || 'Desconocido') === selectedSubFilter);
    if (reportType === 'workload') return filteredLeads.filter(l => (l.assignedTo || 'unassigned') === selectedSubFilter);
    if (reportType === 'loss_reasons') return filteredLeads.filter(l => (l.lossReason || 'No especificado') === selectedSubFilter);
    return filteredLeads;
  }, [filteredLeads, selectedSubFilter, reportType]);

  const modalFilteredActivities = useMemo(() => {
    if (!selectedSubFilter) return filteredActivities;
    if (reportType === 'productivity') return filteredActivities.filter(a => (a.userId || 'unassigned') === selectedSubFilter);
    return filteredActivities;
  }, [filteredActivities, selectedSubFilter, reportType]);

  const totalItems = reportType === 'productivity' ? modalFilteredActivities.length : modalFilteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedActivities = modalFilteredActivities.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedLeads = modalFilteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageJumper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageInputText(val);
    const value = parseInt(val, 10);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      setCurrentPage(value);
    }
  };

  const handleExportCSV = () => {
    if (reportType === 'productivity') {
      const headers = ['Fecha,Asesor,Actividad,Lead'];
      const rows = modalFilteredActivities.map(act => {
        const dateObj = act.createdAt?.toDate ? act.createdAt.toDate() : new Date(act.createdAt || Date.now());
        return `"${dateObj.toLocaleString()}","${getUserName(act.userId)}","${act.type}","${getLeadName(act.leadId)}"`;
      });
      const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_actividades.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Nombre del Lead,Asesor,Etapa,Campo Extra,Fecha'];
      const rows = modalFilteredLeads.map(lead => {
        const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
        const extraField = reportType === 'source' ? (lead.source || 'Desconocido') : reportType === 'loss_reasons' ? (lead.lossReason || 'No especificado') : (lead.interestLevel || 'Medio');
        return `"${lead.name}","${getUserName(lead.assignedTo)}","${lead.status?.replace(/_/g, ' ')}","${extraField}","${dateObj.toLocaleDateString()}"`;
      });
      const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_avanzado_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
              <th className={styles.th}>Fuente de Adquisición</th>
              <th className={styles.th}>Total de Prospectos</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(src => (
              <tr key={src} className={styles.tr} onClick={() => { setSelectedSubFilter(src); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className={styles.td} style={{ fontWeight: 600 }}>{src}</td>
                <td className={styles.td}>{sourceMap[src].length}</td>
              </tr>
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
              <th className={styles.th}>Total Leads Activos</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              <tr key={agentId} className={styles.tr} onClick={() => { setSelectedSubFilter(agentId); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className={styles.td} style={{ fontWeight: 600 }}>{getUserName(agentId)}</td>
                <td className={styles.td}>{agentMap[agentId].length}</td>
              </tr>
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
              <th className={styles.th}>Total Prospectos Perdidos</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map(reason => (
              <tr key={reason} className={styles.tr} onClick={() => { setSelectedSubFilter(reason); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className={styles.td} style={{ fontWeight: 600 }}>{reason}</td>
                <td className={styles.td}>{reasonMap[reason].length}</td>
              </tr>
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
              <th className={styles.th}>Total Actividades</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              <tr key={agentId} className={styles.tr} onClick={() => { setSelectedSubFilter(agentId); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className={styles.td} style={{ fontWeight: 600 }}>{getUserName(agentId)}</td>
                <td className={styles.td}>{agentMap[agentId].length}</td>
              </tr>
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
            {reportType === 'source' ? 'Resumen por Canal de Origen' : 
             reportType === 'workload' ? 'Resumen de Carga de Trabajo por Asesor' :
             reportType === 'loss_reasons' ? 'Resumen de Motivos de Pérdida' :
             'Resumen de Actividades por Asesor'}
          </h3>
          <span className={styles.resultsBadge}>{reportType === 'productivity' ? filteredActivities.length : filteredLeads.length} Registros Totales</span>
        </div>
        <div className={styles.tableContainer}>
          {renderTable()}
        </div>
        
        {((reportType !== 'productivity' && filteredLeads.length > 0) || (reportType === 'productivity' && filteredActivities.length > 0)) && (
          <div style={{ padding: '0 24px' }}>
            <button 
              onClick={() => { setSelectedSubFilter(null); setIsListModalOpen(true); setCurrentPage(1); }}
              className={styles.openModalBtn}
            >
              <List size={20} />
              Ver Listado Detallado de Todos los Registros ({reportType === 'productivity' ? filteredActivities.length : filteredLeads.length})
            </button>
          </div>
        )}
      </div>

      {isListModalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsListModalOpen(false); }}>
          <div className={styles.listModal}>
            <div className={styles.listModalHeader}>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                Listado Detallado {selectedSubFilter && `- ${reportType === 'workload' || reportType === 'productivity' ? getUserName(selectedSubFilter) : selectedSubFilter}`} ({totalItems})
              </h3>
              <div className={styles.headerActions}>
                {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                  <button className={styles.exportBtn} onClick={handleExportCSV}>
                    <Download size={16} /> Exportar CSV
                  </button>
                )}
                <button className={styles.closeBtn} onClick={() => setIsListModalOpen(false)}>&times;</button>
              </div>
            </div>
            <div className={styles.listModalBody}>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {reportType === 'productivity' ? (
                        <>
                          <th className={styles.th}>Fecha</th>
                          <th className={styles.th}>Asesor</th>
                          <th className={styles.th}>Actividad</th>
                          <th className={styles.th}>Lead</th>
                        </>
                      ) : (
                        <>
                          <th className={styles.th}>Nombre del Lead</th>
                          <th className={styles.th}>Asesor</th>
                          <th className={styles.th}>Etapa</th>
                          <th className={styles.th}>{reportType === 'source' ? 'Fuente' : reportType === 'loss_reasons' ? 'Motivo Pérdida' : 'Nivel de Interés'}</th>
                          <th className={styles.th}>Fecha</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportType === 'productivity' ? (
                      paginatedActivities.map(act => {
                        const dateObj = act.createdAt?.toDate ? act.createdAt.toDate() : new Date(act.createdAt || Date.now());
                        return (
                          <tr key={act.id} className={styles.tr}>
                            <td className={styles.td}>{dateObj.toLocaleString()}</td>
                            <td className={styles.td}>{getUserName(act.userId)}</td>
                            <td className={styles.td} style={{ textTransform: 'capitalize' }}>{act.type}</td>
                            <td className={styles.td}>{getLeadName(act.leadId)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      paginatedLeads.map(lead => {
                        const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                        return (
                          <tr key={lead.id} className={styles.tr} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }} style={{ cursor: 'pointer' }}>
                            <td className={styles.td}>{lead.name}</td>
                            <td className={styles.td}>{getUserName(lead.assignedTo)}</td>
                            <td className={styles.td}>{lead.status?.replace(/_/g, ' ')}</td>
                            <td className={styles.td}>{reportType === 'source' ? (lead.source || 'Desconocido') : reportType === 'loss_reasons' ? (lead.lossReason || 'No especificado') : (lead.interestLevel || 'Medio')}</td>
                            <td className={styles.td}>{dateObj.toLocaleDateString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalItems > ITEMS_PER_PAGE && (
                <div className={styles.pagination}>
                  <span className={styles.pageInfo}>
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems}
                  </span>
                  
                  <div className={styles.pageJumper}>
                    Página 
                    <input 
                      type="number" 
                      min={1} 
                      max={totalPages} 
                      value={pageInputText} 
                      onChange={handlePageJumper}
                      onBlur={() => setPageInputText(currentPage.toString())}
                      className={styles.pageInput}
                    /> 
                    de {totalPages}
                  </div>

                  <div className={styles.pageButtons}>
                    <button 
                      className={styles.pageBtn} 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <button 
                      className={styles.pageBtn} 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
