import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgentStats } from '../../hooks/useAdminMetrics';

interface LeaderboardTableProps {
  stats: AgentStats[];
}

type SortColumn = 'totalLeads' | 'reservations' | 'closedLeads' | 'totalVolume' | 'conversionRate';

export default function LeaderboardTable({ stats }: LeaderboardTableProps) {
  const [sortCol, setSortCol] = useState<SortColumn>('closedLeads');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  const handleSort = (column: SortColumn, e: React.MouseEvent) => {
    e.preventDefault();
    if (sortCol === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(column);
      setSortDesc(true);
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    const valA = a[sortCol];
    const valB = b[sortCol];
    return sortDesc ? valB - valA : valA - valB;
  });

  const SortIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ width: '16px', height: '16px', minWidth: '16px', marginLeft: '4px', flexShrink: 0 }}>
      <path d="M4 10l8-8 8 8M4 14l8 8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const renderSortableHeader = (column: SortColumn, title: string) => {
    const isSorted = sortCol === column;
    const ariaSort = isSorted ? (sortDesc ? 'descending' : 'ascending') : 'none';

    return (
      <th aria-sort={ariaSort} className={`slds-is-sortable slds-text-title_caps ${isSorted ? 'slds-has-focus' : ''}`} scope="col">
        <a href="#" className="slds-th__action slds-text-link_reset" role="button" onClick={(e) => handleSort(column, e)}>
          <span className="slds-assistive-text">Ordenar por: </span>
          <span className="slds-truncate" title={title}>{title}</span>
          {isSorted && (
            <div className="slds-icon_container slds-m-left_x-small">
              <SortIcon />
            </div>
          )}
        </a>
      </th>
    );
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped">
        <thead>
          <tr className="slds-line-height_reset">
            <th className="slds-text-title_caps" scope="col" style={{ width: '3.25rem' }}>
              <div className="slds-truncate" title="#">#</div>
            </th>
            <th className="slds-text-title_caps" scope="col">
              <div className="slds-truncate" title="Asesor">ASESOR</div>
            </th>
            {renderSortableHeader('totalLeads', 'ASIGNADOS')}
            {renderSortableHeader('closedLeads', 'CIERRES')}
            {renderSortableHeader('totalVolume', 'MONTO VENDIDO')}
            {renderSortableHeader('conversionRate', 'CONVERSIÓN')}
          </tr>
        </thead>
        <tbody>
          {sortedStats.length === 0 ? (
            <tr>
              <td colSpan={6} className="slds-text-align_center slds-p-around_medium">
                No hay datos suficientes
              </td>
            </tr>
          ) : sortedStats.map((stat, i) => (
            <tr key={`lb-${stat.uid}`} className="slds-hint-parent">
              <td className="slds-text-color_weak">{i + 1}</td>
              <td data-label="Asesor">
                <div className="slds-truncate">
                  <Link to={`/analitica-agentes?agentId=${stat.uid}`} style={{ textTransform: 'capitalize' }}>
                    {stat.name.toLowerCase()}
                  </Link>
                </div>
              </td>
              <td data-label="Asignados">
                <div className="slds-truncate" title={stat.totalLeads.toString()}>{stat.totalLeads}</div>
              </td>
              <td data-label="Cierres">
                <Link to={`/seguimientos?agentId=${stat.uid}&stage=Cierre`} className="slds-text-link">
                  {stat.closedLeads}
                </Link>
              </td>
              <td data-label="Monto Vendido">
                <div className="slds-truncate" title={`S/ ${stat.totalVolume.toLocaleString('en-PE')}`}>
                  S/ {stat.totalVolume.toLocaleString('en-PE')}
                </div>
              </td>
              <td data-label="Conversión">
                <div className="slds-truncate" title={`${stat.conversionRate.toFixed(1)}%`}>
                  {stat.conversionRate.toFixed(1)}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
