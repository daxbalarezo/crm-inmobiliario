import React from 'react';
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
    <ul className="slds-page-header__detail-row" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Total Leads">Total Leads</div>
        <div className="slds-truncate" title={globalStats.totalLeads.toString()}>{globalStats.totalLeads}</div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Proyección de Ventas">Proyección de Ventas</div>
        <div className="slds-truncate" title={`S/ ${globalStats.projectedRevenue.toLocaleString('en-PE')}`}>
          S/ {globalStats.projectedRevenue.toLocaleString('en-PE')}
        </div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Total Agentes">Total Agentes</div>
        <div className="slds-truncate" title={globalStats.totalAgents.toString()}>{globalStats.totalAgents}</div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Ventas Cerradas">Ventas Cerradas</div>
        <div className="slds-truncate" title={globalStats.totalClosed.toString()}>{globalStats.totalClosed}</div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Volumen de Ventas">Volumen de Ventas</div>
        <div className="slds-truncate" title={`S/ ${(globalStats.actualRevenue || 0).toLocaleString('en-PE')}`}>
          S/ {(globalStats.actualRevenue || 0).toLocaleString('en-PE')}
        </div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Total Separaciones">Total Separaciones</div>
        <div className="slds-truncate" title={globalStats.totalReservations.toString()}>{globalStats.totalReservations}</div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Conversión Global">Conversión Global</div>
        <div className="slds-truncate" title={`${globalStats.avgConv.toFixed(1)}%`}>{globalStats.avgConv.toFixed(1)}%</div>
      </li>
      <li className="slds-page-header__detail-block">
        <div className="slds-text-title slds-truncate" title="Mejor Agente">Mejor Agente</div>
        <div className="slds-truncate">
          {globalStats.topAgent ? formatName(globalStats.topAgent.name) : 'N/A'}
          {globalStats.topAgent && (
            <span className="slds-text-body_small slds-text-color_weak slds-m-left_xx-small">
              ({globalStats.topAgent.sales} ventas)
            </span>
          )}
        </div>
      </li>
    </ul>
  );
}
