import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, X, Building2, LineChart, DollarSign, TrendingUp } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { db } from '../config/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import styles from './SettingsDashboard.module.css';

export default function CompaniesDashboard() {
  const { userProfile } = useCRM();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal y Forms
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantRuc, setNewTenantRuc] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('starter');
  const [newTenantFirstProject, setNewTenantFirstProject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (userProfile?.role !== 'owner') return;

    const fetchTenants = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, [userProfile?.role]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;
    setIsCreating(true);

    try {
      const tenantRef = doc(collection(db, 'tenants'));
      const tenantData = {
        name: newTenantName.trim(),
        ruc: newTenantRuc.trim(),
        plan: newTenantPlan,
        createdAt: serverTimestamp(),
        status: 'active'
      };
      
      await setDoc(tenantRef, tenantData);

      if (newTenantFirstProject.trim()) {
        const projRef = doc(collection(db, 'projects'));
        await setDoc(projRef, {
          name: newTenantFirstProject.trim(),
          tenantId: tenantRef.id,
          createdAt: serverTimestamp()
        });
      }

      setTenants(prev => [{ id: tenantRef.id, ...tenantData, createdAt: new Date() }, ...prev]);
      setIsTenantModalOpen(false);
      setNewTenantName('');
      setNewTenantRuc('');
      setNewTenantPlan('starter');
      setNewTenantFirstProject('');
    } catch (err) {
      console.error("Error creating tenant:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`¿Estás seguro de que deseas ${newStatus === 'suspended' ? 'suspender' : 'reactivar'} esta inmobiliaria?`)) return;
    
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { status: newStatus });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado.');
    }
  };

  const handleUpdatePlan = async (tenantId: string, newPlan: string) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { plan: newPlan });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, plan: newPlan } : t));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar plan.');
    }
  };

  if (userProfile?.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  const activeTenants = tenants.filter(t => t.status === 'active' || !t.status);
  const suspendedTenantsCount = tenants.length - activeTenants.length;
  
  const planPrices = { starter: 49, pro: 99, enterprise: 299 };
  const mrr = activeTenants.reduce((sum, t) => sum + (planPrices[t.plan as keyof typeof planPrices] || 49), 0);
  const arr = mrr * 12;

  const planCounts = activeTenants.reduce((acc, t) => {
    acc[t.plan as keyof typeof planCounts] = (acc[t.plan as keyof typeof planCounts] || 0) + 1;
    return acc;
  }, { starter: 0, pro: 0, enterprise: 0 });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Inmobiliarias</h2>
          <p className={styles.subtitle}>Gestión Global de Clientes (Tenants)</p>
        </div>
      </div>

      <div className={styles.financesGrid} style={{ marginBottom: '24px' }}>
        <div className={`${styles.financeCard} ${styles.financeCardDark}`}>
          <div className={styles.financeCardHeader}>
            <div>
              <p className={styles.financeLabel}>Ingreso Mensual (MRR)</p>
              <p className={styles.financeValue}>${mrr.toLocaleString('en-US')}</p>
            </div>
            <div className={styles.financeIcon}>
              <DollarSign size={24} />
            </div>
          </div>
          <div className={styles.financeFooter}>
            <TrendingUp size={16} />
            <span>Métricas en tiempo real</span>
          </div>
        </div>

        <div className={styles.financeCard}>
          <div className={styles.financeCardHeader}>
            <div>
              <p className={styles.financeLabel}>Ingreso Anual (ARR)</p>
              <p className={styles.financeValue}>${arr.toLocaleString('en-US')}</p>
            </div>
            <div className={styles.financeIcon} style={{color: 'var(--primary-color)'}}>
              <LineChart size={24} />
            </div>
          </div>
        </div>

        <div className={styles.financeCard}>
          <div className={styles.financeCardHeader}>
            <div>
              <p className={styles.financeLabel}>Inmobiliarias Activas</p>
              <p className={styles.financeValue}>{activeTenants.length}</p>
            </div>
            <div className={styles.financeIcon} style={{color: 'var(--primary-color)'}}>
              <Building2 size={24} />
            </div>
          </div>
          {suspendedTenantsCount > 0 && (
            <div className={styles.financeFooter}>
              {suspendedTenantsCount} empresa(s) suspendida(s)
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Inmobiliarias Registradas</h2>
          <button onClick={() => setIsTenantModalOpen(true)} className={styles.btnPrimary}>
            <Plus size={16} /> Nueva Inmobiliaria
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID Interno</th>
                <th className={styles.th}>Empresa (Comercial)</th>
                <th className={styles.th}>RUC</th>
                <th className={styles.th}>Plan</th>
                <th className={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className={styles.td} style={{textAlign: 'center'}}>Cargando...</td></tr> : tenants.map(t => (
                <tr key={t.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.fontMono} ${styles.textMuted}`}>{t.id}</td>
                  <td className={`${styles.td} ${styles.fontSemibold}`}>{t.name}</td>
                  <td className={`${styles.td} ${styles.textMuted}`}>{t.ruc || '---'}</td>
                  <td className={styles.td}>
                    <select 
                      value={t.plan || 'starter'}
                      onChange={(e) => handleUpdatePlan(t.id, e.target.value)}
                      className={`${styles.selectPlan} ${t.plan === 'enterprise' ? styles.planEnterprise : t.plan === 'pro' ? styles.planPro : styles.planStarter}`}
                    >
                      <option value="starter">STARTER</option>
                      <option value="pro">PRO</option>
                      <option value="enterprise">ENTERPRISE</option>
                    </select>
                  </td>
                  <td className={styles.td}>
                    <button 
                      onClick={() => handleUpdateTenantStatus(t.id, t.status || 'active')}
                      className={`${styles.badge} ${(!t.status || t.status === 'active') ? styles.badgeActive : styles.badgeSuspended}`}
                    >
                      {(!t.status || t.status === 'active') ? 'Activa' : 'Suspendida'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panelCard} style={{ marginTop: '24px' }}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Desglose por Planes</h3>
        </div>
        <div style={{padding: '24px'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
            <div style={{padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <p style={{fontSize: '14px', fontWeight: 700, margin: 0, color: '#64748b'}}>Plan STARTER</p>
                <p style={{fontSize: '12px', margin: '4px 0 0 0', color: '#94a3b8'}}>$49 / mes</p>
              </div>
              <p style={{fontSize: '24px', fontWeight: 700, margin: 0, color: '#334155'}}>{planCounts.starter}</p>
            </div>
            <div style={{padding: '16px', border: '1px solid #e0e7ff', borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <p style={{fontSize: '14px', fontWeight: 700, margin: 0, color: '#4f46e5'}}>Plan PRO</p>
                <p style={{fontSize: '12px', margin: '4px 0 0 0', color: '#818cf8'}}>$99 / mes</p>
              </div>
              <p style={{fontSize: '24px', fontWeight: 700, margin: 0, color: '#3730a3'}}>{planCounts.pro}</p>
            </div>
            <div style={{padding: '16px', border: '1px solid #0f172a', borderRadius: 'var(--radius-md)', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white'}}>
              <div>
                <p style={{fontSize: '14px', fontWeight: 700, margin: 0, color: '#38bdf8'}}>Plan ENTERPRISE</p>
                <p style={{fontSize: '12px', margin: '4px 0 0 0', color: '#94a3b8'}}>$299 / mes</p>
              </div>
              <p style={{fontSize: '24px', fontWeight: 700, margin: 0, color: 'white'}}>{planCounts.enterprise}</p>
            </div>
          </div>
        </div>
      </div>

      {isTenantModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Registrar Nueva Inmobiliaria</h3>
              <button onClick={() => setIsTenantModalOpen(false)} className={styles.btnClose}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateTenant}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre Comercial</label>
                  <input type="text" required value={newTenantName} onChange={e => setNewTenantName(e.target.value)} className={styles.formInput} placeholder="Ej. Constructora Los Andes" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>RUC (Opcional)</label>
                  <input type="text" value={newTenantRuc} onChange={e => setNewTenantRuc(e.target.value)} className={styles.formInput} placeholder="Ej. 20123456789" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Plan Asignado</label>
                  <select value={newTenantPlan} onChange={e => setNewTenantPlan(e.target.value)} className={styles.formSelect}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre del 1er Proyecto (Opcional)</label>
                  <input type="text" value={newTenantFirstProject} onChange={e => setNewTenantFirstProject(e.target.value)} className={styles.formInput} placeholder="Ej. Condominio Las Palmas" />
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" onClick={() => setIsTenantModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                  <button type="submit" disabled={isCreating} className={styles.btnPrimary}>{isCreating ? 'Creando...' : 'Guardar Empresa'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
