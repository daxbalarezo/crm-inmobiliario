import React, { useState } from 'react';
import styles from './AdminDashboard.module.css';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import AdminKPIs from '../components/admin/AdminKPIs';
import AdminCharts from '../components/admin/AdminCharts';

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const { loading, globalStats, funnelData, sourceData, workloadData, lossReasonData, activityData } = useAdminMetrics(timeRange);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando métricas...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.headerTitleBlock}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <div className={styles.headerTextGroup}>
              <p className={styles.headerBreadcrumb}>Analíticas</p>
              <h2 className={styles.title}>Visión General</h2>
            </div>
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
        
        <AdminKPIs globalStats={globalStats} />
      </div>

      <div className={styles.tabContent}>
        <AdminCharts 
          funnelData={funnelData} 
          sourceData={sourceData} 
          workloadData={workloadData} 
          lossReasonData={lossReasonData}
          activityData={activityData}
        />
      </div>
    </div>
  );
}
