import React, { useState } from 'react';
import { useAgentAnalytics } from '../hooks/useAgentAnalytics';
import { useCRM } from '../context/CRMContext';
import styles from './AgentAnalyticsDashboard.module.css';
import { Users, TrendingUp, Award, Activity, BarChart3, Filter, Download, List } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';

const SLDS_CATEGORICAL_COLORS = ['#52B7D8', '#E16032', '#FFB03B', '#54A77B', '#4FD2D2', '#E287B2', '#0176D3', '#0B5CAB'];

export default function AgentAnalyticsDashboard() {
  const { tenant, userProfile } = useCRM();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [stageFilter, setStageFilter] = useState<string>('all');
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

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
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleRow}>
          <div className={styles.headerIcon}>
            <Activity size={24} />
          </div>
          <div className={styles.headerTextGroup}>
            <p className={styles.superTitle}>Analíticas</p>
            <h2 className={styles.mainTitle}>Reporte Detallado por Asesor</h2>
          </div>
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
        <div className={styles.illustration}>
          <div className={styles.illustrationIcon}>
            <Users size={48} color="var(--text-secondary)" />
          </div>
          <h3 className={styles.illustrationTitle}>Ningún Asesor Seleccionado</h3>
          <p className={styles.illustrationText}>Selecciona un miembro del equipo en la parte superior para cargar sus métricas de rendimiento y visualizar su embudo de ventas actual.</p>
        </div>
      ) : loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando métricas del asesor...</div>
      ) : (
        <>
          <div className={styles.highlightsPanel}>
            <div className={styles.highlightItem}>
              <p className={styles.highlightLabel}>Total Asignados</p>
              <p className={styles.highlightValue}>{stats.totalAssigned}</p>
            </div>
            <div className={styles.highlightItem}>
              <p className={styles.highlightLabel}>Cierres / Ventas</p>
              <p className={styles.highlightValue}>{stats.totalClosed}</p>
            </div>
            <div className={styles.highlightItem}>
              <p className={styles.highlightLabel}>Conversión Personal</p>
              <p className={styles.highlightValue}>{stats.avgConv.toFixed(1)}%</p>
            </div>
            <div className={styles.highlightItem}>
              <p className={styles.highlightLabel}>Proyección de Ventas</p>
              <p className={styles.highlightValue}>S/ {stats.projectedRevenue.toLocaleString('en-PE')}</p>
            </div>
            <div className={styles.highlightItem}>
              <p className={styles.highlightLabel}>Volumen de Actividad</p>
              <p className={styles.highlightValue}>{stats.totalActivities}</p>
            </div>
          </div>

          <div className={styles.scorecardLayout}>
            {/* LEFT COLUMN: Lead List (Pipeline Activo) */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.sldsCardTitle}>Pipeline Activo del Agente ({filteredLeads.length})</h3>
                  <p className={styles.sldsCardSubtitle}>Listado detallado de prospectos asignados</p>
                </div>
                {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                  <button className={styles.exportBtn} onClick={handleExportCSV}>
                    <Download size={16} /> Exportar CSV
                  </button>
                )}
              </div>
              <div className={styles.tableContainer}>
                <table className="slds-table slds-table_cell-buffer slds-table_bordered" style={{ borderTop: 0 }}>
                  <thead>
                    <tr className="slds-line-height_reset">
                      <th scope="col"><div className="slds-truncate" title="Nombre del Lead">Nombre del Lead</div></th>
                      <th scope="col"><div className="slds-truncate" title="Teléfono">Teléfono</div></th>
                      <th scope="col"><div className="slds-truncate" title="Etapa">Etapa</div></th>
                      <th scope="col"><div className="slds-truncate" title="Interés">Interés</div></th>
                      <th scope="col"><div className="slds-truncate" title="Ingreso">Ingreso</div></th>
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
                          <tr key={lead.id} className="slds-hint-parent" style={{ cursor: 'pointer' }} onClick={() => { setSelectedLead(lead); setIsLeadModalOpen(true); }}>
                            <td data-label="Nombre del Lead" style={{ fontWeight: 500 }}>{lead.name}</td>
                            <td data-label="Teléfono">{lead.phone}</td>
                            <td data-label="Etapa">{lead.status?.replace(/_/g, ' ')}</td>
                            <td data-label="Interés">
                              <span className={`${styles.badge} ${styles['badge' + (lead.interestLevel || 'Medio')]}`}>
                                {lead.interestLevel || 'Medio'}
                              </span>
                            </td>
                            <td data-label="Ingreso">{dateObj.toLocaleDateString()}</td>
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

            {/* RIGHT COLUMN: Funnel & Insights */}
            <div className={styles.sldsCard}>
              <div className={styles.sldsCardHeader}>
                <h3 className={styles.sldsCardTitle}>Conversión y Embudo</h3>
                <p className={styles.sldsCardSubtitle}>Distribución por etapa</p>
              </div>
              <div className={styles.sldsCardBody}>
                <div className={styles.chartWrapper} style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                      <RechartsTooltip 
                        formatter={(value: number) => [value, 'Prospectos']}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SLDS_CATEGORICAL_COLORS[index % SLDS_CATEGORICAL_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
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
