import React, { useState, useMemo } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { useWorkflows } from '../hooks/useWorkflows';
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

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(lower) || l.phone?.includes(lower)
    );
  }, [leads, searchTerm]);

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
    await updateDoc(doc(db, 'leads', leadId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
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