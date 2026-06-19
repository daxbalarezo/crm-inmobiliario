import React from 'react';
import { useCRM } from '../context/CRMContext';
import styles from './AdminDashboard.module.css';
import { Users, TrendingUp, Award, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile } = useCRM();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Rendimiento del Equipo
          </h2>
          <p className={styles.subtitle}>Vista global para Administradores</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Total Agentes</p>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <Users size={20} />
            </div>
          </div>
          <p className={styles.metricValue}>5</p>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Cierres del Mes</p>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <p className={styles.metricValue}>12</p>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Tasa de Conversión</p>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
              <Activity size={20} />
            </div>
          </div>
          <p className={styles.metricValue}>8.5%</p>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Mejor Agente</p>
            <div className={`${styles.iconWrapper} ${styles.iconAmber}`}>
              <Award size={20} />
            </div>
          </div>
          <p className={styles.metricValue}>Ana López</p>
        </div>
      </div>

      <div className={styles.leaderboardSection}>
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Leaderboard de Ventas</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Posición</th>
                  <th className={styles.th}>Agente</th>
                  <th className={styles.th}>Nuevos Leads</th>
                  <th className={styles.th}>Citas Activas</th>
                  <th className={styles.th}>Cierres</th>
                  <th className={styles.th}>Tasa de Conv.</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={`${styles.rankBadge} ${styles.rank1}`}>1</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar}>AL</div>
                      <span className={styles.agentName}>Ana López</span>
                    </div>
                  </td>
                  <td className={styles.td}>45</td>
                  <td className={styles.td}>8</td>
                  <td className={styles.td}>5</td>
                  <td className={styles.td}>11.1%</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={`${styles.rankBadge} ${styles.rank2}`}>2</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar}>CM</div>
                      <span className={styles.agentName}>Carlos Mendoza</span>
                    </div>
                  </td>
                  <td className={styles.td}>38</td>
                  <td className={styles.td}>6</td>
                  <td className={styles.td}>4</td>
                  <td className={styles.td}>10.5%</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={`${styles.rankBadge} ${styles.rank3}`}>3</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar}>LR</div>
                      <span className={styles.agentName}>Laura Ruiz</span>
                    </div>
                  </td>
                  <td className={styles.td}>42</td>
                  <td className={styles.td}>5</td>
                  <td className={styles.td}>3</td>
                  <td className={styles.td}>7.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
