import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Plus, X, CheckCircle2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, query, getDocs, doc, setDoc, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const secondaryAppName = "SecondaryApp";
const secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
const secondaryAuth = getAuth(secondaryApp);

export default function UsersView() {
  const { userProfile, impersonateUser } = useCRM();
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal y form
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    role: 'manager',
    password: ''
  });

  const [generatedUsername, setGeneratedUsername] = useState('');
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);
  const [collisionError, setCollisionError] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{username: string, password: string} | null>(null);

  useEffect(() => {
    if (userProfile?.role !== 'owner') return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [usersSnap, tenantsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'tenants'))
        ]);
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTenants(tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile?.role]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collisionError || !generatedUsername || !newUser.tenantId) return;

    setCreateError('');

    const selectedTenant = tenants.find(t => t.id === newUser.tenantId);
    if (selectedTenant) {
      const plan = selectedTenant.plan || 'starter';
      const tenantUsersCount = users.filter(u => u.tenantId === newUser.tenantId).length;
      
      if (plan === 'starter' && tenantUsersCount >= 15) {
        setCreateError('Límite del Plan Starter alcanzado (Máx 15 usuarios). Actualiza la empresa a plan PRO para asesores ilimitados.');
        return;
      }
    }

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

  if (userProfile?.role !== 'owner') return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Directorio Global de Empleados</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de usuarios y suplantación de identidad para soporte.</p>
      </div>

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
            {loading ? <tr><td colSpan={5} className="text-center py-4 font-semibold text-slate-500">Cargando usuarios...</td></tr> : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
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
                    Copiar
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
              </div>
              
              <div>
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
    </div>
  );
}
