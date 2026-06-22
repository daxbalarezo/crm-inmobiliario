import React, { useState } from 'react';
import { useAgentAnalytics } from '../hooks/useAgentAnalytics';
import { useCRM } from '../context/CRMContext';
import styles from './AgentAnalyticsDashboard.module.css';
import { Users, TrendingUp, Award, Activity, BarChart3, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';

const FUNNEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#059669'];

export default function AgentAnalyticsDashboard() {
  const { tenant } = useCRM();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [stageFilter, setStageFilter] = useState<string>('all');
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const { loading, stats, funnelData, filteredLeads, agentsList } = useAgentAnalytics(selectedAgent, timeRange, stageFilter);

  const dynamicStages = tenant?.stages || ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO', 'CERRADO'];

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
                  <Users size={20} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.totalAssigned}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Cierres / Ventas</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <Award size={20} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.totalClosed}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Conversión Personal</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <Activity size={20} />
                </div>
              </div>
              <p className={styles.metricValue}>{stats.avgConv.toFixed(1)}%</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Proyección de Ventas</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className={styles.metricValue}>S/ {stats.projectedRevenue.toLocaleString('en-PE')}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <p className={styles.metricLabel}>Volumen de Actividad</p>
                <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
                  <BarChart3 size={20} />
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

          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.cardTitle}>Listado de Prospectos ({filteredLeads.length})</h3>
            </div>
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
                    filteredLeads.map(lead => {
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
