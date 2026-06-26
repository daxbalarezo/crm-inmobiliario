import React, { useState, useMemo } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { useWorkflows } from '../hooks/useWorkflows';
import { logActivityService } from '../services/activities';
import LeadModal from '../components/LeadModal';
import KanbanBoard from '../components/KanbanBoard';
import type { Lead } from '../types/definitions';
import styles from './CommercialDashboard.module.css';
import adminStyles from './AdminDashboard.module.css';

// For Weighted Pipeline Calculation
const defaultProbabilities: Record<string, number> = {
  'PROSPECTO': 10,
  'SIN_CONTACTAR': 5,
  'EN_NEGOCIACION': 40,
  'VISITA': 60,
  'SEPARACION': 90,
  'VENDIDO': 100,
};
const getProbability = (stage: string) => defaultProbabilities[stage] || 0;

export default function CommercialDashboard() {
  const { leads, inventory, loading } = useCommercialData();
  const { tenantId, activeProjectId, userProfile, userPermissions } = useCRM();
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
      import('firebase/firestore').then(({ collection, getDocs, query, where }) => {
        getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId))).then(snap => {
          setAgents(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
        });
      });
    }
  }, [tenantId, userProfile?.role]);

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
  }, [filteredLeads]);

  const { executeWorkflows } = useWorkflows();

  const handleSave = async (data: Partial<Lead>) => {
    if (!tenantId) return;
    
    if (editingLead?.id) {
      await updateDoc(doc(db, 'leads', editingLead.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      // Exec workflows for UPDATE
      executeWorkflows(tenantId, 'lead_updated', { id: editingLead.id, ...data });
    } else {
      const docRef = await addDoc(collection(db, 'leads'), {
        ...data,
        tenantId,
        projectId: activeProjectId,
        assignedTo: userProfile?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      if (userProfile) {
        await logActivityService(
          tenantId,
          docRef.id,
          userProfile.uid,
          userProfile.name,
          'lead_created',
          `Prospecto creado y asignado a ${userProfile.name}`
        );
      }
      
      // Exec workflows for CREATE
      executeWorkflows(tenantId, 'lead_created', { id: docRef.id, ...data, assignedTo: userProfile?.uid });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const leadName = leads.find(l => l.id === id)?.name || 'Desconocido';
      await deleteDoc(doc(db, 'leads', id));
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
    const lead = leads.find(l => l.id === leadId);
    
    const updates: any = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    
    // SLA tracking: if it's the first time changing status from default
    if (lead && !lead.firstContactAt && newStatus !== 'PROSPECTO') {
      updates.firstContactAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'leads', leadId), updates);
    
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
    <div className={adminStyles.container}>
      
      {/* Exact 'Visión General' Header Style applied to Pipeline Global */}
      <div className={adminStyles.pageHeader}>
        <div className={adminStyles.headerTopRow} style={{ marginBottom: '16px' }}>
          <div className={adminStyles.headerTitleBlock}>
            <div className={adminStyles.headerIcon} style={{ backgroundColor: '#FF9D50' }}>
              {/* Using a commercial/opportunity icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className={adminStyles.headerTextGroup}>
              <p className={adminStyles.headerBreadcrumb}>Gestión Comercial</p>
              <h2 className={adminStyles.title}>Pipeline Global</h2>
            </div>
          </div>
          
          <div className="slds-no-flex">
            {userPermissions.leads.create && (
              <button onClick={openNew} className="slds-button slds-button_brand">
                Nuevo Prospecto
              </button>
            )}
          </div>
        </div>

        {/* Filters and KPI row matching exactly the style of Explorador de Datos */}
        <div style={{ display: 'flex', padding: '12px 0 0 0', borderTop: '1px solid #DDDBDA', marginTop: '4px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div className={adminStyles.filterGroup} style={{ gap: '12px', flexWrap: 'wrap' }}>
            <div className="slds-form-element" style={{ marginBottom: 0 }}>
              <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left" style={{ position: 'relative' }}>
                <Search 
                  size={16} 
                  color="#747474" 
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fill: 'none' }} 
                />
                <input 
                  type="text" 
                  placeholder="Buscar prospecto..."
                  className={adminStyles.timeFilter}
                  style={{ minWidth: '180px', paddingLeft: '32px' }}
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <select 
              className={adminStyles.timeFilter}
              style={{ minWidth: '160px' }}
              value={savedView} 
              onChange={e => setSavedView(e.target.value)}
              title="Vistas Guardadas"
            >
              <option value="all">Todos los Prospectos</option>
              <option value="stalled">Oportunidades Estancadas</option>
              <option value="high_value">Alto Valor (Cotizados)</option>
              <option value="hot">Cierres Calientes</option>
            </select>

            {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
              <select 
                className={adminStyles.timeFilter}
                style={{ minWidth: '160px' }}
                value={selectedAgentId} 
                onChange={e => setSelectedAgentId(e.target.value)}
              >
                <option value="all">Todos los Asesores</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* KPI Inline */}
            <div style={{ display: 'flex' }}>
              <div className={adminStyles.detailItem} style={{ paddingLeft: 0 }}>
                <span className={adminStyles.detailLabel} style={{ marginBottom: 0 }} title="Total de Oportunidades Abiertas">ACTIVOS</span>
                <span className={adminStyles.detailValueBrand} style={{ fontSize: '18px' }}>{filteredLeads.length}</span>
              </div>
              {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
                <>
                  <div className={adminStyles.detailItem}>
                    <span className={adminStyles.detailLabel} style={{ marginBottom: 0 }} title="Suma Nominal de Oportunidades">PIPELINE</span>
                    <span className={adminStyles.detailValueBrand} style={{ fontSize: '18px' }}>
                      ${kpis.montoTotal >= 1000 ? `${(kpis.montoTotal / 1000).toFixed(1)}k` : kpis.montoTotal}
                    </span>
                  </div>
                  <div className={adminStyles.detailItem} style={{ borderRight: 'none', paddingRight: '24px' }}>
                    <span className={adminStyles.detailLabel} style={{ marginBottom: 0 }} title="Valor Real Proyectado según Probabilidad">PONDERADO</span>
                    <span className={adminStyles.detailValueBrand} style={{ fontSize: '18px', color: '#54A77B' }}>
                      ${kpis.montoPonderado >= 1000 ? `${(kpis.montoPonderado / 1000).toFixed(1)}k` : kpis.montoPonderado}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="slds-button-group slds-m-left_medium" role="group">
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
        onClose={() => setShowLeadModal(false)}
        lead={editingLead}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}