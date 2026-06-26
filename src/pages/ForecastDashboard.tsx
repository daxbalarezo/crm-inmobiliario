import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useCommercialData } from '../hooks/useCommercialData';
import styles from './AgentAnalyticsDashboard.module.css'; // We can use the same clean grid container
import adminStyles from './AdminDashboard.module.css';

export default function ForecastDashboard() {
  const { userProfile, tenant } = useCRM();
  const { leads, loading, error } = useCommercialData();
  const [selectedAgent, setSelectedAgent] = useState('all');

  // Probability Mapping for Forecast
  const defaultProbabilities: Record<string, number> = {
    'PROSPECTO': 10,
    'SIN_CONTACTAR': 5,
    'EN_NEGOCIACION': 40,
    'VISITA': 60,
    'SEPARACION': 90,
    'VENDIDO': 100,
  };

  const getProbability = (stage: string) => defaultProbabilities[stage] || 0;

  const agents = useMemo(() => {
    if (!leads) return [];
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.assignedTo) set.add(l.assignedTo);
    });
    return Array.from(set);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const activeStatus = !['NO_INTERESADO', 'VENTA_CAIDA'].includes(l.status);
      const agentMatch = selectedAgent === 'all' || l.assignedTo === selectedAgent;
      return activeStatus && agentMatch;
    });
  }, [leads, selectedAgent]);

  const stats = useMemo(() => {
    let totalActivos = 0;
    let montoTotal = 0;
    let montoPonderado = 0;
    
    filteredLeads.forEach(l => {
      totalActivos++;
      // Calculate amount: if proforma exists, use it. Otherwise, $0
      let amount = 0;
      if (l.savedProforma?.finalPrice) {
        amount = l.savedProforma.finalPrice;
      }
      
      const probability = getProbability(l.status) / 100;
      montoTotal += amount;
      montoPonderado += (amount * probability);
    });

    return { totalActivos, montoTotal, montoPonderado };
  }, [filteredLeads]);

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={adminStyles.container}>
      <div className={adminStyles.pageHeader}>
        <div className={adminStyles.headerTopRow}>
          <div className={adminStyles.headerTitleBlock}>
            <div className={adminStyles.headerIcon} style={{ backgroundColor: '#0B5CAB' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className={adminStyles.headerTextGroup}>
              <p className={adminStyles.headerBreadcrumb}>Pipeline Global</p>
              <h2 className={adminStyles.title}>Previsión de Ventas</h2>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', padding: '12px 0 0 0', borderTop: '1px solid #DDDBDA', marginTop: '4px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div className={adminStyles.filterGroup} style={{ gap: '12px', flexWrap: 'wrap' }}>
            {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
              <select 
                className={adminStyles.timeFilter}
                style={{ minWidth: '180px' }}
                value={selectedAgent} 
                onChange={e => setSelectedAgent(e.target.value)}
              >
                <option value="all">Todos los Asesores</option>
                {agents.map(aId => <option key={aId} value={aId}>{aId}</option>)}
              </select>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={adminStyles.detailLabel} style={{ marginBottom: 0 }}>Total Pipeline</span>
              <span className={adminStyles.detailValueBrand} style={{ fontSize: '18px' }}>
                ${stats.montoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={adminStyles.detailLabel} style={{ marginBottom: 0 }}>Pipeline Ponderado</span>
              <span className={adminStyles.detailValueBrand} style={{ fontSize: '18px', color: '#54A77B' }}>
                ${stats.montoPonderado.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="slds-card slds-p-around_medium" style={{ backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <h3 className="slds-text-heading_small slds-m-bottom_medium" style={{ fontWeight: 600 }}>Detalle por Etapa</h3>
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr className="slds-line-height_reset">
              <th scope="col"><div className="slds-truncate">Etapa</div></th>
              <th scope="col"><div className="slds-truncate">Probabilidad</div></th>
              <th scope="col"><div className="slds-truncate">Oportunidades</div></th>
              <th scope="col"><div className="slds-truncate">Valor Total</div></th>
              <th scope="col"><div className="slds-truncate">Valor Ponderado</div></th>
            </tr>
          </thead>
          <tbody>
            {(tenant?.stages || Object.keys(defaultProbabilities)).map(stage => {
              const stageLeads = filteredLeads.filter(l => l.status === stage);
              const count = stageLeads.length;
              let total = 0;
              stageLeads.forEach(l => {
                total += l.savedProforma?.finalPrice || 0;
              });
              const probability = getProbability(stage);
              const weighted = total * (probability / 100);

              if (count === 0 && total === 0) return null;

              return (
                <tr key={stage}>
                  <td><div className="slds-truncate" style={{ fontWeight: 600 }}>{stage.replace(/_/g, ' ')}</div></td>
                  <td><div className="slds-truncate">{probability}%</div></td>
                  <td><div className="slds-truncate">{count}</div></td>
                  <td><div className="slds-truncate">${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div></td>
                  <td><div className="slds-truncate" style={{ color: '#54A77B', fontWeight: 500 }}>${weighted.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
