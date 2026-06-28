import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle2, MoreVertical, Power, PowerOff, CalendarOff, Edit, LogIn, Palmtree } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useRoles } from '../hooks/useRoles';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';


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

  // Roles and Effective Tenant
  const effectiveTenantId = userProfile?.role === 'owner' ? newUser.tenantId : userProfile?.tenantId;
  const { roles: customRoles, refreshRoles } = useRoles(effectiveTenantId || undefined);

  // Generador Inteligente
  const [generatedUsername, setGeneratedUsername] = useState('');
  
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
      const fullEmail = `${generatedUsername}@crm.local`.toLowerCase();
      const finalRole = newUser.role === 'agent' ? newUser.customRoleId : newUser.role;

      // 1. Generar invitación B2B en background
      const { data: invData, error: invError } = await supabase
        .from('user_invitations')
        .insert({
          email: fullEmail,
          tenant_id: effectiveTenantId,
          role: finalRole
        })
        .select()
        .single();

      if (invError) throw new Error("Error autorizando creación: " + invError.message);

      // 2. Registrar el usuario en Auth usando el token
      const { data: cred, error: signUpError } = await secondarySupabase.auth.signUp({
        email: fullEmail,
        password: newUser.password,
        options: {
          data: {
            invitation_token: invData.token,
            full_name: `${newUser.firstName.trim()} ${newUser.lastName.trim()}`
          }
        }
      });

      if (signUpError || !cred.user) throw signUpError || new Error("Error creando auth user");

      // El trigger on_auth_user_created (Postgres) ya insertó al usuario en public.users
      const newDoc = {
        id: cred.user.id,
        uid: cred.user.id,
        name: `${newUser.firstName.trim()} ${newUser.lastName.trim()}`,
        email: fullEmail,
        role: finalRole,
        tenant_id: effectiveTenantId,
        status: 'active',
        created_at: new Date()
      };

      setUsers(prev => [newDoc, ...prev]);
      
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
    <>
      <div className="slds-page-header slds-m-bottom_large" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-user" title="Directorio Global" style={{ backgroundColor: '#65CAE4' }}>
                  <svg className="slds-icon slds-page-header__icon" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#FFFFFF', color: '#FFFFFF' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <span className="slds-page-header__title slds-truncate" title="Equipo y Usuarios">Equipo y Usuarios</span>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión del Directorio Global</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                <button onClick={() => { setIsUserModalOpen(true); refreshRoles(); }} className="slds-button slds-button_brand">
                  <Plus size={16} className="slds-button__icon slds-button__icon_left" />
                  Nuevo Empleado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <article className="slds-card slds-m-bottom_large">
        <div className="slds-card__header slds-grid">
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Directorio de Empleados</span>
              </h2>
            </div>
          </header>
        </div>
        <div className="slds-card__body slds-card__body_inner">
          <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_hover">
            <thead>
              <tr className="slds-line-height_reset">
                {userProfile?.role === 'owner' && <th className="slds-text-title_caps"><div className="slds-truncate">Empresa</div></th>}
                <th className="slds-text-title_caps"><div className="slds-truncate">Nombre</div></th>
                <th className="slds-text-title_caps"><div className="slds-truncate">Usuario</div></th>
                <th className="slds-text-title_caps"><div className="slds-truncate">Rol</div></th>
                <th className="slds-text-title_caps slds-text-align_right"><div className="slds-truncate">Acciones</div></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={userProfile?.role === 'owner' ? 5 : 4} className="slds-text-align_center slds-p-around_medium">Cargando...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="slds-hint-parent">
                  {userProfile?.role === 'owner' && (
                    <td data-label="Empresa">
                      <div className="slds-truncate slds-text-color_weak">{tenants.find(t => t.id === u.tenantId)?.name || 'N/A'}</div>
                    </td>
                  )}
                  <td data-label="Nombre">
                    <div className="slds-truncate" style={{ fontWeight: 600 }}>{u.name}</div>
                  </td>
                  <td data-label="Usuario">
                    <div className="slds-truncate slds-text-color_default">{u.username || u.email}</div>
                  </td>
                  <td data-label="Rol">
                    <div className="slds-truncate" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="slds-badge">
                        {u.role === 'owner' ? 'DUEÑO' : u.role === 'manager' ? 'GERENTE' : u.role === 'agent' ? 'ASESOR' : u.role.toUpperCase()}
                      </span>
                      {u.status === 'suspended' && (
                        <span className="slds-badge slds-theme_error">SUSPENDIDO</span>
                      )}
                      {u.outOfOffice && (
                        <span className="slds-badge slds-theme_warning">
                          <Palmtree size={12} style={{ display: 'inline', marginRight: '4px' }}/> OOO
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Acciones" className="slds-text-align_right">
                    <div className="slds-truncate" style={{ position: 'relative' }}>
                      {u.role !== 'owner' && userProfile?.role === 'owner' && (
                        <button 
                          onClick={() => impersonateUser(u.id)}
                          className="slds-button slds-button_outline-brand slds-m-right_x-small"
                          title="Ver el sistema como este usuario"
                        >
                          <LogIn size={14} className="slds-button__icon slds-button__icon_left" /> Login As
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                        className="slds-button slds-button_icon slds-button_icon-border-filled"
                      >
                        <MoreVertical size={16} />
                        <span className="slds-assistive-text">Opciones</span>
                      </button>

                      {activeDropdown === u.id && (
                        <div className="slds-dropdown slds-dropdown_right" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100 }}>
                          <ul className="slds-dropdown__list" role="menu">
                            <li className="slds-dropdown__item" role="presentation">
                              <a href="#" role="menuitem" onClick={(e) => { e.preventDefault(); setActiveDropdown(null); }}>
                                <span className="slds-truncate"><Edit size={14} className="slds-m-right_x-small"/> Editar Perfil</span>
                              </a>
                            </li>
                            <li className="slds-dropdown__item" role="presentation">
                              <a href="#" role="menuitem" onClick={(e) => { e.preventDefault(); handleToggleOoo(u.id, u.outOfOffice); }}>
                                <span className="slds-truncate"><CalendarOff size={14} className="slds-m-right_x-small"/> {u.outOfOffice ? 'Desactivar Ausencia' : 'Vacaciones/Ausencia'}</span>
                              </a>
                            </li>
                            <li className="slds-has-divider_top-space" role="separator"></li>
                            <li className="slds-dropdown__item" role="presentation">
                              <a href="#" role="menuitem" onClick={(e) => { e.preventDefault(); handleToggleStatus(u.id, u.status); }}>
                                <span className="slds-truncate" style={{ color: u.status === 'suspended' ? '#059669' : '#dc2626' }}>
                                  {u.status === 'suspended' ? <Power size={14} className="slds-m-right_x-small"/> : <PowerOff size={14} className="slds-m-right_x-small"/>} 
                                  {u.status === 'suspended' ? 'Activar Acceso' : 'Suspender Acceso'}
                                </span>
                              </a>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Modal SLDS */}
      {isUserModalOpen && (
        <>
          <section role="dialog" tabIndex={-1} className="slds-modal slds-fade-in-open slds-modal_small">
            <div className="slds-modal__container">
              <header className="slds-modal__header">
                <button 
                  className="slds-button slds-button_icon slds-modal__close" 
                  title="Cerrar"
                  onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }}
                >
                  <X size={24} />
                  <span className="slds-assistive-text">Cerrar</span>
                </button>
                <h2 className="slds-text-heading_medium slds-hyphenate">{createdCredentials ? '¡Empleado Registrado!' : 'Registrar Empleado'}</h2>
              </header>

              <div className="slds-modal__content slds-p-around_medium">
                {createdCredentials ? (
                  <div className="slds-text-align_center">
                    <div style={{width: '64px', height: '64px', backgroundColor: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'}}>
                      <CheckCircle2 size={32} color="#059669" />
                    </div>
                    <h3 className="slds-text-heading_small slds-m-bottom_x-small">Credenciales Generadas</h3>
                    <p className="slds-text-color_weak slds-m-bottom_large">Por motivos de seguridad, esta contraseña no se volverá a mostrar en el sistema. Cópiala y envíasela al empleado ahora.</p>
                    
                    <div className="slds-box slds-m-bottom_large slds-text-align_left" style={{ backgroundColor: '#f3f3f3' }}>
                      <div className="slds-m-bottom_small">
                        <span className="slds-text-title_caps slds-m-bottom_xx-small" style={{display: 'block'}}>Usuario</span>
                        <div style={{fontSize: '18px', fontWeight: 700, fontFamily: 'monospace'}}>{createdCredentials.username}</div>
                      </div>
                      <div>
                        <span className="slds-text-title_caps slds-m-bottom_xx-small" style={{display: 'block'}}>Contraseña</span>
                        <div style={{fontSize: '18px', fontWeight: 700, color: '#0176D3', fontFamily: 'monospace'}}>{createdCredentials.password}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form id="newUserForm" onSubmit={handleCreateUser} className="slds-form slds-form_stacked">
                    {userProfile?.role === 'owner' && (
                      <div className="slds-form-element slds-m-bottom_small">
                        <label className="slds-form-element__label">Empresa Destino</label>
                        <div className="slds-form-element__control">
                          <div className="slds-select_container">
                            <select required value={newUser.tenantId} onChange={e => setNewUser({ ...newUser, tenantId: e.target.value })} className="slds-select">
                              <option value="">Seleccione una inmobiliaria...</option>
                              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="slds-grid slds-gutters slds-m-bottom_small">
                      <div className="slds-col slds-size_1-of-2">
                        <div className="slds-form-element">
                          <label className="slds-form-element__label">Nombres</label>
                          <div className="slds-form-element__control">
                            <input type="text" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} className="slds-input" />
                          </div>
                        </div>
                      </div>
                      <div className="slds-col slds-size_1-of-2">
                        <div className="slds-form-element">
                          <label className="slds-form-element__label">Apellidos</label>
                          <div className="slds-form-element__control">
                            <input type="text" required value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} className="slds-input" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="slds-box slds-m-bottom_small" style={{ backgroundColor: '#f9f9f9', padding: '1rem' }}>
                      <div className="slds-form-element">
                        <label className="slds-form-element__label">Usuario / Correo de Acceso</label>
                        <div className="slds-form-element__control slds-grid slds-grid_vertical-align-center">
                          <input 
                            type="text" 
                            required 
                            value={generatedUsername} 
                            onChange={e => {
                               setGeneratedUsername(e.target.value);
                               checkCollision(e.target.value);
                            }} 
                            className="slds-input slds-m-right_small" 
                            style={{fontSize: '16px', color: '#0176D3', fontWeight: 700, fontFamily: 'monospace'}} 
                          />
                          <span className="slds-text-color_weak">@crm.local</span>
                        </div>
                        {collisionError ? <div className="slds-text-color_error slds-m-top_xx-small">{collisionError}</div> : generatedUsername ? <div className="slds-text-color_success slds-m-top_xx-small">Disponible</div> : null}
                      </div>
                    </div>

                    <div className="slds-form-element slds-m-bottom_small">
                      <label className="slds-form-element__label">Rol del Sistema</label>
                      <div className="slds-form-element__control">
                        <div className="slds-select_container">
                          <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, customRoleId: '' })} className="slds-select">
                            <option value="manager">Gerente (Acceso Total de Empresa)</option>
                            <option value="agent">Asesor / Rol Personalizado...</option>
                          </select>
                        </div>
                      </div>
                    </div>              

                    {newUser.role === 'agent' && (
                      <div className="slds-form-element slds-m-bottom_small">
                        <label className="slds-form-element__label">Seleccione el Rol Personalizado</label>
                        <div className="slds-form-element__control">
                          <div className="slds-select_container">
                            <select required value={newUser.customRoleId} onChange={e => setNewUser({ ...newUser, customRoleId: e.target.value })} className="slds-select">
                              <option value="">Seleccione un rol...</option>
                              {customRoles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {customRoles.length === 0 && (
                          <div className="slds-text-color_error slds-m-top_xx-small">
                            No hay roles personalizados en esta empresa. Ve a Configuración &gt; Roles y Permisos.
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="slds-form-element slds-m-bottom_small">
                      <label className="slds-form-element__label">Contraseña Inicial</label>
                      <div className="slds-form-element__control slds-grid slds-gutters">
                        <div className="slds-col slds-size_3-of-4">
                          <input type="text" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="slds-input" placeholder="Mínimo 6 caracteres" />
                        </div>
                        <div className="slds-col slds-size_1-of-4">
                          <button 
                            type="button" 
                            onClick={() => {
                              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
                              let pass = '';
                              for(let i=0; i<8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                              setNewUser({...newUser, password: pass});
                            }}
                            className="slds-button slds-button_neutral slds-size_1-of-1"
                          >
                            Aleatoria
                          </button>
                        </div>
                      </div>
                    </div>

                    {createError && (
                      <div className="slds-notify slds-notify_alert slds-alert_error" role="alert">
                        <h2>{createError}</h2>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <footer className="slds-modal__footer">
                {createdCredentials ? (
                  <>
                    <button onClick={() => { setIsUserModalOpen(false); setCreatedCredentials(null); }} className="slds-button slds-button_neutral">Cerrar</button>
                    <button onClick={() => navigator.clipboard.writeText(`Credenciales CRM\nUsuario: ${createdCredentials.username}\nContraseña: ${createdCredentials.password}`)} className="slds-button slds-button_brand">Copiar al Portapapeles</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="slds-button slds-button_neutral">Cancelar</button>
                    <button type="submit" form="newUserForm" disabled={isCreating || !!collisionError} className="slds-button slds-button_brand">
                      {isCreating ? 'Creando...' : 'Crear Usuario'}
                    </button>
                  </>
                )}
              </footer>
            </div>
          </section>
          <div className="slds-backdrop slds-backdrop_open" role="presentation"></div>
        </>
      )}
    </>
  );
}
