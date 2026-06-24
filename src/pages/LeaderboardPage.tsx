import React, { useState } from 'react';
import styles from './AdminDashboard.module.css';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import LeaderboardTable from '../components/admin/LeaderboardTable';
import SLATable from '../components/admin/SLATable';

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const { loading, stats } = useAdminMetrics(timeRange);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando métricas...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Rendimiento y Tiempos de Respuesta (SLA)</h2>
          <p className={styles.subtitle}>Clasificación de asesores y agilidad en el primer contacto</p>
        </div>
        
        <div className={styles.filterGroup}>
          <select 
            value={timeRange} 
            onChange={e => setTimeRange(e.target.value)}
            className={styles.timeFilter}
          >
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
            <option value="last_6_months">Últimos 6 meses</option>
            <option value="this_year">Este año</option>
            <option value="all">Histórico Total</option>
          </select>
        </div>
      </div>

      <div className={styles.tabContent} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <LeaderboardTable stats={stats} />
        <SLATable stats={stats} />
      </div>
    </div>
  );
}
