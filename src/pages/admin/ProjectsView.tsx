import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { FolderKanban, Plus, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function ProjectsView() {
  const { userProfile } = useCRM();
  const [projects, setProjects] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal y form
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    tenantId: '',
    name: ''
  });
  const [createProjectError, setCreateProjectError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (userProfile?.role !== 'owner') return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [projectsSnap, tenantsSnap] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'tenants'))
        ]);
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTenants(tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile?.role]);

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
    } finally {
      setIsCreating(false);
    }
  };

  if (userProfile?.role !== 'owner') return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Proyectos Inmobiliarios</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de todos los proyectos por inmobiliaria.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Proyectos Globales</h2>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-[#0176D3] text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-[#015C99] flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-500">ID del Proyecto</th>
              <th className="px-6 py-3 font-semibold text-slate-500">Empresa Dueña</th>
              <th className="px-6 py-3 font-semibold text-slate-500">Nombre del Proyecto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={3} className="text-center py-4 font-semibold text-slate-500">Cargando proyectos...</td></tr> : projects.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-mono text-xs text-slate-400">{p.id}</td>
                <td className="px-6 py-3 font-medium text-slate-500">{tenants.find(t => t.id === p.tenantId)?.name || 'N/A'}</td>
                <td className="px-6 py-3 font-semibold text-slate-800">{p.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
              <h3 className="font-semibold">Registrar Nuevo Proyecto</h3>
              <button onClick={() => setIsProjectModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa Dueña</label>
                <select required value={newProject.tenantId} onChange={e => setNewProject({ ...newProject, tenantId: e.target.value })} className="w-full border rounded p-2 text-sm">
                  <option value="">Seleccione a qué inmobiliaria pertenece...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Proyecto</label>
                <input type="text" required value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className="w-full border rounded p-2 text-sm" placeholder="Ej. Condominio Las Palmas" />
              </div>

              {createProjectError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded">{createProjectError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                <button type="submit" disabled={isCreating} className="bg-[#0176D3] text-white px-4 py-2 rounded text-sm font-semibold">{isCreating ? 'Creando...' : 'Crear Proyecto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
