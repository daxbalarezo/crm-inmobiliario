import React from 'react';
import { Users, TrendingUp, Award, Activity, Star } from 'lucide-react';
import styles from '../../pages/AdminDashboard.module.css';
import type { GlobalStats } from '../../hooks/useAdminMetrics';

interface AdminKPIsProps {
  globalStats: GlobalStats;
}

export default function AdminKPIs({ globalStats }: AdminKPIsProps) {
  const formatName = (name: string) => {
    if (!name) return '';
    const first = name.split(' ')[0].toLowerCase();
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  return (
    <div className={styles.headerDetailRow}>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Total Leads</p>
        <p className={styles.detailValue}>{globalStats.totalLeads}</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Proyección de Ventas</p>
        <p className={styles.detailValue}>S/ {globalStats.projectedRevenue.toLocaleString('en-PE')}</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Total Agentes</p>
        <p className={styles.detailValue}>{globalStats.totalAgents}</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Ventas Cerradas</p>
        <p className={styles.detailValue}>{globalStats.totalClosed}</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Total Separaciones</p>
        <p className={styles.detailValue}>{globalStats.totalReservations}</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Conversión Global</p>
        <p className={styles.detailValue}>{globalStats.avgConv.toFixed(1)}%</p>
      </div>
      <div className={styles.detailItem}>
        <p className={styles.detailLabel}>Mejor Agente</p>
        <p className={styles.detailValue}>
          {globalStats.topAgent ? formatName(globalStats.topAgent.name) : 'N/A'}
        </p>
        {globalStats.topAgent && (
          <span className={styles.detailSubtext}>
            {globalStats.topAgent.sales} ventas
          </span>
        )}
      </div>
    </div>
  );
}
