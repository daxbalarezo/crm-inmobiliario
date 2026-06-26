import React, { useState, useMemo } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { useWorkflows } from '../hooks/useWorkflows';
import { logActivityService } from '../services/activities';
import LeadModal from '../components/LeadModal';
import KanbanBoard from '../components/KanbanBoard';
import type { Lead } from '../types/definitions';

// For Weighted Pipeline Calculation (Fallback)
const defaultProbabilities: Record<string, number> = {
  'PROSPECTO': 10,
  'SIN_CONTACTAR': 5,
  'EN_NEGOCIACION': 40,
  'VISITA': 60,
  'SEPARACION': 90,
  'VENDIDO': 100,
};

export default function CommercialDashboard() {
  const { leads, inventory, loading, updateLeadOptimistically } = useCommercialData();
  const { tenantId, activeProjectId, userProfile, userPermissions, tenant } = useCRM();
  const { logEvent } = useAuditTrail(tenantId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead]     = useState<Lead | null>(null);
  const [viewMode, setViewMode]           = useState<'board' | 'list'>('board');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [savedView, setSavedView] = useState<string>('all');
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'manager') {
      supabase.from('users').select('uid, name').eq('tenant_id', tenantId).then(({ data }) => {
        if (data) {
          setAgents(data.map(d => ({ id: d.uid, name: d.name })));
        }
      });
    }
  }, [tenantId, userProfile?.role]);

  const getProbability = (stageName: string) => {
    if (tenant?.pipeline_stages) {
      const stage = tenant.pipeline_stages.find(s => s.name === stageName);
      if (stage) return stage.probability;
    }
    return defaultProbabilities[stageName] || 0;
  };

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(l => {
      // 1. Text search
      const matchesSearch = l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.phone?.includes(searchTerm) ||
                            (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Agent filter
      const matchesAgent = selectedAgentId === 'all' || l.assignedTo === selectedAgentId;

      // 3. Saved View filter
      let matchesSavedView = true;
      if (savedView === 'stalled') {
        const lastActivityTime = l.updatedAt || l.createdAt;
        if (lastActivityTime) {
          const dateObj = lastActivityTime.toDate ? lastActivityTime.toDate() : new Date(lastActivityTime);
          const diffDays = Math.ceil(Math.abs(new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
          matchesSavedView = diffDays >= 14 && !['VENDIDO', 'VENTA_CERRADA', 'NO_INTERESADO', 'VENTA_CAIDA'].includes(l.status);
        } else {
          matchesSavedView = false;
        }
      } else if (savedView === 'high_value') {
        matchesSavedView = (l.savedProforma?.finalPrice || 0) > 0;
      } else if (savedView === 'hot') {
        matchesSavedView = ['SEPARACION', 'VISITA'].includes(l.status) && l.interestLevel === 'Alto';
      }

      return matchesSearch && matchesAgent && matchesSavedView;
    });
  }, [leads, searchTerm, selectedAgentId, savedView]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let montoTotal = 0;
    let montoPonderado = 0;
    filteredLeads.forEach(l => {
      let amount = l.savedProforma?.finalPrice || 0;
      const probability = getProbability(l.status) / 100;
      montoTotal += amount;
      montoPonderado += (amount * probability);
    });
    return { montoTotal, montoPonderado };
  }, [filteredLeads, tenant]);

  const { executeWorkflows } = useWorkflows();

  const handleSave = async (data: Partial<Lead>) => {
    if (!tenantId) return;
    
    // Mapear de camelCase a snake_case para Supabase
    const payload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status,
      interest_level: data.interestLevel,
      notes: data.notes,
      saved_proforma: data.savedProforma,
      assigned_to: data.assignedTo
    };
    
    if (editingLead?.id) {
      const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id);
      if (error) {
        console.error("Error updating lead:", error);
        return;
      }
      executeWorkflows(tenantId, 'lead_updated', { id: editingLead.id, ...data });
    } else {
      payload.tenant_id = tenantId;
      payload.project_id = activeProjectId === 'all' ? null : activeProjectId;
      if (!payload.assigned_to) {
        payload.assigned_to = userProfile?.uid;
      }
      
      const { data: newLead, error } = await supabase.from('leads').insert([payload]).select().single();
      
      if (error) {
        console.error("Error creating lead:", error);
        return;
      }
      
      if (userProfile && newLead) {
        await logActivityService(
          tenantId,
          newLead.id,
          userProfile.uid,
          userProfile.name,
          'lead_created',
          `Prospecto creado y asignado a ${userProfile.name}`
        );
      }
      
      if (newLead) {
        executeWorkflows(tenantId, 'lead_created', { id: newLead.id, ...data, assignedTo: userProfile?.uid });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const leadName = leads.find(l => l.id === id)?.name || 'Desconocido';
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      
      if (userProfile) {
        await logEvent(userProfile.uid, userProfile.name, 'DELETE', 'LEAD', id, `Prospecto eliminado: ${leadName}`);
      }
      alert(`El prospecto ${leadName} ha sido eliminado correctamente.`);
    } catch (error: any) {
      console.error("Error al eliminar prospecto:", error);
      alert(`No se pudo eliminar el prospecto. Error: ${error.message}`);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // 1. Actualización Optimista (feedback instantáneo)
    updateLeadOptimistically(leadId, { status: newStatus });

    const lead = leads.find(l => l.id === leadId);
    
    const updates: any = {
      status: newStatus,
    };
    
    // SLA tracking: if it's the first time changing status from default
    if (lead && !lead.firstContactAt && newStatus !== 'PROSPECTO') {
      updates.first_contact_at = new Date().toISOString();
    }

    const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
    if (error) console.error("Error changing status:", error);
    
    if (userProfile && tenantId) {
      await logActivityService(
        tenantId,
        leadId,
        userProfile.uid,
        userProfile.name,
        'stage_change',
        `Cambió la etapa a: ${newStatus}`
      );
    }
  };

  const openNew = () => { setEditingLead(null); setShowLeadModal(true); };
  const openEdit = (lead: Lead) => { setEditingLead(lead); setShowLeadModal(true); };

  if (loading) return (
    <div className="slds-p-around_xx-large slds-text-align_center">
      <div role="status" className="slds-spinner slds-spinner_medium slds-spinner_brand">
        <span className="slds-assistive-text">Cargando...</span>
        <div className="slds-spinner__dot-a"></div>
        <div className="slds-spinner__dot-b"></div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* PAGE HEADER SLDS */}
      <div className="slds-page-header slds-m-bottom_medium" style={{ backgroundColor: 'white' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-opportunity" title="Gestión Comercial">
                  <svg className="slds-icon slds-page-header__icon" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#FFFFFF', color: '#FFFFFF' }}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Pipeline Global">Pipeline Global</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión Comercial</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                {userPermissions.leads.create && (
                  <button className="slds-button slds-button_brand" onClick={openNew}>
                    <Plus size={14} className="slds-m-right_x-small" /> Nuevo Prospecto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Sub-Header / Filters SLDS */}
        <div className="slds-page-header__row slds-m-top_medium" style={{ borderTop: '1px solid var(--slds-border)', paddingTop: '16px' }}>
          
          <div className="slds-page-header__col-details" style={{ flex: '1 1 auto' }}>
            <div className="slds-grid slds-wrap slds-grid_pull-padded-small">
              <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3 slds-p-horizontal_small slds-m-bottom_small">
                <div className="slds-form-element">
                  <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left">
                    <Search size={16} className="slds-input__icon slds-input__icon_left" />
                    <input 
                      type="text" 
                      className="slds-input" 
                      placeholder="Buscar prospecto..."
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3 slds-p-horizontal_small slds-m-bottom_small">
                <div className="slds-form-element">
                  <div className="slds-form-element__control">
                    <div className="slds-select_container">
                      <select 
                        className="slds-select" 
                        value={savedView} 
                        onChange={e => setSavedView(e.target.value)}
                      >
                        <option value="all">Todos los Prospectos</option>
                        <option value="stalled">Oportunidades Estancadas</option>
                        <option value="high_value">Alto Valor (Cotizados)</option>
                        <option value="hot">Cierres Calientes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3 slds-p-horizontal_small slds-m-bottom_small">
                  <div className="slds-form-element">
                    <div className="slds-form-element__control">
                      <div className="slds-select_container">
                        <select 
                          className="slds-select" 
                          value={selectedAgentId} 
                          onChange={e => setSelectedAgentId(e.target.value)}
                        >
                          <option value="all">Todos los Asesores</option>
                          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="slds-page-header__col-details">
            <ul className="slds-page-header__detail-row">
              <li className="slds-page-header__detail-block">
                <div className="slds-text-title slds-truncate" title="Activos">ACTIVOS</div>
                <div className="slds-truncate" title={String(filteredLeads.length)}>
                  <span className="slds-text-heading_small">{filteredLeads.length}</span>
                </div>
              </li>
              {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                <>
                  <li className="slds-page-header__detail-block">
                    <div className="slds-text-title slds-truncate" title="Pipeline">PIPELINE</div>
                    <div className="slds-truncate" title={String(kpis.montoTotal)}>
                      <span className="slds-text-heading_small slds-text-color_default">
                        ${kpis.montoTotal >= 1000 ? `${(kpis.montoTotal / 1000).toFixed(1)}k` : kpis.montoTotal}
                      </span>
                    </div>
                  </li>
                  <li className="slds-page-header__detail-block">
                    <div className="slds-text-title slds-truncate" title="Ponderado">PONDERADO</div>
                    <div className="slds-truncate" title={String(kpis.montoPonderado)}>
                      <span className="slds-text-heading_small slds-text-color_success">
                        ${kpis.montoPonderado >= 1000 ? `${(kpis.montoPonderado / 1000).toFixed(1)}k` : kpis.montoPonderado}
                      </span>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>
            
          <div className="slds-page-header__col-actions slds-m-top_small">
            <div className="slds-button-group" role="group">
              <button 
                className={`slds-button ${viewMode === 'board' ? 'slds-button_brand' : 'slds-button_neutral'}`}
                onClick={() => setViewMode('board')}
              >
                Tablero
              </button>
              <button 
                className={`slds-button ${viewMode === 'list' ? 'slds-button_brand' : 'slds-button_neutral'}`}
                onClick={() => setViewMode('list')}
              >
                Lista
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'board' ? (
        <KanbanBoard 
          leads={filteredLeads} 
          onLeadStatusChange={handleStatusChange}
          onLeadClick={openEdit}
          isAdminMode={userProfile?.role === 'owner' || userProfile?.role === 'manager'}
          agents={agents}
        />
      ) : (
        <div className="slds-card slds-scrollable_y" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {filteredLeads.length === 0 ? (
            <div className="slds-illustration slds-illustration_small slds-p-around_x-large slds-text-align_center">
              <div className="slds-text-longform">
                <h3 className="slds-text-heading_medium">No hay prospectos</h3>
                <p className="slds-text-body_regular">Ajusta los filtros o crea un nuevo prospecto.</p>
              </div>
            </div>
          ) : (
            <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped">
              <thead>
                <tr className="slds-line-height_reset">
                  <th className="slds-text-title_caps" scope="col">
                    <div className="slds-truncate" title="Prospecto">PROSPECTO</div>
                  </th>
                  <th className="slds-text-title_caps" scope="col">
                    <div className="slds-truncate" title="Teléfono">TELÉFONO</div>
                  </th>
                  <th className="slds-text-title_caps" scope="col">
                    <div className="slds-truncate" title="Etapa">ETAPA</div>
                  </th>
                  <th className="slds-text-title_caps" scope="col">
                    <div className="slds-truncate" title="Interés">INTERÉS</div>
                  </th>
                  {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                    <th className="slds-text-title_caps" scope="col">
                      <div className="slds-truncate" title="Asesor">ASESOR</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="slds-hint-parent" onClick={() => openEdit(lead)} style={{ cursor: 'pointer' }}>
                    <td data-label="Prospecto">
                      <div className="slds-truncate" style={{ fontWeight: 600, color: '#0176D3', textTransform: 'capitalize' }}>
                        {lead.name.toLowerCase()}
                      </div>
                    </td>
                    <td data-label="Teléfono">
                      <div className="slds-truncate">{lead.phone || '-'}</div>
                    </td>
                    <td data-label="Etapa">
                      <div className="slds-truncate">
                        <span className="slds-badge">{lead.status}</span>
                      </div>
                    </td>
                    <td data-label="Interés">
                      <div className="slds-truncate">
                        {lead.interestLevel ? (
                          <span className={`slds-badge ${
                            lead.interestLevel === 'Alto' ? 'slds-theme_error' : 
                            lead.interestLevel === 'Medio' ? 'slds-theme_warning' : 'slds-theme_default'
                          }`}>
                            {lead.interestLevel}
                          </span>
                        ) : '-'}
                      </div>
                    </td>
                    {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                      <td data-label="Asesor">
                        <div className="slds-truncate slds-text-color_weak" style={{ textTransform: 'capitalize' }}>
                          {lead.assignedTo?.toLowerCase() || '-'}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <LeadModal
        isOpen={showLeadModal}
        onClose={() => { setShowLeadModal(false); setEditingLead(null); }}
        lead={editingLead}
        onSave={handleSave}
        onDelete={userPermissions?.leads?.delete ? handleDelete : undefined}
        agents={agents}
      />
    </div>
  );
}