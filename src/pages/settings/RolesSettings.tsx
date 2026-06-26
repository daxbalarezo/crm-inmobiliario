import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Shield } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useCRM } from '../../context/CRMContext';
import { useRoles } from '../../hooks/useRoles';
import type { RolePermission, ModulePermissions } from '../../types/definitions';

const DEFAULT_MODULE_PERM: ModulePermissions = {
  read: 'own',
  create: true,
  update: false,
  delete: false
};

const DEFAULT_NEW_ROLE: Omit<RolePermission, 'id'> = {
  name: 'Nuevo Rol',
  tenantId: '',
  permissions: {
    leads: { ...DEFAULT_MODULE_PERM },
    inventory: { ...DEFAULT_MODULE_PERM },
    settings: { manage: false }
  }
};

export default function RolesSettings() {
  const { tenantId, userPermissions } = useCRM();
  const { roles, loading } = useRoles(tenantId || undefined);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roles.length > 0 && !activeRoleId) {
      setActiveRoleId(roles[0].id!);
    }
  }, [roles, activeRoleId]);

  useEffect(() => {
    if (activeRoleId) {
      const role = roles.find(r => r.id === activeRoleId);
      if (role) setEditingRole(JSON.parse(JSON.stringify(role)));
    } else {
      setEditingRole(null);
    }
  }, [activeRoleId, roles]);

  if (!userPermissions.settings.manage) {
    return <div className="slds-illustration slds-illustration_large slds-p-around_xx-large slds-text-align_center slds-text-color_weak">No tienes permisos para ver esta sección.</div>;
  }

  const handleAddNew = () => {
    const newRole: RolePermission = {
      ...DEFAULT_NEW_ROLE,
      tenantId: tenantId!,
      id: 'new_temp_id' // Temporal id for UI
    };
    setEditingRole(newRole);
    setActiveRoleId('new_temp_id');
  };

  const handleSave = async () => {
    if (!editingRole || !tenantId) return;
    setSaving(true);
    try {
      if (editingRole.id === 'new_temp_id') {
        const { data, error } = await supabase
          .from('roles')
          .insert([{ 
            tenant_id: tenantId, 
            name: editingRole.name, 
            permissions: editingRole.permissions 
          }])
          .select()
          .single();
          
        if (error) throw error;
        setActiveRoleId(data.id);
      } else {
        const { error } = await supabase
          .from('roles')
          .update({ name: editingRole.name, permissions: editingRole.permissions })
          .eq('id', editingRole.id);
          
        if (error) throw error;
      }
      alert('Rol guardado correctamente. Por favor recarga la página para reflejar los cambios en el menú.');
    } catch (e: any) {
      console.error(e);
      alert('Error guardando rol.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar este rol?')) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
      if (activeRoleId === id) setActiveRoleId(null);
      alert('Rol eliminado. Recarga la página.');
    } catch (error) {
      console.error(error);
      alert('Error eliminando rol');
    }
  };

  const updateModulePerm = (module: 'leads' | 'inventory', field: keyof ModulePermissions, value: any) => {
    if (!editingRole) return;
    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        [module]: {
          ...editingRole.permissions[module],
          [field]: value
        }
      }
    });
  };

  if (loading) return <div className="slds-text-align_center slds-p-around_xx-large slds-text-color_weak">Cargando roles...</div>;

  return (
    <div className="slds-card slds-m-around_medium" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="slds-card__header slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-p-around_medium" style={{ borderBottom: '1px solid #e5e7eb', margin: 0, padding: '16px 24px' }}>
        <div>
          <h2 className="slds-text-heading_medium slds-font-weight-bold" style={{ fontWeight: 700 }}>Roles y Permisos</h2>
          <p className="slds-text-color_weak">Configura el acceso granular a los módulos (RBAC).</p>
        </div>
        <button onClick={handleAddNew} className="slds-button slds-button_brand">
          <Plus size={16} className="slds-button__icon slds-button__icon_left" /> Crear Rol
        </button>
      </div>

      <div className="slds-grid" style={{ minHeight: '600px' }}>
        {/* SIDEBAR ROLES */}
        <div className="slds-col slds-size_1-of-5" style={{ borderRight: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '16px' }}>
          <nav className="slds-nav-vertical" aria-label="Roles">
            <ul>
              {roles.map(role => (
                <li key={role.id} className={`slds-nav-vertical__item ${activeRoleId === role.id ? 'slds-is-active' : ''}`}>
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setActiveRoleId(role.id!); }}
                    className="slds-nav-vertical__action slds-grid slds-grid_align-spread"
                    style={{ backgroundColor: activeRoleId === role.id ? '#e0f2fe' : 'transparent', color: activeRoleId === role.id ? '#0176D3' : '#475569' }}
                  >
                    <span className="slds-truncate" title={role.name}>{role.name}</span>
                    <button 
                      className="slds-button slds-button_icon slds-button_icon-error" 
                      onClick={(e) => handleDelete(role.id!, e)}
                      title="Eliminar Rol"
                    >
                      <Trash2 size={14} />
                    </button>
                  </a>
                </li>
              ))}
              {activeRoleId === 'new_temp_id' && (
                <li className="slds-nav-vertical__item slds-is-active">
                  <a href="#" className="slds-nav-vertical__action" style={{ backgroundColor: '#e0f2fe', color: '#0176D3' }}>
                    <span className="slds-truncate">{editingRole?.name}</span>
                  </a>
                </li>
              )}
            </ul>
          </nav>
          {roles.length === 0 && activeRoleId !== 'new_temp_id' && (
            <div className="slds-text-align_center slds-p-around_medium slds-text-color_weak">
              No hay roles.
            </div>
          )}
        </div>

        {/* EDITOR DE ROL (MATRIZ CRED) */}
        <div className="slds-col slds-size_4-of-5" style={{ padding: '0' }}>
          {editingRole ? (
            <div className="slds-form slds-form_stacked">
              <div className="slds-p-around_large" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <div className="slds-form-element slds-size_1-of-2">
                  <label className="slds-form-element__label" style={{ fontWeight: 600 }}>Nombre del Rol</label>
                  <div className="slds-form-element__control">
                    <input 
                      className="slds-input"
                      value={editingRole.name}
                      onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                      placeholder="Ej. Asistente Comercial"
                      style={{ fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              <div className="slds-p-around_large">
                <h3 className="slds-text-heading_small slds-m-bottom_medium" style={{ fontWeight: 700, color: '#334155' }}>Permisos de Objetos</h3>
                
                <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_col-bordered slds-table_hover" style={{ border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr className="slds-line-height_reset" style={{ backgroundColor: '#f8fafc' }}>
                      <th className="slds-text-title_caps" scope="col"><div className="slds-truncate">Objeto</div></th>
                      <th className="slds-text-title_caps" scope="col" style={{ width: '200px' }}><div className="slds-truncate">Acceso de Lectura (Read)</div></th>
                      <th className="slds-text-title_caps slds-text-align_center" scope="col" style={{ width: '100px' }}><div className="slds-truncate">Crear</div></th>
                      <th className="slds-text-title_caps slds-text-align_center" scope="col" style={{ width: '100px' }}><div className="slds-truncate">Editar</div></th>
                      <th className="slds-text-title_caps slds-text-align_center" scope="col" style={{ width: '100px' }}><div className="slds-truncate">Eliminar</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Prospectos */}
                    <tr className="slds-hint-parent">
                      <th data-label="Objeto" scope="row">
                        <div className="slds-truncate" style={{ fontWeight: 600 }}>Prospectos (Leads)</div>
                      </th>
                      <td data-label="Acceso de Lectura">
                        <div className="slds-select_container">
                          <select 
                            className="slds-select"
                            value={editingRole.permissions.leads.read}
                            onChange={e => updateModulePerm('leads', 'read', e.target.value)}
                            style={{ height: '30px', padding: '0 12px', fontSize: '13px' }}
                          >
                            <option value="all">Ver Todos</option>
                            <option value="own">Solo Propios</option>
                            <option value="none">Sin Acceso</option>
                          </select>
                        </div>
                      </td>
                      <td data-label="Crear" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="leads-create" checked={editingRole.permissions.leads.create} onChange={e => updateModulePerm('leads', 'create', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="leads-create">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                      <td data-label="Editar" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="leads-update" checked={editingRole.permissions.leads.update} onChange={e => updateModulePerm('leads', 'update', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="leads-update">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                      <td data-label="Eliminar" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="leads-delete" checked={editingRole.permissions.leads.delete} onChange={e => updateModulePerm('leads', 'delete', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="leads-delete">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Inventario */}
                    <tr className="slds-hint-parent">
                      <th data-label="Objeto" scope="row">
                        <div className="slds-truncate" style={{ fontWeight: 600 }}>Inventario (Unidades)</div>
                      </th>
                      <td data-label="Acceso de Lectura">
                        <div className="slds-select_container">
                          <select 
                            className="slds-select"
                            value={editingRole.permissions.inventory.read}
                            onChange={e => updateModulePerm('inventory', 'read', e.target.value)}
                            style={{ height: '30px', padding: '0 12px', fontSize: '13px' }}
                          >
                            <option value="all">Ver Todos</option>
                            <option value="none">Sin Acceso</option>
                          </select>
                        </div>
                      </td>
                      <td data-label="Crear" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="inv-create" checked={editingRole.permissions.inventory.create} onChange={e => updateModulePerm('inventory', 'create', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="inv-create">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                      <td data-label="Editar" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="inv-update" checked={editingRole.permissions.inventory.update} onChange={e => updateModulePerm('inventory', 'update', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="inv-update">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                      <td data-label="Eliminar" className="slds-text-align_center">
                        <div className="slds-checkbox">
                          <input type="checkbox" id="inv-delete" checked={editingRole.permissions.inventory.delete} onChange={e => updateModulePerm('inventory', 'delete', e.target.checked)} />
                          <label className="slds-checkbox__label" htmlFor="inv-delete">
                            <span className="slds-checkbox_faux"></span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="slds-text-heading_small slds-m-bottom_medium slds-m-top_x-large" style={{ fontWeight: 700, color: '#334155' }}>Permisos Administrativos</h3>
                <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_col-bordered slds-table_hover" style={{ border: '1px solid #e5e7eb' }}>
                  <tbody>
                    <tr className="slds-hint-parent">
                      <th data-label="Permiso" scope="row" style={{ width: '40%' }}>
                        <div className="slds-truncate" style={{ fontWeight: 600 }}>Administrar Configuración General</div>
                        <div className="slds-text-color_weak slds-text-body_small">Permite modificar Modelos de Datos, Roles, Automatizaciones y Auditoría.</div>
                      </th>
                      <td data-label="Estado" className="slds-text-align_center">
                        <div className="slds-checkbox_toggle slds-grid slds-grid_vertical-align-center" style={{ justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            name="settings-manage" 
                            value="settings-manage" 
                            aria-describedby="settings-manage" 
                            checked={editingRole.permissions.settings.manage} 
                            onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, settings: {manage: e.target.checked}}})} 
                          />
                          <span id="settings-manage" className="slds-checkbox_faux_container" aria-live="assertive">
                            <span className="slds-checkbox_faux"></span>
                            <span className="slds-checkbox_on">Habilitado</span>
                            <span className="slds-checkbox_off">Inhabilitado</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="slds-p-around_large slds-text-align_right" style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
                <button className="slds-button slds-button_brand slds-p-horizontal_x-large" onClick={handleSave} disabled={saving}>
                  <Save size={16} className="slds-button__icon slds-button__icon_left" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          ) : (
            <div className="slds-illustration slds-illustration_large slds-p-around_xx-large slds-text-align_center" style={{ marginTop: '40px' }}>
              <Shield size={64} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <h3 className="slds-text-heading_medium" style={{ color: '#64748b', fontWeight: 500 }}>Selecciona o crea un rol para configurar sus permisos.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
