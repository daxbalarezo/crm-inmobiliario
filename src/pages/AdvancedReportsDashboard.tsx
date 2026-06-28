import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Download, BarChart3, Inbox, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAdvancedReports } from '../hooks/useAdvancedReports';
import styles from './AdvancedReportsDashboard.module.css';
import agentStyles from './AgentAnalyticsDashboard.module.css';

import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';
import { useCRM } from '../context/CRMContext';

const ITEMS_PER_PAGE = 10;

export default function AdvancedReportsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'source';

  const { tenant, userProfile } = useCRM();
  const [reportType, setReportType] = useState<string>(initialType);
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const { loading, error, leads, activities, users } = useAdvancedReports(timeRange);

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
  }, [leads, selectedAgent, stageFilter, reportType]);

  const filteredActivities = useMemo(() => {
    let result = activities || [];

    if (selectedAgent !== 'all') {
      result = result.filter(a => a.userId === selectedAgent);
    }

    return result;
  }, [activities, selectedAgent]);

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

  const SLDS_CATEGORICAL_COLORS = ['#52B7D8', '#E16032', '#FFB03B', '#54A77B', '#4FD2D2', '#E287B2', '#0176D3', '#0B5CAB'];

  const renderHighlights = () => {
    if (reportType === 'source') {
      const sourceMap: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const src = l.source || 'Desconocido';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      });
      const topSource = Object.entries(sourceMap).sort((a,b) => b[1]-a[1])[0] || ['N/A', 0];
      return (
        <div className={agentStyles.highlightsPanel}>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Total Prospectos</p>
            <p className={agentStyles.highlightValue}>{filteredLeads.length}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Principal Origen</p>
            <p className={agentStyles.highlightValue}>{topSource[0]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Prospectos del Principal</p>
            <p className={agentStyles.highlightValue}>{topSource[1]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Total Fuentes</p>
            <p className={agentStyles.highlightValue}>{Object.keys(sourceMap).length}</p>
          </div>
        </div>
      );
    }

    if (reportType === 'productivity') {
      const userMap: Record<string, number> = {};
      filteredActivities.forEach(a => {
        const uid = a.userId || 'unassigned';
        userMap[uid] = (userMap[uid] || 0) + 1;
      });
      const topUser = Object.entries(userMap).sort((a,b) => b[1]-a[1])[0] || ['N/A', 0];
      return (
        <div className={agentStyles.highlightsPanel}>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Total Actividades</p>
            <p className={agentStyles.highlightValue}>{filteredActivities.length}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Asesor Más Activo</p>
            <p className={agentStyles.highlightValue}>{topUser[0] !== 'N/A' ? getUserName(topUser[0]) : 'N/A'}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Mayor Volumen</p>
            <p className={agentStyles.highlightValue}>{topUser[1]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Promedio por Asesor</p>
            <p className={agentStyles.highlightValue}>{Object.keys(userMap).length > 0 ? (filteredActivities.length / Object.keys(userMap).length).toFixed(1) : 0}</p>
          </div>
        </div>
      );
    }

    if (reportType === 'loss_reasons') {
      const reasonMap: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const r = l.lossReason || 'No especificado';
        reasonMap[r] = (reasonMap[r] || 0) + 1;
      });
      const topReason = Object.entries(reasonMap).sort((a,b) => b[1]-a[1])[0] || ['N/A', 0];
      return (
        <div className={agentStyles.highlightsPanel}>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Total Perdidos</p>
            <p className={agentStyles.highlightValue}>{filteredLeads.length}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Motivo Principal</p>
            <p className={agentStyles.highlightValue}>{topReason[0]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Casos del Motivo</p>
            <p className={agentStyles.highlightValue}>{topReason[1]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Tipos de Motivo</p>
            <p className={agentStyles.highlightValue}>{Object.keys(reasonMap).length}</p>
          </div>
        </div>
      );
    }

    if (reportType === 'workload') {
       const activeLeads = filteredLeads;
       const userMap: Record<string, number> = {};
       activeLeads.forEach(l => {
         const uid = l.assignedTo || 'unassigned';
         userMap[uid] = (userMap[uid] || 0) + 1;
       });
       const maxUser = Object.entries(userMap).sort((a,b) => b[1]-a[1])[0] || ['N/A', 0];
       return (
        <div className={agentStyles.highlightsPanel}>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Asignaciones Activas</p>
            <p className={agentStyles.highlightValue}>{activeLeads.length}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Mayor Carga</p>
            <p className={agentStyles.highlightValue}>{maxUser[0] !== 'N/A' ? getUserName(maxUser[0]) : 'N/A'}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Volumen Máximo</p>
            <p className={agentStyles.highlightValue}>{maxUser[1]}</p>
          </div>
          <div className={agentStyles.highlightItem}>
            <p className={agentStyles.highlightLabel}>Promedio de Carga</p>
            <p className={agentStyles.highlightValue}>{Object.keys(userMap).length > 0 ? (activeLeads.length / Object.keys(userMap).length).toFixed(1) : 0}</p>
          </div>
        </div>
       );
    }
    return null;
  };

  const renderChart = () => {
    let data: any[] = [];
    
    if (reportType === 'source') {
      const sourceMap: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const src = l.source || 'Desconocido';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      });
      data = Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    } else if (reportType === 'productivity') {
      const userMap: Record<string, number> = {};
      filteredActivities.forEach(a => {
        const uid = a.userId || 'unassigned';
        userMap[uid] = (userMap[uid] || 0) + 1;
      });
      data = Object.entries(userMap).map(([uid, value]) => ({ name: getUserName(uid), value })).sort((a,b) => b.value - a.value);
    } else if (reportType === 'loss_reasons') {
      const reasonMap: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const r = l.lossReason || 'No especificado';
        reasonMap[r] = (reasonMap[r] || 0) + 1;
      });
      data = Object.entries(reasonMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    } else if (reportType === 'workload') {
       const userMap: Record<string, number> = {};
       filteredLeads.forEach(l => {
         const uid = l.assignedTo || 'unassigned';
         userMap[uid] = (userMap[uid] || 0) + 1;
       });
       data = Object.entries(userMap).map(([uid, value]) => ({ name: getUserName(uid), value })).sort((a,b) => b.value - a.value);
    }

    if (data.length === 0) return null;

    return (
      <article className={agentStyles.sldsCard} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={agentStyles.sldsCardHeader} style={{ display: 'flex', alignItems: 'center' }}>
          <h2 className={agentStyles.sldsCardTitle} style={{ margin: 0 }}>Distribución</h2>
        </div>
        <div style={{ flex: 1, minHeight: '300px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={SLDS_CATEGORICAL_COLORS[index % SLDS_CATEGORICAL_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any) => [value, 'Carga de Trabajo']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    );
  };

  const renderTable = () => {

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
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr>
              <th className="">Fuente de Adquisición</th>
              <th className="">Total de Prospectos</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(src => (
              <tr key={src} className="slds-hint-parent" onClick={() => { setSelectedSubFilter(src); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className="" style={{ fontWeight: 600 }}>{src}</td>
                <td className="">{sourceMap[src].length}</td>
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
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr>
              <th className="">Asesor</th>
              <th className="">Total Leads Activos</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              <tr key={agentId} className="slds-hint-parent" onClick={() => { setSelectedSubFilter(agentId); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className="" style={{ fontWeight: 600 }}>{getUserName(agentId)}</td>
                <td className="">{agentMap[agentId].length}</td>
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
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr>
              <th className="">Motivo de Pérdida</th>
              <th className="">Total Prospectos Perdidos</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map(reason => (
              <tr key={reason} className="slds-hint-parent" onClick={() => { setSelectedSubFilter(reason); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className="" style={{ fontWeight: 600 }}>{reason}</td>
                <td className="">{reasonMap[reason].length}</td>
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
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr>
              <th className="">Asesor</th>
              <th className="">Total Actividades</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agentId => (
              <tr key={agentId} className="slds-hint-parent" onClick={() => { setSelectedSubFilter(agentId); setIsListModalOpen(true); setCurrentPage(1); }}>
                <td className="" style={{ fontWeight: 600 }}>{getUserName(agentId)}</td>
                <td className="">{agentMap[agentId].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <div className="slds-spinner_container slds-is-fixed">
            <div role="status" className="slds-spinner slds-spinner_large slds-spinner_brand">
               <span className="slds-assistive-text">Loading</span>
               <div className="slds-spinner__dot-a"></div>
               <div className="slds-spinner__dot-b"></div>
            </div>
         </div>
      </div>
    );
  }

  if (error) {
    const urlMatch = error.match(/(https:\/\/console\.firebase\.google\.com[^\s]*)/);
    const url = urlMatch ? urlMatch[0] : null;
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', padding: '24px', borderRadius: '8px', color: '#991b1b' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Requiere Índice Compuesto de Firebase</h2>
          <p style={{ marginBottom: '16px' }}>
            Firebase ha bloqueado la consulta porque requiere un índice para ordenar los datos por fecha (`createdAt`) junto con el filtro de inquilino (`tenantId`).
          </p>
          {url ? (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-block', backgroundColor: '#ef4444', color: 'white', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}
            >
              Crear Índice Automáticamente en Firebase
            </a>
          ) : (
            <p style={{ fontFamily: 'monospace', backgroundColor: '#fecaca', padding: '12px', borderRadius: '4px' }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="slds-grid slds-grid_vertical slds-p-around_none slds-m-bottom_large">
      <div className="slds-page-header slds-page-header_record-home slds-m-bottom_medium" style={{ backgroundColor: '#ffffff', borderRadius: '4px', borderBottom: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-performance" style={{ backgroundColor: '#0B5CAB', padding: '0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                  <BarChart3 style={{ color: 'white' }} size={24} />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Explorador de Datos">Explorador de Datos</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Analíticas</p>
              </div>
            </div>
          </div>
          
          {/* Espacio reservado para Global Actions (Exportar, etc.) */}
          <div className="slds-page-header__col-actions"></div>
        </div>
        
        {/* SLDS Filter Bar / Secondary Row */}
        <div className="slds-page-header__row slds-page-header__row_details" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #DDDBDA' }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
            <div className="slds-select_container" style={{ flex: '1', minWidth: '200px' }}>
              <select value={reportType} onChange={handleReportTypeChange} className="slds-select" title="Tipo de Reporte">
                <option value="source">Fuentes de Adquisición</option>
                <option value="workload">Carga de Trabajo Activa</option>
                <option value="loss_reasons">Análisis de Ventas Perdidas</option>
                <option value="productivity">Métricas de Productividad</option>
              </select>
            </div>

            <div className="slds-select_container" style={{ flex: '1', minWidth: '150px' }}>
              <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="slds-select" title="Período">
                <option value="all">Histórico Total</option>
                <option value="this_month">Este mes</option>
                <option value="last_month">Mes pasado</option>
                <option value="last_6_months">Últimos 6 meses</option>
                <option value="this_year">Este año</option>
              </select>
            </div>

            <div className="slds-select_container" style={{ flex: '1', minWidth: '150px' }}>
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="slds-select" title="Asesor">
                <option value="all">Todos los asesores</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="slds-select_container" style={{ flex: '1', minWidth: '150px' }}>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="slds-select" title="Etapa">
                <option value="all">Todas las etapas</option>
                {dynamicStages.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
                <option value="PERDIDO">PERDIDO</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {((reportType !== 'productivity' && filteredLeads.length > 0) || (reportType === 'productivity' && filteredActivities.length > 0)) && (
        <div>
          {renderHighlights()}
        </div>
      )}

      {((reportType !== 'productivity' && filteredLeads.length === 0) || (reportType === 'productivity' && filteredActivities.length === 0)) ? (
        <div className={agentStyles.illustration}>
          <div className={agentStyles.illustrationIcon}>
            <Inbox size={48} color="var(--text-secondary)" />
          </div>
          <h3 className={agentStyles.illustrationTitle}>Sin Resultados</h3>
          <p className={agentStyles.illustrationText}>No encontramos datos que coincidan con los filtros seleccionados. Intenta ajustando el asesor, la etapa o el período para ver más información.</p>
        </div>
      ) : (
        <div className={agentStyles.scorecardLayout} style={{ alignItems: 'stretch' }}>
          <article className={agentStyles.sldsCard} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className={agentStyles.sldsCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={agentStyles.sldsCardTitle} style={{ margin: 0 }}>
                {reportType === 'source' ? 'Desglose por Canal de Origen' : 
                 reportType === 'workload' ? 'Desglose de Carga de Trabajo' :
                 reportType === 'loss_reasons' ? 'Desglose de Motivos de Pérdida' :
                 'Desglose de Actividades'}
              </h2>
              <button className={agentStyles.exportBtn} onClick={handleExportCSV}>
                <Download size={16} /> Exportar CSV
              </button>
            </div>
            <div style={{ flex: 1, padding: 0 }}>
              <div className={styles.tableContainer} style={{ margin: 0, height: '100%', borderBottom: '1px solid var(--border-color)' }}>
                {renderTable()}
              </div>
            </div>
            <footer className="slds-card__footer" style={{ borderTop: 'none', backgroundColor: '#fff', textAlign: 'center', padding: '12px' }}>
              <button 
                onClick={() => { setSelectedSubFilter(null); setIsListModalOpen(true); setCurrentPage(1); }}
                className="slds-button" style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <List size={14} />
                Ver Listado Detallado de Todos los Registros ({reportType === 'productivity' ? filteredActivities.length : filteredLeads.length})
              </button>
            </footer>
          </article>

          {renderChart()}
        </div>
      )}

      {isListModalOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px' }} 
          onClick={(e) => { if (e.target === e.currentTarget) setIsListModalOpen(false); }}
        >
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '1400px', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <header style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Listado Detallado {selectedSubFilter && `- ${reportType === 'workload' || reportType === 'productivity' ? getUserName(selectedSubFilter) : selectedSubFilter}`} ({totalItems})
              </h2>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                  <button className={agentStyles.exportBtn} onClick={handleExportCSV}>
                    <Download size={16} /> Exportar CSV
                  </button>
                )}
                <button 
                  onClick={() => setIsListModalOpen(false)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                  title="Cerrar"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </header>
            
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-surface)' }}>
              <table className="slds-table slds-table_cell-buffer slds-table_bordered" style={{ borderTop: 0 }}>
                <thead>
                  <tr className="slds-line-height_reset">
                    {reportType === 'productivity' ? (
                      <>
                        <th scope="col"><div className="slds-truncate">Fecha</div></th>
                        <th scope="col"><div className="slds-truncate">Asesor</div></th>
                        <th scope="col"><div className="slds-truncate">Actividad</div></th>
                        <th scope="col"><div className="slds-truncate">Lead</div></th>
                      </>
                    ) : (
                      <>
                        <th scope="col"><div className="slds-truncate">Nombre del Lead</div></th>
                        <th scope="col"><div className="slds-truncate">Asesor</div></th>
                        <th scope="col"><div className="slds-truncate">Etapa</div></th>
                        <th scope="col"><div className="slds-truncate">{reportType === 'source' ? 'Fuente' : reportType === 'loss_reasons' ? 'Motivo Pérdida' : 'Nivel de Interés'}</div></th>
                        <th scope="col"><div className="slds-truncate">Fecha</div></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportType === 'productivity' ? (
                    paginatedActivities.map(act => {
                      const dateObj = act.createdAt?.toDate ? act.createdAt.toDate() : new Date(act.createdAt || Date.now());
                      return (
                        <tr key={act.id} className="slds-hint-parent">
                          <td data-label="Fecha">{dateObj.toLocaleString()}</td>
                          <td data-label="Asesor">{getUserName(act.userId)}</td>
                          <td data-label="Actividad" style={{ textTransform: 'capitalize' }}>{act.type}</td>
                          <td data-label="Lead">{getLeadName(act.leadId)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    paginatedLeads.map(lead => {
                      const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                      return (
                        <tr key={lead.id} className="slds-hint-parent" onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }} style={{ cursor: 'pointer' }}>
                          <td data-label="Nombre del Lead" style={{ fontWeight: 500 }}>{lead.name}</td>
                          <td data-label="Asesor">{getUserName(lead.assignedTo)}</td>
                          <td data-label="Etapa">{lead.status?.replace(/_/g, ' ')}</td>
                          <td data-label={reportType === 'source' ? 'Fuente' : reportType === 'loss_reasons' ? 'Motivo Pérdida' : 'Nivel de Interés'}>
                            {reportType === 'source' ? (lead.source || 'Desconocido') : reportType === 'loss_reasons' ? (lead.lossReason || 'No especificado') : (lead.interestLevel || 'Medio')}
                          </td>
                          <td data-label="Fecha">{dateObj.toLocaleDateString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > ITEMS_PER_PAGE && (
              <div className={agentStyles.pagination}>
                <span className={agentStyles.pageInfo}>
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems}
                </span>
                
                <div className={agentStyles.pageJumper}>
                  Página 
                  <input 
                    type="number" 
                    min={1} 
                    max={totalPages} 
                    value={pageInputText} 
                    onChange={handlePageJumper}
                    onBlur={() => setPageInputText(currentPage.toString())}
                    className={agentStyles.pageInput}
                  />
                  de {totalPages}
                </div>

                <div className={agentStyles.pageButtons}>
                  <button 
                    className={agentStyles.pageBtn}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <button 
                    className={agentStyles.pageBtn}
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
