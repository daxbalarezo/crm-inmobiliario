import React, { useState } from 'react';
import { X, Building2, Users, FolderKanban, Play, Pause, LogIn, Edit2, Save } from 'lucide-react';
import { useCRM } from '../../../../context/CRMContext';

interface TenantDetailPanelProps {
  tenant: any;
  onClose: () => void;
  onUpdateStatus: (tenantId: string, newStatus: string) => Promise<void>;
  onUpdatePlan: (tenantId: string, newPlan: string) => Promise<void>;
  onUpdateDetails: (tenantId: string, updates: { name?: string; ruc?: string }) => Promise<void>;
}

export default function TenantDetailPanel({ tenant, onClose, onUpdateStatus, onUpdatePlan, onUpdateDetails }: TenantDetailPanelProps) {
  const { impersonateUser } = useCRM();
  const [activeTab, setActiveTab] = useState<'details' | 'usage'>('details');
  const [isImpersonatingLoad, setIsImpersonatingLoad] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRuc, setEditRuc] = useState('');

  // Sincronizar el estado de edición cuando cambia el inquilino seleccionado
  React.useEffect(() => {
    setEditName(tenant?.name || '');
    setEditRuc(tenant?.ruc || '');
    setIsEditing(false);
  }, [tenant?.id]);

  if (!tenant) return null;

  const isActive = !tenant.status || tenant.status === 'active';

  const handleImpersonate = async () => {
    // To impersonate a tenant, we need to find their primary user (manager or owner-like role inside the tenant)
    // For now, we will impersonate any user that belongs to this tenant, ideally the first one or we can prompt.
    // In a real scenario, we would have a specific admin user id.
    // Since we don't have the user list directly here, we might need to fetch it or rely on a known manager UID.
    // Let's assume we can query one user from this tenant.
    setIsImpersonatingLoad(true);
    try {
      const { supabase } = await import('../../../../config/supabase');
      const { data, error } = await supabase.from('users').select('uid').eq('tenant_id', tenant.id).limit(1).single();
      
      if (error || !data) {
        alert('No se encontraron usuarios en esta inmobiliaria para suplantar.');
        return;
      }
      
      await impersonateUser(data.uid);
    } catch (e) {
      console.error(e);
      alert('Error al intentar entrar a la cuenta.');
    } finally {
      setIsImpersonatingLoad(false);
    }
  };

  const handleSaveDetails = async () => {
    await onUpdateDetails(tenant.id, { name: editName, ruc: editRuc });
    setIsEditing(false);
  };

  return (
    <div className="slds-panel slds-is-open" style={{ width: '100%', height: '100%', borderLeft: '1px solid #DDDBDA', backgroundColor: '#fff', boxShadow: '-2px 0 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
      <div className="slds-panel__header">
        <h2 className="slds-panel__header-title slds-text-heading_small slds-truncate" title={tenant.name}>
          <Building2 size={16} className="slds-m-right_x-small" style={{ color: 'var(--slds-brand)' }} />
          {tenant.name}
        </h2>
        <div className="slds-no-flex">
          {!isEditing ? (
            <button className="slds-button slds-button_icon slds-button_icon-small slds-m-right_xx-small" onClick={() => setIsEditing(true)}>
              <Edit2 size={14} />
            </button>
          ) : (
            <button className="slds-button slds-button_icon slds-button_icon-small slds-m-right_xx-small slds-text-color_success" onClick={handleSaveDetails}>
              <Save size={14} />
            </button>
          )}
          <button className="slds-button slds-button_icon slds-button_icon-small slds-panel__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="slds-panel__body" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Quick Actions */}
        <div className="slds-m-bottom_medium slds-p-bottom_medium" style={{ borderBottom: '1px solid #DDDBDA' }}>
          <div className="slds-grid slds-grid_vertical-stretch slds-gutters_x-small">
            <div className="slds-col">
              <button 
                className="slds-button slds-button_neutral slds-size_1-of-1" 
                onClick={() => onUpdateStatus(tenant.id, isActive ? 'suspended' : 'active')}
              >
                {isActive ? <Pause size={14} className="slds-m-right_xx-small"/> : <Play size={14} className="slds-m-right_xx-small"/>}
                {isActive ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
            <div className="slds-col">
              <button 
                className="slds-button slds-button_brand slds-size_1-of-1"
                onClick={handleImpersonate}
                disabled={isImpersonatingLoad || !isActive}
              >
                <LogIn size={14} className="slds-m-right_xx-small"/>
                {isImpersonatingLoad ? 'Conectando...' : 'Login As'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="slds-tabs_default">
          <ul className="slds-tabs_default__nav" role="tablist">
            <li className={`slds-tabs_default__item ${activeTab === 'details' ? 'slds-is-active' : ''}`} title="Detalles" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" onClick={(e) => { e.preventDefault(); setActiveTab('details'); }}>
                Detalles
              </a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'usage' ? 'slds-is-active' : ''}`} title="Uso y Recursos" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" onClick={(e) => { e.preventDefault(); setActiveTab('usage'); }}>
                Uso y Recursos
              </a>
            </li>
          </ul>

          <div className={`slds-tabs_default__content ${activeTab === 'details' ? 'slds-show' : 'slds-hide'}`} role="tabpanel">
            <dl className="slds-form-stacked">
              {isEditing && (
                <div className="slds-form-element slds-m-bottom_small">
                  <label className="slds-form-element__label">Nombre de Inmobiliaria</label>
                  <div className="slds-form-element__control">
                    <input type="text" className="slds-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="slds-form-element slds-m-bottom_small">
                <dt className="slds-form-element__label">ID del Inquilino</dt>
                <dd className="slds-form-element__control slds-text-color_weak slds-truncate" title={tenant.id}>{tenant.id}</dd>
              </div>
              <div className="slds-form-element slds-m-bottom_small">
                <label className="slds-form-element__label">RUC / NIT</label>
                {isEditing ? (
                  <div className="slds-form-element__control">
                    <input type="text" className="slds-input" value={editRuc} onChange={(e) => setEditRuc(e.target.value)} />
                  </div>
                ) : (
                  <dd className="slds-form-element__control">{tenant.ruc || 'No registrado'}</dd>
                )}
              </div>
              <div className="slds-form-element slds-m-bottom_small">
                <dt className="slds-form-element__label">Fecha de Creación</dt>
                <dd className="slds-form-element__control">{new Date(tenant.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="slds-form-element slds-m-bottom_small">
                <dt className="slds-form-element__label">Plan de Suscripción</dt>
                <dd className="slds-form-element__control">
                  <div className="slds-select_container">
                    <select 
                      className="slds-select" 
                      value={tenant.plan || 'starter'}
                      onChange={(e) => onUpdatePlan(tenant.id, e.target.value)}
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    >
                      <option value="starter">STARTER</option>
                      <option value="pro">PRO</option>
                      <option value="enterprise">ENTERPRISE</option>
                    </select>
                  </div>
                </dd>
              </div>
              <div className="slds-form-element slds-m-bottom_small">
                <dt className="slds-form-element__label">Estado Operativo</dt>
                <dd className="slds-form-element__control">
                  <span className={`slds-badge ${isActive ? 'slds-theme_success' : 'slds-theme_error'}`}>
                    {isActive ? 'Activa' : 'Suspendida'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className={`slds-tabs_default__content ${activeTab === 'usage' ? 'slds-show' : 'slds-hide'}`} role="tabpanel">
            <div className="slds-grid slds-wrap slds-gutters_small">
              <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
                <div className="slds-box slds-box_x-small slds-theme_shade slds-text-align_center">
                  <Users size={20} className="slds-m-bottom_x-small slds-text-color_weak" />
                  <div className="slds-text-heading_small">{tenant.users_count !== undefined ? tenant.users_count : '...'}</div>
                  <div className="slds-text-body_small slds-text-color_weak">Usuarios</div>
                </div>
              </div>
              <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
                <div className="slds-box slds-box_x-small slds-theme_shade slds-text-align_center">
                  <FolderKanban size={20} className="slds-m-bottom_x-small slds-text-color_weak" />
                  <div className="slds-text-heading_small">{tenant.projects_count !== undefined ? tenant.projects_count : '...'}</div>
                  <div className="slds-text-body_small slds-text-color_weak">Proyectos</div>
                </div>
              </div>
            </div>
            <p className="slds-text-body_small slds-text-color_weak slds-m-top_small">
              * El límite de usuarios y proyectos depende del plan suscrito ({tenant.plan?.toUpperCase()}).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
