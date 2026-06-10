import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Users, FolderKanban, Plus, X, AlertCircle, CheckCircle2, LineChart, DollarSign, TrendingUp } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { db, firebaseConfig } from '../config/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export default function SettingsDashboard() {
  const { userProfile, impersonateUser } = useCRM();
  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios' | 'proyectos' | 'finanzas'>('empresas');

  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Formularios
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantRuc, setNewTenantRuc] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('starter');
  const [newTenantFirstProject, setNewTenantFirstProject] = useState('');

  const [newUser, setNewUser] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    role: 'manager',
    password: ''
  });

  const [newProject, setNewProject] = useState({
    tenantId: '',
    name: ''
  });

  // Generador Inteligente
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);
  const [collisionError, setCollisionError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createProjectError, setCreateProjectError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{username: string, password: string} | null>(null);

  // Carga inicial
  useEffect(() => {
    if (userProfile?.role !== 'owner') return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tenantsSnap, usersSnap, projectsSnap] = await Promise.all([
          getDocs(collection(db, 'tenants')),
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'projects'))
        ]);

        setTenants(tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile?.role]);

  // Lógica de Generación de Usuario
  useEffect(() => {
    if (!newUser.firstName || !newUser.lastName) {
      setGeneratedUsername('');
      setCollisionError('');
      return;
    }

    const apellido = newUser.lastName.trim().split(' ')[0];
    const letrasNombre = newUser.firstName.trim().substring(0, 2);

    const formatStr = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const baseUsername = `${formatStr(apellido)}${formatStr(letrasNombre)}`;

    setGeneratedUsername(baseUsername);
    checkCollision(baseUsername);

  }, [newUser.firstName, newUser.lastName]);

  const checkCollision = async (username: string) => {
    setIsCheckingCollision(true);
    setCollisionError('');
    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);

      if (!snap.empty) {
        let i = 2;
        while (true) {
          const testUsername = `${username}${i}`;
          const qTest = query(collection(db, 'users'), where('username', '==', testUsername));
          const snapTest = await getDocs(qTest);
          if (snapTest.empty) {
            setCollisionError(`El usuario ya existe. Sugerencia: ${testUsername}`);
            break;
          }
          i++;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingCollision(false);
    }
  };

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

    // --- RESTRICCIONES DE PLANES (BILLING ENGINE) ---
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
    // ------------------------------------------------
    
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
        setProjects(prev => [{ id: projRef.id, ...projectData, createdAt: new Date() }, ...prev]);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collisionError || !generatedUsername || !newUser.tenantId) return;

    setCreateError('');

    // --- RESTRICCIONES DE PLANES (BILLING ENGINE) ---
    const selectedTenant = tenants.find(t => t.id === newUser.tenantId);
    if (selectedTenant) {
      const plan = selectedTenant.plan || 'starter';
      const tenantUsersCount = users.filter(u => u.tenantId === newUser.tenantId).length;
      
      if (plan === 'starter' && tenantUsersCount >= 15) {
        setCreateError('Límite del Plan Starter alcanzado (Máx 15 usuarios). Actualiza la empresa a plan PRO para asesores ilimitados.');
        return;
      }
    }
    // ------------------------------------------------

    setIsCreating(true);

    try {
      const fakeEmail = `${generatedUsername.toLowerCase()}@crm.local`;
      const cred = await createUserWithEmailAndPassword(secondaryAuth, fakeEmail, newUser.password);

      const fullName = `${newUser.firstName.trim()} ${newUser.lastName.trim()}`;

      const newDoc = {
        name: fullName,
        email: fakeEmail,
        username: generatedUsername,
        role: newUser.role,
        tenantId: newUser.tenantId,
        projects: ['all'],
        status: 'active',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', cred.user.uid), newDoc);
      await secondaryAuth.signOut();

      setUsers(prev => [{ id: cred.user.uid, ...newDoc, createdAt: new Date() }, ...prev]);
      
      // En vez de cerrar el modal, mostramos las credenciales una sola vez
      setCreatedCredentials({
        username: generatedUsername,
        password: newUser.password
      });
      
      setNewUser({ tenantId: '', firstName: '', lastName: '', role: 'manager', password: '' });

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/weak-password') {
        setCreateError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setCreateError('Hubo un error al crear el usuario. ' + err.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Cálculos Financieros
  const activeTenants = tenants.filter(t => t.status === 'active' || !t.status);
  const suspendedTenantsCount = tenants.length - activeTenants.length;
  
  const planPrices = {
    starter: 49,
    pro: 99,
    enterprise: 299
  };

  const mrr = activeTenants.reduce((sum, t) => sum + (planPrices[t.plan as keyof typeof planPrices] || 49), 0);
  const arr = mrr * 12;

  const planCounts = activeTenants.reduce((acc, t) => {
    acc[t.plan as keyof typeof planCounts] = (acc[t.plan as keyof typeof planCounts] || 0) + 1;
    return acc;
  }, { starter: 0, pro: 0, enterprise: 0 });

  if (userProfile?.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión global de empresas inmobiliarias y asignación de personal.</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('empresas')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'empresas' ? 'border-[#0176D3] text-[#0176D3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={18} /> Inmobiliarias
        </button>
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'usuarios' ? 'border-[#0176D3] text-[#0176D3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={18} /> Todos los Empleados
        </button>
        <button 
          onClick={() => setActiveTab('proyectos')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'proyectos' ? 'border-[#0176D3] text-[#0176D3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FolderKanban size={18} /> Proyectos
        </button>
        <button 
          onClick={() => setActiveTab('finanzas')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'finanzas' ? 'border-[#0176D3] text-[#0176D3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <LineChart size={18} /> Finanzas
        </button>
      </div>

      {/* EMPRESAS */}
      {activeTab === 'empresas' && (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="text-center py-4">Cargando...</td></tr> : tenants.map(t => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Directorio Global</h2>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="bg-[#0176D3] text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-[#015C99] flex items-center gap-2"
            >
              <Plus size={16} /> Nuevo Empleado
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-500">Empresa</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Nombre</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Usuario</th>
                <th className="px-6 py-3 font-semibold text-slate-500">Rol</th>
                <th className="px-6 py-3 font-semibold text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={4} className="text-center py-4">Cargando...</td></tr> : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-500">{tenants.find(t => t.id === u.tenantId)?.name || 'N/A'}</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">{u.name}</td>
                  <td className="px-6 py-3 text-[#0176D3] font-bold">{u.username || u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'owner' ? 'SUPERADMIN' : u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {u.role !== 'owner' && (
                      <button 
                        onClick={() => impersonateUser(u.id)}
                        className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-sm text-xs font-bold flex items-center justify-end gap-1 ml-auto transition-colors"
                        title="Ver el sistema como este usuario"
                      >
                        👁️ Login As
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PROYECTOS */}
      {activeTab === 'proyectos' && (
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Proyectos Inmobiliarios</h2>
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
              {loading ? <tr><td colSpan={3} className="text-center py-4">Cargando...</td></tr> : projects.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-400">{p.id}</td>
                  <td className="px-6 py-3 font-medium text-slate-500">{tenants.find(t => t.id === p.tenantId)?.name || 'N/A'}</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">{p.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FINANZAS */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MRR Card */}
            <div className="bg-gradient-to-br from-[#0B2B40] to-[#1a4a6b] p-6 rounded-2xl shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ingreso Mensual (MRR)</p>
                  <p className="text-4xl font-bold mt-2">${mrr.toLocaleString('en-US')}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl">
                  <DollarSign size={24} className="text-[#4DB6AC]" />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-[#4DB6AC]">
                <TrendingUp size={16} />
                <span>Métricas en tiempo real</span>
              </div>
            </div>

            {/* ARR Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ingreso Anual (ARR)</p>
                  <p className="text-4xl font-bold mt-2 text-slate-800">${arr.toLocaleString('en-US')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <LineChart size={24} className="text-[#0176D3]" />
                </div>
              </div>
            </div>

            {/* Clientes Activos Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inmobiliarias Activas</p>
                  <p className="text-4xl font-bold mt-2 text-slate-800">{activeTenants.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Building2 size={24} className="text-[#0176D3]" />
                </div>
              </div>
              {suspendedTenantsCount > 0 && (
                <div className="mt-6 text-sm text-red-500 font-medium">
                  {suspendedTenantsCount} empresa(s) suspendida(s)
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Desglose por Planes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-500">Plan STARTER</p>
                  <p className="text-xs text-slate-400 mt-1">$49 / mes</p>
                </div>
                <p className="text-2xl font-bold text-slate-700">{planCounts.starter}</p>
              </div>
              <div className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-indigo-50">
                <div>
                  <p className="text-sm font-bold text-indigo-600">Plan PRO</p>
                  <p className="text-xs text-indigo-400 mt-1">$99 / mes</p>
                </div>
                <p className="text-2xl font-bold text-indigo-800">{planCounts.pro}</p>
              </div>
              <div className="p-4 border border-[#0B2B40] rounded-xl flex justify-between items-center bg-[#0B2B40] text-white">
                <div>
                  <p className="text-sm font-bold text-[#4DB6AC]">Plan ENTERPRISE</p>
                  <p className="text-xs text-slate-300 mt-1">$299 / mes</p>
                </div>
                <p className="text-2xl font-bold text-white">{planCounts.enterprise}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMPRESA */}
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

      {/* MODAL USUARIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
              <h3 className="font-semibold">{createdCredentials ? '¡Empleado Registrado!' : 'Registrar Empleado'}</h3>
              <button onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }}><X size={20} className="text-slate-400" /></button>
            </div>

            {createdCredentials ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Credenciales Generadas</h4>
                <p className="text-sm text-slate-500 mb-6 px-4">Por motivos de seguridad, esta contraseña no se volverá a mostrar en el sistema. Cópiala y envíasela al empleado ahora.</p>
                
                <div className="bg-slate-50 border border-slate-200 rounded p-4 text-left mb-6">
                  <div className="mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
                    <div className="font-mono text-lg font-bold text-slate-800">{createdCredentials.username}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                    <div className="font-mono text-lg font-bold text-[#0176D3]">{createdCredentials.password}</div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }}
                    className="px-6 py-2 border rounded font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(`Credenciales CRM\nUsuario: ${createdCredentials.username}\nContraseña: ${createdCredentials.password}`)}
                    className="px-6 py-2 bg-[#0176D3] text-white rounded font-semibold shadow-sm hover:bg-[#015C99]"
                  >
                    Copiar al Portapapeles
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa Destino</label>
                <select required value={newUser.tenantId} onChange={e => setNewUser({ ...newUser, tenantId: e.target.value })} className="w-full border rounded p-2 text-sm">
                  <option value="">Seleccione una inmobiliaria...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombres</label><input type="text" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} className="w-full border rounded p-2 text-sm" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos</label><input type="text" required value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} className="w-full border rounded p-2 text-sm" /></div>
              </div>

              <div className="bg-slate-50 border rounded p-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario Generado</label>
                <div className="font-mono text-lg text-[#0176D3] font-bold">{generatedUsername || '---'}</div>
                {collisionError ? <p className="text-xs text-rose-600 mt-1">{collisionError}</p> : generatedUsername ? <p className="text-xs text-emerald-600 mt-1">Disponible</p> : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border rounded p-2 text-sm">
                  <option value="manager">Gerente (Administrador de Empresa)</option>
                  <option value="agent">Asesor de Ventas</option>
                </select>
              </div>              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña Inicial</label>
                <div className="flex gap-2">
                  <input type="text" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="flex-1 border rounded p-2 text-sm" placeholder="Mínimo 6 caracteres" />
                  <button 
                    type="button" 
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
                      let pass = '';
                      for(let i=0; i<8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      setNewUser({...newUser, password: pass});
                    }}
                    className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Aleatoria
                  </button>
                </div>
              </div>

              {createError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded">{createError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                <button type="submit" disabled={isCreating || !!collisionError} className="bg-[#0176D3] text-white px-4 py-2 rounded text-sm font-semibold">{isCreating ? 'Creando...' : 'Crear Usuario'}</button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL PROYECTO */}
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
