import React from 'react';
import { Users, TrendingUp, Award, Activity, Star } from 'lucide-react';
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
          <p className={styles.metricLabel}>Total Leads</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <Users size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalLeads}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Proyección de Ventas</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <TrendingUp size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>S/ {globalStats.projectedRevenue.toLocaleString('en-PE')}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Total Agentes</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <Users size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalAgents}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Ventas Cerradas</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <TrendingUp size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalClosed}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Total Separaciones</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <Award size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.totalReservations}</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Conversión Global</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <Activity size={16} />
          </div>
        </div>
        <p className={styles.metricValue}>{globalStats.avgConv.toFixed(1)}%</p>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <p className={styles.metricLabel}>Mejor Agente</p>
          <div className={`${styles.iconWrapper} ${styles.iconCorporate}`}>
            <Award size={16} />
          </div>
        </div>
        
        {globalStats.topAgent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
              {globalStats.topAgent.name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                {globalStats.topAgent.name.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ')}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {globalStats.topAgent.sales} ventas ({globalStats.topAgent.conv.toFixed(1)}%)
              </span>
            </div>
          </div>
        ) : (
          <p className={styles.metricValue} style={{ fontSize: '18px' }}>N/A</p>
        )}
      </div>
    </div>
  );
}
