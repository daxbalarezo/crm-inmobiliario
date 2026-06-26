import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle2, MoreVertical, Power, PowerOff, CalendarOff, Edit, LogIn, Palmtree } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useRoles } from '../hooks/useRoles';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import styles from './SettingsDashboard.module.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

  // Dropdown menus
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        if (userProfile.role === 'owner') {
          const { data: tenantsSnap } = await supabase.from('tenants').select('*');
          const { data: usersSnap } = await supabase.from('users').select('*').order('created_at', { ascending: false });
          
          setTenants(tenantsSnap || []);
          setUsers((usersSnap || []).map(u => ({ id: u.uid, ...u })));
        } else {
          // Manager
          const { data: tenantSnap } = await supabase.from('tenants').select('*').eq('id', userProfile.tenantId);
          const { data: usersSnap } = await supabase.from('users').select('*').eq('tenant_id', userProfile.tenantId);
          
          setTenants(tenantSnap || []);
          setUsers((usersSnap || []).map(u => ({ id: u.uid, ...u })));
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
      const { data } = await supabase.from('users').select('uid').eq('email', `${username}@crm.local`);

      if (data && data.length > 0) {
        let i = 2;
        while (true) {
          const testUsername = `${username}${i}`;
          const { data: testData } = await supabase.from('users').select('uid').eq('email', `${testUsername}@crm.local`);
          
          if (!testData || testData.length === 0) {
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
      const { data: cred, error: signUpError } = await secondarySupabase.auth.signUp({
        email: fullEmail,
        password: newUser.password
      });

      if (signUpError || !cred.user) throw signUpError || new Error("Error creating auth user");

      const newDoc = {
        uid: cred.user.id,
        name: `${newUser.firstName.trim()} ${newUser.lastName.trim()}`,
        email: fullEmail,
        role: newUser.role,
        tenant_id: newUser.tenantId
      };

      const { error: insertError } = await supabase.from('users').insert(newDoc);
      if (insertError) throw insertError;

      setUsers(prev => [{ id: cred.user.id, ...newDoc, status: 'active', created_at: new Date() }, ...prev]);
      
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

  const handleToggleStatus = async (userId: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await supabase.from('users').update({ status: newStatus }).eq('uid', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (e) {
      console.error(e);
    }
    setActiveDropdown(null);
  };

  const handleToggleOoo = async (userId: string, currentOoo: boolean | undefined) => {
    const newOoo = !currentOoo;
    try {
      await supabase.from('users').update({ out_of_office: newOoo }).eq('uid', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, out_of_office: newOoo } : u));
    } catch (e) {
      console.error(e);
    }
    setActiveDropdown(null);
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`${styles.badge} ${u.role === 'owner' ? styles.badgeSuperadmin : u.role === 'manager' ? styles.badgeManager : styles.badgeAgent}`}>
                        {u.role === 'owner' ? 'DUEÑO' : u.role === 'manager' ? 'GERENTE' : u.role === 'agent' ? 'ASESOR' : u.role.toUpperCase()}
                      </span>
                      {u.status === 'suspended' && (
                        <span className={`${styles.badge} ${styles.badgeSuspended}`}>
                          SUSPENDIDO
                        </span>
                      )}
                      {u.outOfOffice && (
                        <span className={`${styles.badge} ${styles.badgeActive}`} style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                          <Palmtree size={12} style={{ display: 'inline', marginRight: '4px' }}/> OOO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      {u.role !== 'owner' && userProfile?.role === 'owner' && (
                        <button 
                          onClick={() => impersonateUser(u.id)}
                          className={styles.btnAction}
                          title="Ver el sistema como este usuario"
                          style={{ marginRight: '8px' }}
                        >
                          <LogIn size={14} style={{ display: 'inline', marginRight: '4px' }} /> Login As
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                        className={styles.btnAction}
                        style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeDropdown === u.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 100, boxShadow: 'var(--shadow-lg)', minWidth: '180px', overflow: 'hidden', textAlign: 'left' }}>
                          <button style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }} onClick={() => setActiveDropdown(null)}>
                            <Edit size={14} /> Editar Perfil
                          </button>
                          <button style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }} onClick={() => handleToggleOoo(u.id, u.outOfOffice)}>
                            <CalendarOff size={14} color="#64748b" /> {u.outOfOffice ? 'Desactivar Ausencia' : 'Vacaciones/Ausencia'}
                          </button>
                          
                          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                          
                          <button style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: u.status === 'suspended' ? '#059669' : '#dc2626' }} onClick={() => handleToggleStatus(u.id, u.status)}>
                            {u.status === 'suspended' ? <Power size={14} /> : <PowerOff size={14} />} 
                            {u.status === 'suspended' ? 'Activar Acceso' : 'Suspender Acceso'}
                          </button>
                        </div>
                      )}
                    </div>
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
