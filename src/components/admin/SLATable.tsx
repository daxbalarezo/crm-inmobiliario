import React from 'react';
import { Clock } from 'lucide-react';
import styles from '../../pages/AdminDashboard.module.css';
import type { AgentStats } from '../../hooks/useAdminMetrics';

interface SLATableProps {
  stats: AgentStats[];
}

export default function SLATable({ stats }: SLATableProps) {
  // Sort by average time to first contact, from fastest to slowest
  const sortedSLA = [...stats].sort((a, b) => {
    if (a.avgTTFC_hours === 0 && b.avgTTFC_hours === 0) return 0;
    if (a.avgTTFC_hours === 0) return 1;
    if (b.avgTTFC_hours === 0) return -1;
    return a.avgTTFC_hours - b.avgTTFC_hours;
  });

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Tiempos de Respuesta</h3>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Posición</th>
              <th className={styles.th}>Asesor</th>
              <th className={styles.th}>Tiempo 1er Contacto</th>
            </tr>
          </thead>
          <tbody>
            {sortedSLA.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No hay datos suficientes</td></tr>
            ) : sortedSLA.map((stat, i) => (
              <tr key={`sla-${stat.uid}`} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.rankBadge} style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                    {i + 1}
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.agentInfo}>
                    <div className={styles.agentAvatar}>{stat.name.substring(0, 2).toUpperCase()}</div>
                    <span className={styles.agentName}>{stat.name}</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color={stat.avgTTFC_hours > 24 ? '#ef4444' : stat.avgTTFC_hours > 2 ? '#f59e0b' : '#22c55e'} />
                    <span style={{ color: stat.avgTTFC_hours > 24 ? '#ef4444' : '#334155', fontWeight: 500 }}>
                      {stat.avgTTFC_hours === 0 ? 'Sin registros' : 
                        stat.avgTTFC_hours < 1 
                          ? `${Math.round(stat.avgTTFC_hours * 60)} min` 
                          : `${stat.avgTTFC_hours.toFixed(1)} h`}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
