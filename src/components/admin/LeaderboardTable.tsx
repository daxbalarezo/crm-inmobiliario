import React, { useState } from 'react';
import styles from '../../pages/AdminDashboard.module.css';
import type { AgentStats } from '../../hooks/useAdminMetrics';

interface LeaderboardTableProps {
  stats: AgentStats[];
}

type SortCriteria = 'conversion' | 'closures' | 'volume';

export default function LeaderboardTable({ stats }: LeaderboardTableProps) {
  const [sortBy, setSortBy] = useState<SortCriteria>('conversion');

  const sortedStats = [...stats].sort((a, b) => {
    if (sortBy === 'conversion') return b.conversionRate - a.conversionRate;
    if (sortBy === 'closures') return b.closedLeads - a.closedLeads;
    if (sortBy === 'volume') return b.totalVolume - a.totalVolume;
    return 0;
  });

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className={styles.panelTitle}>Rendimiento por Asesor</h3>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value as SortCriteria)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
        >
          <option value="conversion">Ordenar por % Conversión</option>
          <option value="closures">Ordenar por Cierres Totales</option>
          <option value="volume">Ordenar por Monto Vendido (S/)</option>
        </select>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Posición</th>
              <th className={styles.th}>Asesor</th>
              <th className={styles.th}>Leads Asignados</th>
              <th className={styles.th}>Separaciones</th>
              <th className={styles.th}>Cierres</th>
              <th className={styles.th}>Monto Vendido</th>
              <th className={styles.th}>Conversión</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No hay datos suficientes</td></tr>
            ) : sortedStats.map((stat, i) => (
              <tr key={`lb-${stat.uid}`} className={styles.tr}>
                <td className={styles.td}>
                  <div style={{ color: '#64748b', fontWeight: 600, fontSize: '14px' }}>
                    #{i + 1}
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.agentInfo}>
                    <div className={styles.agentAvatar}>{stat.name.substring(0, 2).toUpperCase()}</div>
                    <span className={styles.agentName} style={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                      {stat.name.toLowerCase()}
                    </span>
                  </div>
                </td>
                <td className={styles.td}>{stat.totalLeads}</td>
                <td className={styles.td}>{stat.reservations}</td>
                <td className={styles.td}>
                  <span style={{ fontWeight: sortBy === 'closures' ? 600 : 500 }}>{stat.closedLeads}</span>
                </td>
                <td className={styles.td}>
                  <span style={{ fontWeight: sortBy === 'volume' ? 600 : 500, color: stat.totalVolume > 0 ? '#059669' : 'inherit' }}>
                    S/ {stat.totalVolume.toLocaleString('en-PE')}
                  </span>
                </td>
                <td className={styles.td}>
                  <span style={{ fontWeight: sortBy === 'conversion' ? 600 : 500, color: stat.conversionRate > 10 ? '#16a34a' : '#475569' }}>
                    {stat.conversionRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
