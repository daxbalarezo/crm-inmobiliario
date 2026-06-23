import React, { useState } from 'react';
import { useAgentAnalytics } from '../hooks/useAgentAnalytics';
import { useCRM } from '../context/CRMContext';
import styles from './AgentAnalyticsDashboard.module.css';
import { Users, TrendingUp, Award, Activity, BarChart3, Filter, Download, List } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';

const FUNNEL_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a', '#0f172a'];

export default function AgentAnalyticsDashboard() {
  const { tenant, userProfile } = useCRM();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [stageFilter, setStageFilter] = useState<string>('all');
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputText, setPageInputText] = useState("1");
  const ITEMS_PER_PAGE = 10;

  const { loading, stats, funnelData, filteredLeads, agentsList } = useAgentAnalytics(selectedAgent, timeRange, stageFilter);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setPageInputText("1");
  }, [selectedAgent, timeRange, stageFilter]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Update input text when page changes externally (like Next/Prev buttons)
  React.useEffect(() => {
    setPageInputText(currentPage.toString());
  }, [currentPage]);

  const handlePageJumper = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputText(e.target.value);
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      setCurrentPage(value);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nombre,Teléfono,Etapa,Nivel de Interés,Fecha de Ingreso,Origen'];
    const rows = filteredLeads.map(l => {
      const dateObj = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt || Date.now());
      return `"${l.name}","${l.phone}","${l.status}","${l.interestLevel || ''}","${dateObj.toLocaleDateString()}","${l.source || ''}"`;
    });
    const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prospectos_${selectedAgent}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dynamicStages = tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Reporte Detallado por Asesor</h2>
          <p className={styles.subtitle}>Métricas y rendimiento individual</p>
        </div>
        
        <div className={styles.filtersRow}>
          <select 
            value={selectedAgent} 
            onChange={e => setSelectedAgent(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Seleccione un asesor...</option>
            {agentsList.map(a => (
              <option key={a.uid} value={a.uid}>{a.name}</option>
            ))}
          </select>

          <select 
            value={timeRange} 
            onChange={e => setTimeRange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
            <option value="last_6_months">Últimos 6 meses</option>
            <option value="this_year">Este año</option>
            <option value="all">Histórico Total</option>
          </select>

          <select 
            value={stageFilter} 
            onChange={e => setStageFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Todas las etapas</option>
            {dynamicStages.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
            <option value="PERDIDO">PERDIDO</option>
          </select>
        </div>
      </div>

      {!selectedAgent ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Filter size={40} style={{ margin: '0 auto 16px auto', color: '#94a3b8' }} />
          <p>Selecciona un asesor en el menú superior para ver sus estadísticas.</p>
        </div>
      ) : loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando métricas del asesor...</div>
      ) : (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Total Asignados</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <Users size={16} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.totalAssigned}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Cierres / Ventas</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <Award size={16} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.totalClosed}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Conversión Personal</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <Activity size={16} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.avgConv.toFixed(1)}%</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Proyección de Ventas</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className={styles.metricValue}>S/ {stats.projectedRevenue.toLocaleString('en-PE')}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Volumen de Actividad</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <BarChart3 size={16} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.totalActivities}</p>
            </div>
          </div>

          <div className={styles.chartsContainer}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Embudo Personal del Agente</h3>
                <p className={styles.cardSubtitle}>Distribución de prospectos por etapa en el rango seleccionado</p>
              </div>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: number) => [value, 'Prospectos']}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <button className={styles.openModalBtn} onClick={() => setIsListModalOpen(true)}>
            <List size={20} />
            Ver Listado Detallado de Prospectos ({filteredLeads.length})
          </button>
        </>
      )}

      {isListModalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsListModalOpen(false); }}>
          <div className={styles.listModal}>
            <div className={styles.listModalHeader}>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>Listado de Prospectos ({filteredLeads.length})</h3>
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
                      <th className={styles.th}>Nombre del Lead</th>
                      <th className={styles.th}>Teléfono</th>
                      <th className={styles.th}>Etapa</th>
                      <th className={styles.th}>Nivel de Interés</th>
                      <th className={styles.th}>Fecha de Ingreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                          No hay prospectos que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      paginatedLeads.map(lead => {
                        const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
                        return (
                          <tr key={lead.id} className={styles.tr} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                            <td className={styles.td} style={{ fontWeight: 500 }}>{lead.name}</td>
                            <td className={styles.td}>{lead.phone}</td>
                            <td className={styles.td}>{lead.status?.replace(/_/g, ' ')}</td>
                            <td className={styles.td}>
                              <span className={`${styles.badge} ${styles['badge' + (lead.interestLevel || 'Medio')]}`}>
                                {lead.interestLevel || 'Medio'}
                              </span>
                            </td>
                            <td className={styles.td}>{dateObj.toLocaleDateString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredLeads.length > ITEMS_PER_PAGE && (
                <div className={styles.pagination}>
                  <span className={styles.pageInfo}>
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
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
