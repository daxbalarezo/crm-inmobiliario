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
export default function CommercialDashboard() {
  const { leads, inventory, loading } = useCommercialData();
  const { tenantId, activeProjectId, userProfile, userPermissions } = useCRM();
  const { logEvent } = useAuditTrail(tenantId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead]     = useState<Lead | null>(null);
  const [viewMode, setViewMode]           = useState<'board' | 'list'>('board');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
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
    let result = leads;
    if (selectedAgentId !== 'all') {
      result = result.filter(l => l.assignedTo === selectedAgentId);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name?.toLowerCase().includes(lower) || l.phone?.includes(lower)
      );
    }
    return result;
  }, [leads, searchTerm, selectedAgentId]);

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
    <div className={styles.loaderContainer}>
      <div className={styles.spinner}/>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Gestión Comercial</h2>
          <p className={styles.subtitle}>Administra prospectos y cierra ventas.</p>
        </div>
        {userPermissions.leads.create && (
          <button onClick={openNew} className={styles.btnPrimary}>
            <Plus size={18}/> Nuevo Prospecto
          </button>
        )}
      </div>

      {/* Buscador y Controles */}
      <div className={styles.controlsBar}>
        <div className={styles.searchCard}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={20}/>
            <input type="text" placeholder="Buscar prospecto..."
              className={styles.searchInput}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
        </div>

        {(userProfile?.role === 'owner' || userProfile?.role === 'manager') && (
          <select 
            value={selectedAgentId} 
            onChange={e => setSelectedAgentId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="all">Todos los Asesores</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        <div className={styles.viewToggles}>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'board' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('board')}
          >
            Tablero
          </button>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            Lista
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div>
            <p className={styles.kpiLabel}>Activos</p>
            <p className={styles.kpiValue}>{filteredLeads.length}</p>
          </div>
          <div className={styles.kpiIconWrapper}><Users /></div>
        </div>
      </div>

      {/* Tablero / Lista */}
      {viewMode === 'board' ? (
        <KanbanBoard 
          leads={filteredLeads} 
          onLeadStatusChange={handleStatusChange}
          onLeadClick={openEdit}
          isAdminMode={userProfile?.role === 'owner' || userProfile?.role === 'manager'}
        />
      ) : (
        <div className={styles.listCard}>
          {filteredLeads.length === 0 ? (
            <div className={styles.emptyState}>No hay prospectos aún.</div>
          ) : (
            <div className={styles.listBody}>
              {filteredLeads.map(lead => (
                <div key={lead.id} onClick={() => openEdit(lead)} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={styles.itemAvatar}>
                      {lead.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{lead.name}</p>
                      <p className={styles.itemPhone}>{lead.phone}</p>
                    </div>
                  </div>
                  <span className={styles.statusBadge}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
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