import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
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
    <>
      <div style={{ overflowX: 'auto', width: '100%' }}>
      <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped">
        <thead>
          <tr className="slds-line-height_reset">
            <th className="slds-text-title_caps" scope="col" style={{ width: '5rem' }}>
              <div className="slds-truncate" title="Posición">POSICIÓN</div>
            </th>
            <th className="slds-text-title_caps" scope="col">
              <div className="slds-truncate" title="Asesor">ASESOR</div>
            </th>
            <th className="slds-text-title_caps" scope="col">
              <div className="slds-truncate" title="Tiempo Promedio">TIEMPO PROMEDIO</div>
            </th>
            <th className="slds-text-title_caps" scope="col" style={{ width: '15rem' }}>
              <div className="slds-truncate" title="Cumplimiento SLA">CUMPLIMIENTO SLA</div>
            </th>
            <th className="slds-text-title_caps" scope="col">
              <div className="slds-truncate" title="Leads Olvidados">LEADS OLVIDADOS</div>
            </th>
            <th className="slds-text-title_caps" scope="col">
              <div className="slds-truncate" title="Peor Tiempo">PEOR TIEMPO</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSLA.length === 0 ? (
            <tr>
              <td colSpan={6} className="slds-text-align_center slds-p-around_medium">
                No hay datos suficientes
              </td>
            </tr>
          ) : sortedSLA.map((stat, i) => {
            const complianceRate = stat.totalContactedLeads > 0 ? (stat.slaCompliantLeads / stat.totalContactedLeads) * 100 : 0;
            const hasData = stat.totalContactedLeads > 0;
            
            return (
              <tr key={`sla-${stat.uid}`} className="slds-hint-parent">
                <td className="slds-text-color_weak">
                  {i + 1}
                </td>
                <td data-label="Asesor">
                  <div className="slds-truncate">
                    <Link to={`/analitica-agentes?agentId=${stat.uid}`} style={{ textTransform: 'capitalize' }}>
                      {stat.name.toLowerCase()}
                    </Link>
                  </div>
                </td>
                <td data-label="Tiempo Promedio">
                  <div className="slds-media slds-media_center">
                    <div className="slds-media__figure slds-m-right_x-small">
                      <Clock size={14} color={stat.avgTTFC_hours > (slaTargetHours * 2) ? '#ba0517' : stat.avgTTFC_hours > slaTargetHours ? '#dd7a01' : '#2e844a'} />
                    </div>
                    <div className="slds-media__body">
                      <span style={{ color: stat.avgTTFC_hours > (slaTargetHours * 2) ? '#ba0517' : '#080707', fontWeight: 500 }}>
                        {stat.avgTTFC_hours === 0 ? '-' : 
                          stat.avgTTFC_hours < 1 
                            ? `${Math.round(stat.avgTTFC_hours * 60)} min` 
                            : `${stat.avgTTFC_hours.toFixed(1)} h`}
                      </span>
                    </div>
                  </div>
                </td>
                <td 
                  data-label="Cumplimiento SLA"
                  style={{ cursor: hasData ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (hasData) {
                      setModalView('compliance');
                      setSelectedAgent(stat);
                    }
                  }}
                >
                  {hasData ? (
                    <div className="slds-grid slds-grid_vertical-align-center">
                      <div className="slds-progress-bar slds-progress-bar_circular slds-m-right_x-small" aria-valuemin={0} aria-valuemax={100} aria-valuenow={complianceRate} role="progressbar">
                        <span className={`slds-progress-bar__value ${complianceRate >= 80 ? 'slds-progress-bar__value_success' : complianceRate >= 50 ? 'slds-theme_warning' : 'slds-theme_error'}`} style={{ width: `${complianceRate}%` }}>
                          <span className="slds-assistive-text">Progress: {complianceRate}%</span>
                        </span>
                      </div>
                      <span style={{ fontWeight: 600, minWidth: '2.5rem', fontSize: '0.8125rem', color: '#080707' }}>
                        {complianceRate.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="slds-text-color_weak" style={{ fontSize: '0.8125rem' }}>N/A</span>
                  )}
                </td>
                <td 
                  data-label="Leads Olvidados"
                  style={{ cursor: stat.uncontactedLeads > 0 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (stat.uncontactedLeads > 0) {
                      setModalView('forgotten');
                      setSelectedAgent(stat);
                    }
                  }}
                >
                  {stat.uncontactedLeads > 0 ? (
                    <span className="slds-badge slds-theme_error" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <AlertTriangle size={12} />
                      {stat.uncontactedLeads} lead{stat.uncontactedLeads !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="slds-text-color_success" style={{ fontWeight: 600 }}>0</span>
                  )}
                </td>
                <td 
                  data-label="Peor Tiempo"
                  style={{ cursor: stat.worstLead ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (stat.worstLead) {
                      setModalView('worst');
                      setSelectedAgent(stat);
                    }
                  }}
                >
                  <span 
                    style={{ color: stat.worstLead ? '#0176d3' : '#706e6b', fontWeight: stat.worstLead ? 600 : 400, textDecoration: stat.worstLead ? 'underline' : 'none', textUnderlineOffset: '4px' }}
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
    </>
  );
}
