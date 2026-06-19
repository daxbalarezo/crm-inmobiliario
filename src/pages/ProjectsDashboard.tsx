import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { db } from '../config/firebase';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import styles from './SettingsDashboard.module.css';

export default function ProjectsDashboard() {
  const { userProfile } = useCRM();
  const [projects, setProjects] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal y Forms
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    tenantId: '',
    name: ''
  });
  const [createProjectError, setCreateProjectError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        if (userProfile.role === 'owner') {
          const [tenantsSnap, projectsSnap] = await Promise.all([
            getDocs(collection(db, 'tenants')),
            getDocs(collection(db, 'projects'))
          ]);
          setTenants(tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Manager
          const [tenantSnap, projectsSnap] = await Promise.all([
            getDocs(query(collection(db, 'tenants'), where('__name__', '==', userProfile.tenantId))),
            getDocs(query(collection(db, 'projects'), where('tenantId', '==', userProfile.tenantId)))
          ]);
          setTenants(tenantSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateProjectError('');

    if (!newProject.tenantId) {
      setCreateProjectError('Por favor selecciona una empresa dueña.');
      return;
    }
    if (!newProject.name) {
      setCreateProjectError('Por favor ingresa el nombre del proyecto.');
      return;
    }

    const selectedTenant = tenants.find(t => t.id === newProject.tenantId);
    if (selectedTenant) {
      const plan = selectedTenant.plan || 'starter';
      const tenantProjectsCount = projects.filter(p => p.tenantId === newProject.tenantId).length;
      
      if (plan === 'starter' && tenantProjectsCount >= 1) {
        setCreateProjectError('Límite Starter alcanzado (Máx 1 proyecto). Actualiza la empresa a plan PRO.');
        return;
      }
      if (plan === 'pro' && tenantProjectsCount >= 3) {
        setCreateProjectError('Límite PRO alcanzado (Máx 3 proyectos). Actualiza a ENTERPRISE para ilimitado.');
        return;
      }
    }
    
    setIsCreating(true);
    try {
      const projRef = doc(collection(db, 'projects'));
      const projectData = {
        name: newProject.name.trim(),
        tenantId: newProject.tenantId,
        createdAt: serverTimestamp()
      };
      await setDoc(projRef, projectData);
      setProjects(prev => [{ id: projRef.id, ...projectData, createdAt: new Date() }, ...prev]);
      setIsProjectModalOpen(false);
      setNewProject({ tenantId: '', name: '' });
    } catch (err) {
      console.error(err);
      setCreateProjectError('Error al crear el proyecto.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Proyectos Inmobiliarios</h2>
          <p className={styles.subtitle}>Gestión de Desarrollos y Condominios</p>
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Listado de Proyectos</h2>
          <button onClick={() => setIsProjectModalOpen(true)} className={styles.btnPrimary}>
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {userProfile?.role === 'owner' && <th className={styles.th}>Empresa Dueña</th>}
                <th className={styles.th}>Nombre del Proyecto</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Ubicación</th>
                <th className={`${styles.th} ${styles.thRight}`}>Unidades Totales</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className={styles.td} style={{textAlign: 'center'}}>Cargando...</td></tr> : projects.map(p => (
                <tr key={p.id} className={styles.tr}>
                  {userProfile?.role === 'owner' && (
                    <td className={`${styles.td} ${styles.textMuted}`}>{tenants.find(t => t.id === p.tenantId)?.name || 'N/A'}</td>
                  )}
                  <td className={`${styles.td} ${styles.fontSemibold}`}>{p.name}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles.badgeActive}`}>Activo</span>
                  </td>
                  <td className={`${styles.td} ${styles.textMuted}`}>--</td>
                  <td className={`${styles.td} ${styles.tdRight}`}>--</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isProjectModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Registrar Nuevo Proyecto</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className={styles.btnClose}><X size={20} /></button>
            </div>
            
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateProject}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Empresa Dueña</label>
                  <select required value={newProject.tenantId} onChange={e => setNewProject({ ...newProject, tenantId: e.target.value })} className={styles.formSelect}>
                    <option value="">Seleccione a qué inmobiliaria pertenece...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre del Proyecto</label>
                  <input type="text" required value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className={styles.formInput} placeholder="Ej. Condominio Las Palmas" />
                </div>

                {createProjectError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                    {createProjectError}
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                  <button type="submit" disabled={isCreating} className={styles.btnPrimary}>{isCreating ? 'Creando...' : 'Crear Proyecto'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
