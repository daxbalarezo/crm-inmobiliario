import React, { useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import styles from '../../pages/AdminDashboard.module.css';
import { useCRM } from '../../context/CRMContext';
import type { AgentStats } from '../../hooks/useAdminMetrics';
import SLAModal from './SLAModal';

interface SLATableProps {
  stats: AgentStats[];
}

export default function SLATable({ stats }: SLATableProps) {
  const { tenant } = useCRM();
  const slaTargetHours = tenant?.slaTargetHours || 2;

  const [modalView, setModalView] = useState<'compliance' | 'forgotten' | 'worst' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentStats | null>(null);

  // Sort by SLA Compliance Rate (highest first)
  const sortedSLA = [...stats].sort((a, b) => {
    const rateA = a.totalContactedLeads ? (a.slaCompliantLeads / a.totalContactedLeads) : 0;
    const rateB = b.totalContactedLeads ? (b.slaCompliantLeads / b.totalContactedLeads) : 0;
    return rateB - rateA;
  });

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Tiempos de Respuesta</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
          Meta SLA: {slaTargetHours} hora{slaTargetHours !== 1 ? 's' : ''}
        </p>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Posición</th>
              <th className={styles.th}>Asesor</th>
              <th className={styles.th}>Tiempo Promedio</th>
              <th className={styles.th}>Cumplimiento SLA</th>
              <th className={styles.th}>Leads Olvidados</th>
              <th className={styles.th}>Peor Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {sortedSLA.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No hay datos suficientes</td></tr>
            ) : sortedSLA.map((stat, i) => {
              const complianceRate = stat.totalContactedLeads > 0 ? (stat.slaCompliantLeads / stat.totalContactedLeads) * 100 : 0;
              const hasData = stat.totalContactedLeads > 0;
              
              return (
                <tr key={`sla-${stat.uid}`} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.rankBadge} style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {i + 1}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar}>{stat.name.substring(0, 2).toUpperCase()}</div>
                      <span className={styles.agentName} style={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: 600, color: '#334155' }}>{stat.name.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} color={stat.avgTTFC_hours > (slaTargetHours * 2) ? '#ef4444' : stat.avgTTFC_hours > slaTargetHours ? '#f59e0b' : '#22c55e'} />
                      <span style={{ color: stat.avgTTFC_hours > (slaTargetHours * 2) ? '#ef4444' : '#334155', fontWeight: 500 }}>
                        {stat.avgTTFC_hours === 0 ? '-' : 
                          stat.avgTTFC_hours < 1 
                            ? `${Math.round(stat.avgTTFC_hours * 60)} min` 
                            : `${stat.avgTTFC_hours.toFixed(1)} h`}
                      </span>
                    </div>
                  </td>
                  <td 
                    className={styles.td} 
                    style={{ cursor: hasData ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (hasData) {
                        setModalView('compliance');
                        setSelectedAgent(stat);
                      }
                    }}
                  >
                    {hasData ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${complianceRate}%`, 
                            backgroundColor: complianceRate >= 80 ? '#22c55e' : complianceRate >= 50 ? '#f59e0b' : '#ef4444',
                            height: '100%'
                          }}></div>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', minWidth: '45px', color: '#0f172a' }}>
                          {complianceRate.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>N/A</span>
                    )}
                  </td>
                  <td 
                    className={styles.td}
                    style={{ cursor: stat.uncontactedLeads > 0 ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (stat.uncontactedLeads > 0) {
                        setModalView('forgotten');
                        setSelectedAgent(stat);
                      }
                    }}
                  >
                    {stat.uncontactedLeads > 0 ? (
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 600, fontSize: '13px', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px', width: 'fit-content', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'} 
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      >
                        <AlertTriangle size={14} />
                        {stat.uncontactedLeads} lead{stat.uncontactedLeads !== 1 ? 's' : ''}
                      </div>
                    ) : (
                      <span style={{ color: '#22c55e', fontWeight: 500, fontSize: '13px' }}>0</span>
                    )}
                  </td>
                  <td 
                    className={styles.td}
                    style={{ cursor: stat.worstLead ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (stat.worstLead) {
                        setModalView('worst');
                        setSelectedAgent(stat);
                      }
                    }}
                  >
                    <span 
                      style={{ color: stat.worstLead ? '#0f172a' : '#64748b', fontSize: '13px', fontWeight: stat.worstLead ? 500 : 400, textDecoration: stat.worstLead ? 'underline' : 'none', textUnderlineOffset: '4px' }}
                      onMouseEnter={e => stat.worstLead && (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => stat.worstLead && (e.currentTarget.style.color = '#0f172a')}
                    >
                      {stat.maxTTFC_hours === 0 ? '-' :
                       stat.maxTTFC_hours < 1 
                       ? `${Math.round(stat.maxTTFC_hours * 60)} min` 
                       : `${Math.round(stat.maxTTFC_hours)} h`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalView && selectedAgent && (
        <SLAModal 
          viewType={modalView} 
          agent={selectedAgent} 
          slaTargetHours={slaTargetHours} 
          onClose={() => {
            setModalView(null);
            setSelectedAgent(null);
          }} 
        />
      )}
    </div>
  );
}
