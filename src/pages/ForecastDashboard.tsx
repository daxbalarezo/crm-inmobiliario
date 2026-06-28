import { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useCommercialData } from '../hooks/useCommercialData';


export default function ForecastDashboard() {
  const { userProfile, tenant } = useCRM();
  const { leads, loading,  } = useCommercialData();
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
      <div className="">
        <div className=""></div>
      </div>
    );
  }

  return (
    <div className="slds-grid slds-grid_vertical slds-p-around_none">
      <div className="slds-page-header slds-page-header_record-home slds-m-bottom_medium" style={{ backgroundColor: '#ffffff', borderRadius: '4px', borderBottom: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-performance" style={{ backgroundColor: '#0B5CAB', padding: '0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Previsión de Ventas">Previsión de Ventas</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Pipeline Global</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="slds-page-header__row slds-page-header__row_details" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #DDDBDA' }}>
          
          <div className="slds-page-header__detail-row" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="slds-grid slds-gutters" style={{ gap: '12px', flexWrap: 'wrap' }}>
            {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                <div className="slds-select_container" style={{ width: 'fit-content' }}>
                  <select 
                    className="slds-select"
                    style={{ minWidth: '180px' }}
                    value={selectedAgent} 
                    onChange={e => setSelectedAgent(e.target.value)}
                  >
                    <option value="all">Todos los Asesores</option>
                    {agents.map(aId => <option key={aId} value={aId}>{aId}</option>)}
                  </select>
                </div>
              )}
            </div>
            
            <ul className="slds-page-header__detail-row" style={{ display: 'flex', gap: '2rem', margin: 0, padding: 0 }}>
              <li className="slds-page-header__detail-block">
                <div className="slds-text-title slds-truncate" title="Total Pipeline">Total Pipeline</div>
                <div className="slds-truncate">
                  <span className="slds-text-heading_small" style={{ fontWeight: 600, color: '#0B5CAB' }}>
                    ${stats.montoTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </li>
              <li className="slds-page-header__detail-block">
                <div className="slds-text-title slds-truncate" title="Pipeline Ponderado">Pipeline Ponderado</div>
                <div className="slds-truncate">
                  <span className="slds-text-heading_small" style={{ fontWeight: 600, color: '#54A77B' }}>
                    ${stats.montoPonderado.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </li>
            </ul>
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
            {((tenant?.pipeline_stages?.length ? tenant.pipeline_stages.map(s => s.name) : null) || (tenant?.stages?.length ? tenant.stages : null) || Object.keys(defaultProbabilities)).map(stage => {
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
