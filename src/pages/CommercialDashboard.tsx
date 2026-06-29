import React, { useState, useMemo } from 'react';
import { Plus, Search, Users, Download } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import { formatPhoneNumber } from '../utils/helpers';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { useWorkflows } from '../hooks/useWorkflows';
import { logActivityService } from '../services/activities';
import LeadModal from '../components/LeadModal';
import KanbanBoard from '../components/KanbanBoard';
import type { Lead } from '../types/definitions';

// For Weighted Pipeline Calculation (Fallback)
const defaultProbabilities: Record<string, number> = {
  'NUEVO': 10,
  'CONTACTADO': 20,
  'EN_NEGOCIACION': 40,
  'VISITA': 60,
  'SEPARACION': 90,
  'VENDIDO': 100,
};

export default function CommercialDashboard() {
  const { leads, inventory, loading, updateLeadOptimistically, addLeadOptimistically } = useCommercialData();
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
          const maxDays = tenant?.slaFollowUpDays || 14;
          matchesSavedView = diffDays >= maxDays && l.status !== 'DESCARTADO';
        } else {
          matchesSavedView = false;
        }
      } else if (savedView === 'high_value') {
        // Prospectos Calificados: Ya no son "NUEVOS" y tampoco están "DESCARTADOS"
        matchesSavedView = l.status !== 'NUEVO' && l.status !== 'DESCARTADO';
      } else if (savedView === 'hot') {
        // Alto Interés: Tienen el nivel de interés marcado como 'Alto'
        matchesSavedView = l.interestLevel === 'Alto' && l.status !== 'DESCARTADO';
      }

      return matchesSearch && matchesAgent && matchesSavedView;
    });
  }, [leads, searchTerm, selectedAgentId, savedView]);

  // KPIs de Volumen (Sin dinero, purismo Salesforce)
  const kpis = useMemo(() => {
    return { 
      totalLeads: filteredLeads.length,
      stalledLeads: filteredLeads.filter(l => {
        const date = l.updatedAt || l.createdAt;
        if (!date) return false;
        const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
        const maxDays = tenant?.slaFollowUpDays || 14;
        return diffDays >= maxDays && l.status !== 'DESCARTADO';
      }).length,
      contactedLeads: filteredLeads.filter(l => l.status !== 'NUEVO' && l.status !== 'DESCARTADO').length
    };
  }, [filteredLeads, tenant?.slaFollowUpDays]);

  const { executeWorkflows } = useWorkflows();

  const handleSave = async (data: Partial<Lead>) => {
    if (!tenantId) return;
    
    const payload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status,
      interest_level: data.interestLevel,
      saved_proforma: data.savedProforma,
      assigned_to: data.assignedTo,
      custom_data: data.customData,
      source: data.source,
      loss_reason: data.lossReason
    };
    
    if (editingLead?.id) {
      updateLeadOptimistically(editingLead.id, data);
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
        addLeadOptimistically({
          id: newLead.id,
          tenantId: newLead.tenant_id,
          projectId: newLead.project_id,
          assignedTo: newLead.assigned_to,
          name: newLead.name,
          phone: newLead.phone,
          email: newLead.email,
          status: newLead.status,
          interestLevel: newLead.interest_level,
          createdAt: newLead.created_at,
          updatedAt: newLead.updated_at
        });
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

  const handleStatusChange = async (leadId: string, newStatus: string, extraData?: Partial<Lead>) => {
    // 1. Actualización Optimista (feedback instantáneo)
    updateLeadOptimistically(leadId, { status: newStatus, ...extraData });

    const lead = leads.find(l => l.id === leadId);
    
    const updates: any = {
      status: newStatus,
    };
    
    if (extraData?.lossReason) updates.loss_reason = extraData.lossReason;
    if (extraData?.lossNotes !== undefined) updates.loss_notes = extraData.lossNotes;
    
    // SLA tracking: if it's the first time changing status from default
    if (lead && !lead.firstContactAt && newStatus !== 'NUEVO') {
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

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedLeads = async () => {
    if (!tenantId) return;
    setIsSeeding(true);
    try {
      // 1. Obtener todos los usuarios del tenant
      const { data: usersData, error: usersError } = await supabase.from('users').select('uid, name, role').eq('tenant_id', tenantId);
      if (usersError) throw usersError;

      // 2. Filtrar gerentes y owners (solo asesores)
      const asesores = (usersData || []).filter(u => u.role !== 'owner' && u.role !== 'manager');
      
      if (asesores.length === 0) {
        alert("No hay asesores creados en esta empresa. Por favor, asegúrate de que los usuarios no tengan rol 'Gerente'.");
        setIsSeeding(false);
        return;
      }

      // 3. Obtener etapas
      const stages = tenant?.pipeline_stages || [];
      if (stages.length === 0) {
        alert("La empresa no tiene un embudo de ventas configurado.");
        setIsSeeding(false);
        return;
      }

      // 4. Generar 20 prospectos
      const firstNames = ["Carlos", "Maria", "Jorge", "Ana", "Luis", "Elena", "Pedro", "Sofia", "Miguel", "Laura", "Diego", "Carmen"];
      const lastNames = ["Gomez", "Perez", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Ramirez", "Torres", "Flores"];
      const interests = ["Alto", "Medio", "Bajo"];
      
      const newLeads = [];
      const numLeads = 20;

      for (let i = 0; i < numLeads; i++) {
        const asesor = asesores[i % asesores.length]; 
        const stage = stages[i % stages.length]; 
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const interest = interests[Math.floor(Math.random() * interests.length)];
        const phone = "9" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        
        let custom_data = null;
        let saved_proforma = null;

        const normalizedStage = stage.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (normalizedStage.includes('NEGOCIACION')) {
          custom_data = { presupuesto: Math.floor(Math.random() * (500000 - 100000 + 1)) + 100000 };
        } else if (normalizedStage.includes('SEPARACION') || normalizedStage.includes('VENDIDO') || normalizedStage.includes('CERRADO')) {
          saved_proforma = {
            finalPrice: Math.floor(Math.random() * (500000 - 100000 + 1)) + 100000,
            unitName: 'Dpto Seed',
            proformaId: 'seed',
            createdAt: new Date().toISOString()
          };
        }

        const newLead: any = {
          tenant_id: tenantId,
          project_id: activeProjectId === 'all' ? null : activeProjectId,
          assigned_to: asesor.uid,
          name: `${fName} ${lName}`,
          email: `${fName.toLowerCase()}.${lName.toLowerCase()}@ejemplo.com`,
          phone: phone,
          status: stage.name,
          interest_level: interest,
        };

        if (custom_data) newLead.custom_data = custom_data;
        if (saved_proforma) newLead.saved_proforma = saved_proforma;

        newLeads.push(newLead);
      }

      // 5. Insertar y obtener IDs
      const { data: insertedLeads, error: insertLeadsError } = await supabase.from('leads').insert(newLeads).select('id, status, assigned_to');
      if (insertLeadsError) throw insertLeadsError;

      // 6. Generar actividades asociadas a los prospectos
      if (insertedLeads) {
        const newActivities = [];
        for (const lead of insertedLeads) {
          const asesor = asesores.find(a => a.uid === lead.assigned_to) || asesores[0];
          const stageIndex = stages.findIndex(s => s.name === lead.status);
          
          newActivities.push({
            tenant_id: tenantId,
            lead_id: lead.id,
            user_id: userProfile?.uid || asesor.uid,
            user_name: userProfile?.name || asesor.name,
            action_type: 'note',
            description: `Registro inicial de contacto por campaña digital.`,
            status: 'completed'
          });

          if (stageIndex > 0) {
            newActivities.push({
              tenant_id: tenantId,
              lead_id: lead.id,
              user_id: asesor.uid,
              user_name: asesor.name,
              action_type: 'call',
              description: `Llamada de seguimiento pendiente para confirmar avance en ${lead.status}`,
              status: 'pending',
              due_date: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 5) + 1)).toISOString()
            });
          }
        }
        await supabase.from('lead_activities').insert(newActivities);
      }

      alert(`Se sembraron ${numLeads} prospectos con notas y tareas para ${asesores.length} asesores.`);
      window.location.reload(); 

    } catch (e: any) {
      console.error(e);
      alert("Error al sembrar datos: " + e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) return (
    <div className="slds-p-around_xx-large slds-text-align_center">
      <div role="status" className="slds-spinner slds-spinner_medium slds-spinner_brand">
        <span className="slds-assistive-text">Cargando...</span>
        <div className="slds-spinner__dot-a"></div>
        <div className="slds-spinner__dot-b"></div>
      </div>
    </div>
  );

  const handleExportCSV = () => {
    const headers = ['Nombre,Telefono,Etapa,Interes,Agente,Fecha Creacion'];
    const rows = filteredLeads.map(lead => {
      const agentName = agents.find(a => a.id === lead.assignedTo)?.name || 'Sin Asignar';
      const dateObj = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || Date.now());
      return `"${lead.name}","${lead.phone || ''}","${lead.status}","${lead.interestLevel || ''}","${agentName}","${dateObj.toLocaleDateString()}"`;
    });
    
    const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Prospectos_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="slds-grid slds-grid_vertical slds-p-around_none">
      
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
                      <span className="slds-page-header__title slds-truncate" title="Gestión de Prospectos">Gestión de Prospectos</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión Comercial</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control" style={{ display: 'flex', gap: '8px' }}>
                {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                  <button className="slds-button slds-button_outline-brand" onClick={handleExportCSV}>
                    <Download size={14} className="slds-m-right_x-small" /> Exportar CSV
                  </button>
                )}
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
                        <option value="stalled">Prospectos Estancados</option>
                        <option value="high_value">Prospectos Calificados</option>
                        <option value="hot">Alto Interés</option>
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
              <li className="slds-page-header__detail-block" style={{ minWidth: '120px' }}>
                <div className="slds-text-title" title="Estancados">ESTANCADOS</div>
                <div className="slds-truncate" title={String(kpis.stalledLeads)}>
                  <span className={`slds-text-heading_small ${kpis.stalledLeads > 0 ? 'slds-text-color_error' : 'slds-text-color_default'}`}>
                    {kpis.stalledLeads}
                  </span>
                </div>
              </li>
              <li className="slds-page-header__detail-block" style={{ minWidth: '120px' }}>
                <div className="slds-text-title" title="Contactados">CONTACTADOS</div>
                <div className="slds-truncate" title={String(kpis.contactedLeads)}>
                  <span className="slds-text-heading_small slds-text-color_success">
                    {kpis.contactedLeads}
                  </span>
                </div>
              </li>
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
                      <div className="slds-truncate">{formatPhoneNumber(lead.phone) || '-'}</div>
                    </td>
                    <td data-label="Estado">
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