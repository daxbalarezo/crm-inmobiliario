import React from 'react';
import { Users, TrendingUp, Award, Activity } from 'lucide-react';
import styles from '../../pages/AdminDashboard.module.css';
import type { GlobalStats } from '../../hooks/useAdminMetrics';

interface AdminKPIsProps {
  globalStats: GlobalStats;
}

export default function AdminKPIs({ globalStats }: AdminKPIsProps) {
  return (
    <div className={styles.metricsGrid}>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Total Agentes</p>
          <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
            <Users size={20} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalAgents}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Ventas Cerradas</p>
          <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
            <TrendingUp size={20} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalClosed}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Total Separaciones</p>
          <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
            <Award size={20} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalReservations}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Conversión Global</p>
          <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
            <Activity size={20} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.avgConv.toFixed(1)}%</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Mejor Agente</p>
          <div className={`${styles.iconWrapper} ${styles.iconAmber}`}>
            <Award size={20} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.topAgent || 'N/A'}</p>
      </div>
    </div>
  );
}
