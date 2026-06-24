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

  const handleSort = (column: SortColumn) => {
    if (sortCol === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(column);
      setSortDesc(true); // Default to desc on new column
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    const valA = a[sortCol];
    const valB = b[sortCol];
    return sortDesc ? valB - valA : valA - valB;
  });

  const renderSortArrow = (col: SortColumn) => {
    if (sortCol !== col) return null;
    return sortDesc ? ' ▼' : ' ▲';
  };

  return (
    <div className="slds-card" style={{ border: '1px solid #c9c9c9', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div className="slds-card__header slds-grid" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #c9c9c9' }}>
        <header className="slds-media slds-media_center slds-has-flexi-truncate">
          <div className="slds-media__body">
            <h2 className="slds-card__header-title">
              <span className="slds-text-heading_small" style={{ fontWeight: 700 }}>Rendimiento por Asesor</span>
            </h2>
          </div>
        </header>
      </div>
      
      <div className="slds-card__body slds-card__body_inner" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_sortable" style={{ borderTop: 0 }}>
            <thead>
              <tr className="slds-line-height_reset">
                <th scope="col" style={{ width: '3rem' }}>#</th>
                <th scope="col">
                  <div className="slds-truncate" title="Asesor">Asesor</div>
                </th>
                <th scope="col" aria-sort={sortCol === 'totalLeads' ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
                  <button className="slds-th__action slds-text-link_reset" onClick={() => handleSort('totalLeads')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="slds-truncate" title="Asignados">Asignados {renderSortArrow('totalLeads')}</span>
                  </button>
                </th>
                <th scope="col" aria-sort={sortCol === 'closedLeads' ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
                  <button className="slds-th__action slds-text-link_reset" onClick={() => handleSort('closedLeads')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="slds-truncate" title="Cierres">Cierres {renderSortArrow('closedLeads')}</span>
                  </button>
                </th>
                <th scope="col" aria-sort={sortCol === 'totalVolume' ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
                  <button className="slds-th__action slds-text-link_reset" onClick={() => handleSort('totalVolume')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="slds-truncate" title="Monto Vendido">Monto Vendido {renderSortArrow('totalVolume')}</span>
                  </button>
                </th>
                <th scope="col" aria-sort={sortCol === 'conversionRate' ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
                  <button className="slds-th__action slds-text-link_reset" onClick={() => handleSort('conversionRate')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="slds-truncate" title="Conversión">Conversión {renderSortArrow('conversionRate')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#706e6b' }}>
                    No hay datos suficientes
                  </td>
                </tr>
              ) : sortedStats.map((stat, i) => (
                <tr key={`lb-${stat.uid}`} className="slds-hint-parent">
                  <td style={{ color: '#706e6b' }}>{i + 1}</td>
                  <td data-label="Asesor">
                    <Link to={`/analitica-agentes?agentId=${stat.uid}`} style={{ color: '#0176d3', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      {stat.name}
                    </Link>
                  </td>
                  <td data-label="Asignados">{stat.totalLeads}</td>
                  <td data-label="Cierres">
                    <Link to={`/seguimientos?agentId=${stat.uid}&stage=Cierre`} style={{ color: '#0176d3', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      {stat.closedLeads}
                    </Link>
                  </td>
                  <td data-label="Monto Vendido">S/ {stat.totalVolume.toLocaleString('en-PE')}</td>
                  <td data-label="Conversión">{stat.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
