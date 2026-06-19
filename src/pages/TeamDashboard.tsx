import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useRoles } from '../hooks/useRoles';
import { db, firebaseConfig } from '../config/firebase';
import { collection, query, getDocs, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import styles from './SettingsDashboard.module.css';

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp2");
const secondaryAuth = getAuth(secondaryApp);

export default function TeamDashboard() {
  const { userProfile, impersonateUser } = useCRM();
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({
    tenantId: '',
    firstName: '',
    lastName: '',
    role: 'manager',
    customRoleId: '',
    password: ''
  });

  const { roles: customRoles } = useRoles(newUser.tenantId || undefined);

  // Generador Inteligente
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);
  const [collisionError, setCollisionError] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{username: string, password: string} | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        if (userProfile.role === 'owner') {
          const [tenantsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, 'tenants')),
            getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
          ]);
          setTenants(tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Manager
          const [tenantSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, 'tenants'), where('__name__', '==', userProfile.tenantId))),
            getDocs(query(collection(db, 'users'), where('tenantId', '==', userProfile.tenantId)))
          ]);
          setTenants(tenantSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (collisionError) return;
    if (newUser.role === 'agent' && !newUser.customRoleId) {
      setCreateError('Por favor selecciona un rol personalizado.');
      return;
    }
    
    setIsCreating(true);

    try {
      const fullEmail = `${generatedUsername}@crm.local`;
      const cred = await createUserWithEmailAndPassword(secondaryAuth, fullEmail, newUser.password);

      const newDoc = {
        name: `${newUser.firstName.trim()} ${newUser.lastName.trim()}`,
        email: fullEmail,
        username: generatedUsername,
        role: newUser.role,
        customRoleId: newUser.customRoleId || null,
        tenantId: newUser.tenantId,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', cred.user.uid), newDoc);
      await secondaryAuth.signOut();

      setUsers(prev => [{ id: cred.user.uid, ...newDoc, createdAt: new Date() }, ...prev]);
      
      setCreatedCredentials({
        username: generatedUsername,
        password: newUser.password
      });
      
      setNewUser({ tenantId: '', firstName: '', lastName: '', role: 'manager', customRoleId: '', password: '' });

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Equipo y Usuarios</h2>
          <p className={styles.subtitle}>Gestión del Directorio Global</p>
        </div>
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Directorio de Empleados</h2>
          <button onClick={() => setIsUserModalOpen(true)} className={styles.btnPrimary}>
            <Plus size={16} /> Nuevo Empleado
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {userProfile?.role === 'owner' && <th className={styles.th}>Empresa</th>}
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Usuario</th>
                <th className={styles.th}>Rol</th>
                <th className={`${styles.th} ${styles.thRight}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className={styles.td} style={{textAlign: 'center'}}>Cargando...</td></tr> : users.map(u => (
                <tr key={u.id} className={styles.tr}>
                  {userProfile?.role === 'owner' && (
                    <td className={`${styles.td} ${styles.textMuted}`}>{tenants.find(t => t.id === u.tenantId)?.name || 'N/A'}</td>
                  )}
                  <td className={`${styles.td} ${styles.fontSemibold}`}>{u.name}</td>
                  <td className={`${styles.td} ${styles.textPrimary}`}>{u.username || u.email}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${u.role === 'owner' ? styles.badgeSuperadmin : u.role === 'manager' ? styles.badgeManager : styles.badgeAgent}`}>
                      {u.role === 'owner' ? 'SUPERADMIN' : u.role}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    {u.role !== 'owner' && userProfile?.role === 'owner' && (
                      <button 
                        onClick={() => impersonateUser(u.id)}
                        className={styles.btnAction}
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
      </div>

      {isUserModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{createdCredentials ? '¡Empleado Registrado!' : 'Registrar Empleado'}</h3>
              <button onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }} className={styles.btnClose}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              {createdCredentials ? (
                <div style={{textAlign: 'center'}}>
                  <div style={{width: '64px', height: '64px', backgroundColor: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'}}>
                    <CheckCircle2 size={32} color="#059669" />
                  </div>
                  <h4 style={{fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0'}}>Credenciales Generadas</h4>
                  <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px'}}>Por motivos de seguridad, esta contraseña no se volverá a mostrar en el sistema. Cópiala y envíasela al empleado ahora.</p>
                  
                  <div style={{backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'left', marginBottom: '24px'}}>
                    <div style={{marginBottom: '12px'}}>
                      <label className={styles.formLabel}>Usuario</label>
                      <div className={styles.fontMono} style={{fontSize: '18px', fontWeight: 700}}>{createdCredentials.username}</div>
                    </div>
                    <div>
                      <label className={styles.formLabel}>Contraseña</label>
                      <div className={styles.fontMono} style={{fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)'}}>{createdCredentials.password}</div>
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                    <button onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }} className={styles.btnCancel} style={{border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)'}}>
                      Cerrar
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(`Credenciales CRM\nUsuario: ${createdCredentials.username}\nContraseña: ${createdCredentials.password}`)} className={styles.btnPrimary}>
                      Copiar al Portapapeles
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateUser}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Empresa Destino</label>
                    <select required value={newUser.tenantId} onChange={e => setNewUser({ ...newUser, tenantId: e.target.value })} className={styles.formSelect}>
                      <option value="">Seleccione una inmobiliaria...</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div style={{display: 'flex', gap: '16px', marginBottom: '16px'}}>
                    <div style={{flex: 1}}>
                      <label className={styles.formLabel}>Nombres</label>
                      <input type="text" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} className={styles.formInput} />
                    </div>
                    <div style={{flex: 1}}>
                      <label className={styles.formLabel}>Apellidos</label>
                      <input type="text" required value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} className={styles.formInput} />
                    </div>
                  </div>

                  <div style={{backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px'}}>
                    <label className={styles.formLabel}>Usuario / Correo de Acceso</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input 
                        type="text" 
                        required 
                        value={generatedUsername} 
                        onChange={e => {
                           setGeneratedUsername(e.target.value);
                           checkCollision(e.target.value);
                        }} 
                        className={`${styles.formInput} ${styles.fontMono}`} 
                        style={{flex: 1, fontSize: '16px', color: 'var(--primary-color)', fontWeight: 700}} 
                      />
                      <span className={styles.textMuted}>@crm.local</span>
                    </div>
                    {collisionError ? <p style={{fontSize: '12px', color: '#dc2626', margin: '4px 0 0 0'}}>{collisionError}</p> : generatedUsername ? <p style={{fontSize: '12px', color: '#059669', margin: '4px 0 0 0'}}>Disponible</p> : null}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Rol del Sistema</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, customRoleId: '' })} className={styles.formSelect}>
                      <option value="manager">Gerente (Acceso Total de Empresa)</option>
                      <option value="agent">Rol Personalizado...</option>
                    </select>
                  </div>              

                  {newUser.role === 'agent' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Seleccione el Rol Personalizado</label>
                      <select required value={newUser.customRoleId} onChange={e => setNewUser({ ...newUser, customRoleId: e.target.value })} className={styles.formSelect}>
                        <option value="">Seleccione un rol...</option>
                        {customRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      {customRoles.length === 0 && (
                        <p style={{fontSize: '12px', color: '#dc2626', margin: '4px 0 0 0'}}>
                          No hay roles personalizados en esta empresa. Ve a Configuración &gt; Roles y Permisos.
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Contraseña Inicial</label>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <input type="text" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={styles.formInput} placeholder="Mínimo 6 caracteres" />
                      <button 
                        type="button" 
                        onClick={() => {
                          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
                          let pass = '';
                          for(let i=0; i<8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                          setNewUser({...newUser, password: pass});
                        }}
                        style={{backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer'}}
                      >
                        Aleatoria
                      </button>
                    </div>
                  </div>

                  {createError && <p style={{fontSize: '14px', fontWeight: 600, color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: 'var(--radius-md)', margin: '16px 0 0 0'}}>{createError}</p>}

                  <div className={styles.modalFooter}>
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                    <button type="submit" disabled={isCreating || !!collisionError} className={styles.btnPrimary}>{isCreating ? 'Creando...' : 'Crear Usuario'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
