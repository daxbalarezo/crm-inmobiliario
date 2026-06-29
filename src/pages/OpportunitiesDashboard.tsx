import React, { useState, useMemo } from 'react';
import { Plus, Search, DollarSign } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useOpportunities } from '../hooks/useOpportunities';
import { useCRM } from '../context/CRMContext';
import OpportunitiesKanbanBoard from '../components/OpportunitiesKanbanBoard';
import type { Opportunity } from '../types/definitions';

const defaultProbabilities: Record<string, number> = {
  'NUEVO': 10,
  'CONTACTADO': 20,
  'EN_NEGOCIACION': 40,
  'VISITA': 60,
  'SEPARACION': 90,
  'VENDIDO': 100,
};

export default function OpportunitiesDashboard() {
  const { opportunities, loading, updateOpportunityOptimistically } = useOpportunities();
  const { tenantId, activeProjectId, userProfile, tenant } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'manager') {
      supabase.from('users').select('uid, name, role').eq('tenant_id', tenantId).then(async ({ data }) => {
        if (data) {
          const { data: rolesData } = await supabase.from('roles').select('id, base_role').eq('tenant_id', tenantId);
          const agentRoleIds = (rolesData || []).filter(r => r.base_role === 'agent').map(r => r.id);
          const asesores = data.filter(d => agentRoleIds.includes(d.role));
          setAgents(asesores.map(d => ({ id: d.uid, name: d.name })));
        }
      });
    }
  }, [tenantId, userProfile?.role]);

  const getProbability = (stageName: string) => {
    if (tenant?.pipeline_stages) {
      const stage = tenant.pipeline_stages.find(s => s.name === stageName);
      if (stage) return stage.probability;
    }
    return defaultProbabilities[stageName] || 10;
  };

  const filteredOpps = useMemo(() => {
    if (!opportunities) return [];
    
    return opportunities.filter(o => {
      const matchesSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAgent = selectedAgentId === 'all' || o.assignedTo === selectedAgentId;
      const matchesProject = activeProjectId === 'all' || o.projectId === activeProjectId;
      
      // Agent role filter
      const isAllowedAgent = userProfile?.role !== 'agent' || o.assignedTo === userProfile?.uid;

      return matchesSearch && matchesAgent && matchesProject && isAllowedAgent;
    });
  }, [opportunities, searchTerm, selectedAgentId, activeProjectId, userProfile]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let montoTotal = 0;
    let montoPonderado = 0;
    filteredOpps.forEach(o => {
      let amount = o.amount || 0;
      const probability = o.probability || getProbability(o.stage) || 10;
      montoTotal += amount;
      montoPonderado += (amount * (probability / 100));
    });
    return { montoTotal, montoPonderado };
  }, [filteredOpps, tenant]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!tenantId) return;
    
    const opp = opportunities.find(o => o.id === id);
    if (!opp || opp.stage === newStatus) return;

    // Actualización optimista
    updateOpportunityOptimistically(id, { stage: newStatus, probability: getProbability(newStatus), updatedAt: new Date().toISOString() });

    // Enviar a Supabase
    const { error } = await supabase
      .from('opportunities')
      .update({ 
        stage: newStatus, 
        probability: getProbability(newStatus),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error changing opp status:', error);
      // Revert in case of failure? (Optional for now)
    }
  };

  const isAdminMode = userProfile?.role === 'owner' || userProfile?.role === 'manager';

  if (loading) {
    return (
      <div className="slds-p-around_medium" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div role="status" className="slds-spinner slds-spinner_medium slds-spinner_brand">
          <span className="slds-assistive-text">Cargando...</span>
          <div className="slds-spinner__dot-a"></div>
          <div className="slds-spinner__dot-b"></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
      <div className="slds-page-header slds-m-bottom_medium" style={{ backgroundColor: 'white' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-opportunity" title="Oportunidades">
                  <svg className="slds-icon slds-page-header__icon" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#FFFFFF', color: '#FFFFFF' }}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Oportunidades Financieras">Oportunidades Financieras</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión de Pipeline Financiero</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            {/* Actions space */}
          </div>
        </div>

        <div className="slds-page-header__row slds-m-top_medium" style={{ borderTop: '1px solid var(--slds-border)', paddingTop: '16px' }}>
          <div className="slds-page-header__col-details" style={{ flex: '1 1 auto' }}>
            <div className="slds-grid slds-wrap slds-grid_pull-padded-small">
              <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-p-horizontal_small slds-m-bottom_small">
                <div className="slds-form-element">
                  <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left">
                    <Search size={16} className="slds-input__icon slds-input__icon_left" />
                    <input
                      type="text"
                      className="slds-input"
                      placeholder="Buscar oportunidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {isAdminMode && agents.length > 0 && (
                <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-p-horizontal_small slds-m-bottom_small">
                  <div className="slds-form-element">
                    <div className="slds-form-element__control">
                      <div className="slds-select_container">
                        <select 
                          className="slds-select" 
                          value={selectedAgentId}
                          onChange={(e) => setSelectedAgentId(e.target.value)}
                        >
                          <option value="all">Todos los Agentes</option>
                          {agents.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="slds-grid slds-gutters slds-m-bottom_medium slds-p-horizontal_medium slds-m-top_medium">
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-box slds-box_small slds-theme_default" style={{ borderLeft: '4px solid #0176D3' }}>
            <p className="slds-text-heading_small slds-text-color_weak slds-m-bottom_xx-small">Total Pipeline Abierto</p>
            <h3 className="slds-text-heading_large" style={{ fontWeight: 700 }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(kpis.montoTotal)}
            </h3>
          </div>
        </div>
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-box slds-box_small slds-theme_default" style={{ borderLeft: '4px solid #45c65a' }}>
            <p className="slds-text-heading_small slds-text-color_weak slds-m-bottom_xx-small">Venta Ponderada (Forecast)</p>
            <h3 className="slds-text-heading_large" style={{ fontWeight: 700 }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(kpis.montoPonderado)}
            </h3>
          </div>
        </div>
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-box slds-box_small slds-theme_default" style={{ borderLeft: '4px solid #706e6b' }}>
            <p className="slds-text-heading_small slds-text-color_weak slds-m-bottom_xx-small">Oportunidades Visibles</p>
            <h3 className="slds-text-heading_large" style={{ fontWeight: 700 }}>
              {filteredOpps.length}
            </h3>
          </div>
        </div>
      </div>

      <div className="slds-p-horizontal_medium" style={{ flex: 1, minHeight: 0 }}>
        <OpportunitiesKanbanBoard 
          opportunities={filteredOpps} 
          onStatusChange={handleStatusChange}
          onClick={(opp) => alert(`Abriendo Oportunidad: ${opp.name}. La vista de detalle está en construcción.`)}
          isAdminMode={isAdminMode}
          agents={agents}
        />
      </div>
    </div>
  );
}