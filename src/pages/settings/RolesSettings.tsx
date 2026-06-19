import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Shield } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCRM } from '../../context/CRMContext';
import { useRoles } from '../../hooks/useRoles';
import type { RolePermission, ModulePermissions } from '../../types/definitions';
import styles from './RolesSettings.module.css';

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
    return <div className={styles.emptyState}>No tienes permisos para ver esta sección.</div>;
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
      const dataToSave = { ...editingRole };
      delete dataToSave.id;

      if (editingRole.id === 'new_temp_id') {
        const docRef = await addDoc(collection(db, `tenants/${tenantId}/roles`), dataToSave);
        setActiveRoleId(docRef.id);
      } else {
        await updateDoc(doc(db, `tenants/${tenantId}/roles`, editingRole.id!), dataToSave);
      }
      alert('Rol guardado correctamente.');
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
      await deleteDoc(doc(db, `tenants/${tenantId!}/roles`, id));
      if (activeRoleId === id) setActiveRoleId(null);
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

  if (loading) return <div className={styles.emptyState}>Cargando roles...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Roles y Permisos</h2>
          <p className={styles.subtitle}>Configura el acceso granular a los módulos (RBAC).</p>
        </div>
        <button onClick={handleAddNew} className={styles.btnAdd}>
          <Plus size={16} /> Crear Rol
        </button>
      </div>

      <div className={styles.rolesGrid}>
        {/* SIDEBAR ROLES */}
        <div className={styles.sidebar}>
          {roles.map(role => (
            <div 
              key={role.id}
              className={`${styles.roleTab} ${activeRoleId === role.id ? styles.roleTabActive : ''}`}
              onClick={() => setActiveRoleId(role.id!)}
            >
              <span>{role.name}</span>
              <button className={styles.btnDeleteRole} onClick={(e) => handleDelete(role.id!, e)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {activeRoleId === 'new_temp_id' && (
            <div className={`${styles.roleTab} ${styles.roleTabActive}`}>
              <span>{editingRole?.name}</span>
            </div>
          )}
          {roles.length === 0 && activeRoleId !== 'new_temp_id' && (
            <div className={styles.emptyState} style={{ padding: '20px', fontSize: '13px' }}>
              No hay roles personalizados.
            </div>
          )}
        </div>

        {/* EDITOR DE ROL */}
        {editingRole ? (
          <div className={styles.editorCard}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre del Rol</label>
              <input 
                className={styles.input}
                value={editingRole.name}
                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                placeholder="Ej. Asistente Comercial"
              />
            </div>

            <div className={styles.modulesGrid}>
              {/* Módulo Leads */}
              <div className={styles.moduleBox}>
                <div className={styles.moduleHeader}>Módulo: Prospectos (Leads)</div>
                <div className={styles.moduleContent}>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Ver</span>
                    <select 
                      className={styles.select}
                      value={editingRole.permissions.leads.read}
                      onChange={e => updateModulePerm('leads', 'read', e.target.value)}
                    >
                      <option value="all">Todos los leads</option>
                      <option value="own">Solo los asignados a sí mismo</option>
                      <option value="none">Ninguno</option>
                    </select>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Crear</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.leads.create} onChange={e => updateModulePerm('leads', 'create', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Editar</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.leads.update} onChange={e => updateModulePerm('leads', 'update', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Eliminar</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.leads.delete} onChange={e => updateModulePerm('leads', 'delete', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Módulo Inventario */}
              <div className={styles.moduleBox}>
                <div className={styles.moduleHeader}>Módulo: Inventario</div>
                <div className={styles.moduleContent}>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Ver</span>
                    <select 
                      className={styles.select}
                      value={editingRole.permissions.inventory.read}
                      onChange={e => updateModulePerm('inventory', 'read', e.target.value)}
                    >
                      <option value="all">Todo el inventario</option>
                      <option value="none">Ninguno</option>
                    </select>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Crear</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.inventory.create} onChange={e => updateModulePerm('inventory', 'create', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Editar</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.inventory.update} onChange={e => updateModulePerm('inventory', 'update', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Eliminar</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={editingRole.permissions.inventory.delete} onChange={e => updateModulePerm('inventory', 'delete', e.target.checked)} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Configuraciones */}
              <div className={styles.moduleBox}>
                <div className={styles.moduleHeader}>Configuración General</div>
                <div className={styles.moduleContent}>
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>Administrar Configuración (Modelos, Roles, etc.)</span>
                    <label className={styles.switch}>
                      <input 
                        type="checkbox" 
                        checked={editingRole.permissions.settings.manage} 
                        onChange={e => setEditingRole({...editingRole, permissions: {...editingRole.permissions, settings: {manage: e.target.checked}}})} 
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Shield size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            Selecciona o crea un rol para configurar sus permisos.
          </div>
        )}
      </div>
    </div>
  );
}
