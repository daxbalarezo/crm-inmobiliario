import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Plus, X, Pencil } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function TenantsView() {
  const { userProfile } = useCRM();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal y form
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantRuc, setNewTenantRuc] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('starter');
  const [newTenantFirstProject, setNewTenantFirstProject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal y form de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<{id: string, name: string, ruc: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  if (userProfile?.role !== 'owner') return <Navigate to="/" replace />;

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;
    setIsCreating(true);
    try {
      const tenantId = newTenantName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const newTenant = {
        name: newTenantName.trim(),
        ruc: newTenantRuc.trim(),
        plan: newTenantPlan,
        status: 'active',
        stages: ['PROSPECTO', 'CONTACTADO', 'VISITA', 'NEGOCIACIÓN', 'SEPARACIÓN', 'VENDIDO', 'DESISTIDO'],
        sources: ['Facebook Ads', 'Referidos', 'WhatsApp'],
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'tenants', tenantId), newTenant);

      if (newTenantFirstProject.trim() !== '') {
        const projRef = doc(collection(db, 'projects'));
        const projectData = {
          name: newTenantFirstProject.trim(),
          tenantId: tenantId,
          createdAt: serverTimestamp()
        };
        await setDoc(projRef, projectData);
      }

      setTenants(prev => [...prev, { id: tenantId, ...newTenant, createdAt: new Date() }]);
      setIsTenantModalOpen(false);
      setNewTenantName('');
      setNewTenantRuc('');
      setNewTenantPlan('starter');
      setNewTenantFirstProject('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editingTenant.name) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'tenants', editingTenant.id), {
        name: editingTenant.name.trim(),
        ruc: editingTenant.ruc.trim()
      });
      setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, name: editingTenant.name.trim(), ruc: editingTenant.ruc.trim() } : t));
      setIsEditModalOpen(false);
      setEditingTenant(null);
    } catch (err) {
      console.error("Error al actualizar:", err);
      alert("Error al actualizar la empresa");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { status: newStatus });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert('Error al actualizar estado');
    }
  };

  const handleUpdatePlan = async (tenantId: string, newPlan: string) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { plan: newPlan });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, plan: newPlan } : t));
    } catch (err) {
      console.error('Error updating plan:', err);
      alert('Error al actualizar el plan');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Inmobiliarias</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de inmobiliarias y planes suscritos.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Inmobiliarias Registradas</h2>
          <button
            onClick={() => setIsTenantModalOpen(true)}
            className="bg-[#0176D3] text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-[#015C99] flex items-center gap-2"
          >
            <Plus size={16} /> Nueva Inmobiliaria
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-500">ID Interno</th>
              <th className="px-6 py-3 font-semibold text-slate-500">Empresa (Comercial)</th>
              <th className="px-6 py-3 font-semibold text-slate-500">RUC</th>
              <th className="px-6 py-3 font-semibold text-slate-500">Plan</th>
              <th className="px-6 py-3 font-semibold text-slate-500">Estado</th>
              <th className="px-6 py-3 font-semibold text-slate-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="text-center py-4 text-slate-500 font-semibold">Cargando inmobiliarias...</td></tr> : tenants.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-mono text-sm text-slate-500">{t.id}</td>
                <td className="px-6 py-3 font-semibold text-slate-800">{t.name}</td>
                <td className="px-6 py-3 text-slate-600">{t.ruc || '---'}</td>
                <td className="px-6 py-3">
                  <select 
                    value={t.plan || 'starter'}
                    onChange={(e) => handleUpdatePlan(t.id, e.target.value)}
                    className={`text-xs font-bold uppercase rounded px-2 py-1 border-0 cursor-pointer ${t.plan === 'enterprise' ? 'bg-rose-100 text-rose-700' : t.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    <option value="starter">STARTER</option>
                    <option value="pro">PRO</option>
                    <option value="enterprise">ENTERPRISE</option>
                  </select>
                </td>
                <td className="px-6 py-3">
                  <button 
                    onClick={() => handleUpdateTenantStatus(t.id, t.status || 'active')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${(!t.status || t.status === 'active') ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                  >
                    {(!t.status || t.status === 'active') ? 'Activa' : 'Suspendida'}
                  </button>
                </td>
                <td className="px-6 py-3 text-right">
                  <button 
                    onClick={() => {
                      setEditingTenant({ id: t.id, name: t.name, ruc: t.ruc || '' });
                      setIsEditModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-[#0176D3] transition-colors bg-slate-50 hover:bg-blue-50 p-1.5 rounded-md"
                    title="Editar Inmobiliaria"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isTenantModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">Registrar Nueva Inmobiliaria</h3>
            <form onSubmit={handleCreateTenant}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
              <input type="text" required value={newTenantName} onChange={e => setNewTenantName(e.target.value)} className="w-full border rounded p-2 text-sm mb-3" placeholder="Ej. Constructora Los Andes" />

              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC (Opcional)</label>
              <input type="text" value={newTenantRuc} onChange={e => setNewTenantRuc(e.target.value)} className="w-full border rounded p-2 text-sm mb-3" placeholder="Ej. 20123456789" />

              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan Asignado</label>
              <select value={newTenantPlan} onChange={e => setNewTenantPlan(e.target.value)} className="w-full border rounded p-2 text-sm mb-3">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del 1er Proyecto (Opcional)</label>
              <input type="text" value={newTenantFirstProject} onChange={e => setNewTenantFirstProject(e.target.value)} className="w-full border rounded p-2 text-sm mb-5" placeholder="Ej. Condominio Las Palmas" />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsTenantModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                <button type="submit" disabled={isCreating} className="bg-[#0176D3] text-white px-4 py-2 rounded text-sm font-semibold">{isCreating ? 'Creando...' : 'Guardar Empresa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Editar Inmobiliaria</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleUpdateTenant}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Interno (No editable)</label>
              <input type="text" disabled value={editingTenant.id} className="w-full border rounded p-2 text-sm mb-3 bg-slate-50 text-slate-500 font-mono" />

              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
              <input type="text" required value={editingTenant.name} onChange={e => setEditingTenant({...editingTenant, name: e.target.value})} className="w-full border rounded p-2 text-sm mb-3" />

              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC</label>
              <input type="text" value={editingTenant.ruc} onChange={e => setEditingTenant({...editingTenant, ruc: e.target.value})} className="w-full border rounded p-2 text-sm mb-5" />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                <button type="submit" disabled={isUpdating} className="bg-[#0176D3] text-white px-4 py-2 rounded text-sm font-semibold">{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
