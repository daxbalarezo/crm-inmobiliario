import React, { useState, useEffect } from 'react';
import { Plus, X, Building2, ChevronRight, ChevronDown } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { crmService, type Project } from '../services/crmService';
import { saasService, type Tenant } from '../services/saasService';

export default function ProjectsDashboard() {
  const { userProfile } = useCRM();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Collapse State
  const [expandedTenants, setExpandedTenants] = useState<Record<string, boolean>>({});

  const toggleTenant = (tenantName: string) => {
    setExpandedTenants(prev => ({
      ...prev,
      [tenantName]: !prev[tenantName]
    }));
  };

  // Modal y Forms
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    tenant_id: '',
    name: ''
  });
  const [createProjectError, setCreateProjectError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchAll = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        if (userProfile.role === 'owner') {
          const [fetchedTenants, fetchedProjects, fetchedPlans] = await Promise.all([
            saasService.getTenants(),
            crmService.getProjects(),
            saasService.getPlans()
          ]);
          setTenants(fetchedTenants);
          setProjects(fetchedProjects);
          setPlans(fetchedPlans);
        } else {
          // Manager
          const [fetchedProjects, fetchedPlans] = await Promise.all([
            crmService.getProjects(userProfile.tenantId),
            saasService.getPlans()
          ]);
          setProjects(fetchedProjects);
          setPlans(fetchedPlans);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setFetchError(err.message || JSON.stringify(err));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateProjectError('');

    const targetTenantId = userProfile?.role === 'owner' ? newProject.tenant_id : userProfile?.tenantId;

    if (!targetTenantId) {
      setCreateProjectError('Por favor selecciona una empresa dueña.');
      return;
    }
    if (!newProject.name) {
      setCreateProjectError('Por favor ingresa el nombre del proyecto.');
      return;
    }

    if (userProfile?.role === 'owner') {
      const selectedTenant = tenants.find(t => t.id === targetTenantId);
      if (selectedTenant) {
        const planKey = selectedTenant.plan || 'starter';
        const planObj = plans.find(p => p.id === planKey) || plans.find(p => p.id === 'starter');
        const maxProjects = planObj ? planObj.max_projects : 1;
        
        const tenantProjectsCount = projects.filter(p => p.tenant_id === targetTenantId).length;
        
        if (maxProjects !== 999 && tenantProjectsCount >= maxProjects) {
          setCreateProjectError(`Límite ${planObj?.name?.toUpperCase()} alcanzado (Máx ${maxProjects} proyectos). Actualiza la empresa a un plan superior.`);
          return;
        }
      }
    }
    
    setIsCreating(true);
    try {
      const created = await crmService.createProject({
        name: newProject.name.trim(),
        tenant_id: targetTenantId,
        status: 'active'
      });
      // Attach tenant name if we are owner
      if (userProfile?.role === 'owner') {
        const tName = tenants.find(t => t.id === targetTenantId)?.name;
        created.tenants = { name: tName || 'Desconocido' };
      }
      setProjects(prev => [created, ...prev]);
      setIsProjectModalOpen(false);
      setNewProject({ tenant_id: '', name: '' });
    } catch (err) {
      console.error(err);
      setCreateProjectError('Error al crear el proyecto.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: any) => {
    try {
      await crmService.updateProjectStatus(projectId, newStatus);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    } catch (e) {
      console.error('Error updating project status', e);
      alert('Error actualizando el estado del proyecto');
    }
  };

  return (
    <div>
      {/* Page Header (SLDS) */}
      <div className="slds-page-header" style={{ backgroundColor: 'transparent', border: 'none', padding: '0 0 24px 0' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-account" style={{ color: 'white' }}>
                  <svg className="slds-icon slds-page-header__icon" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Proyectos Inmobiliarios">Proyectos Inmobiliarios</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión de Desarrollos y Condominios</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                <button className="slds-button slds-button_brand" onClick={() => setIsProjectModalOpen(true)}>
                  <Plus size={16} className="slds-m-right_x-small" /> Nuevo Proyecto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <article className="slds-card">
        <div className="slds-card__header slds-grid">
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Listado de Proyectos</span>
              </h2>
            </div>
          </header>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ padding: 0 }}>
          <div className="slds-scrollable_y">
            <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_hover">
              <thead>
                <tr className="slds-line-height_reset">
                  <th className="slds-text-title_caps" scope="col"><div className="slds-truncate">Nombre del Proyecto</div></th>
                  <th className="slds-text-title_caps" scope="col"><div className="slds-truncate">Estado</div></th>
                  <th className="slds-text-title_caps" scope="col"><div className="slds-truncate">Ubicación</div></th>
                  <th className="slds-text-title_caps" scope="col" style={{textAlign: 'right'}}><div className="slds-truncate">Unidades Totales</div></th>
                </tr>
              </thead>
              <tbody>
                {fetchError ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
                      <strong>Error al cargar proyectos desde Supabase:</strong> {fetchError}<br/>
                      <small>Por favor verifica que ejecutaste el script SQL de proyectos.</small>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="slds-spinner slds-spinner_small" role="status">
                        <span className="slds-assistive-text">Cargando...</span>
                        <div className="slds-spinner__dot-a"></div>
                        <div className="slds-spinner__dot-b"></div>
                      </div>
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="slds-text-color_weak">No hay proyectos registrados.</div>
                    </td>
                  </tr>
                ) : (
                  userProfile?.role === 'owner' ? (
                    // AGRUPADO POR INMOBILIARIA
                    Object.entries(
                      projects.reduce((acc, p) => {
                        const tName = p.tenants?.name || 'Inmobiliaria Desconocida';
                        if (!acc[tName]) acc[tName] = [];
                        acc[tName].push(p);
                        return acc;
                      }, {} as Record<string, typeof projects>)
                    ).map(([tenantName, tenantProjects]) => {
                      const isExpanded = expandedTenants[tenantName];
                      return (
                      <React.Fragment key={tenantName}>
                        <tr 
                          className="slds-theme_shade"
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleTenant(tenantName)}
                        >
                          <td colSpan={4} style={{ fontWeight: 'bold', borderTop: '2px solid #DDDBDA', borderBottom: '1px solid #DDDBDA', backgroundColor: '#f3f3f3' }}>
                            <div className="slds-truncate slds-text-heading_small slds-p-vertical_x-small slds-p-horizontal_small" style={{ display: 'flex', alignItems: 'center' }}>
                              {isExpanded ? <ChevronDown size={18} className="slds-m-right_xx-small" style={{ color: '#747474' }}/> : <ChevronRight size={18} className="slds-m-right_xx-small" style={{ color: '#747474' }}/>}
                              <Building2 size={16} className="slds-m-right_x-small" style={{ color: '#0176d3' }} />
                              {tenantName} <span className="slds-text-body_small slds-text-color_weak slds-m-left_small" style={{ fontWeight: 'normal' }}>({tenantProjects.length} proyecto{tenantProjects.length !== 1 ? 's' : ''})</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && tenantProjects.map(p => (
                          <tr key={p.id} className="slds-hint-parent">
                            <td data-label="Nombre del Proyecto" style={{ paddingLeft: '2rem' }}>
                              <div className="slds-truncate slds-text-title_bold">{p.name}</div>
                            </td>
                            <td data-label="Estado">
                              <select 
                                className="slds-select"
                                value={p.status || 'active'}
                                onChange={(e) => handleUpdateProjectStatus(p.id, e.target.value)}
                                style={{ 
                                  width: '140px', 
                                  height: '2rem', 
                                  padding: '0 8px', 
                                  fontSize: '12px',
                                  backgroundColor: p.status === 'sold_out' ? '#e5f3e7' : p.status === 'inactive' ? '#fef0ef' : 'white',
                                  color: p.status === 'sold_out' ? '#2e844a' : p.status === 'inactive' ? '#ba0517' : '#0176d3',
                                  fontWeight: 'bold'
                                }}
                              >
                                <option value="active">ACTIVO</option>
                                <option value="inactive">INACTIVO</option>
                                <option value="sold_out">VENDIDO</option>
                              </select>
                            </td>
                            <td data-label="Ubicación">
                              <div className="slds-truncate slds-text-color_weak">--</div>
                            </td>
                            <td data-label="Unidades Totales" style={{textAlign: 'right'}}>
                              <div className="slds-truncate">--</div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                      );
                    })
                  ) : (
                    // VISTA NORMAL PARA MANAGERS (SIN AGRUPAR)
                    projects.map(p => (
                      <tr key={p.id} className="slds-hint-parent">
                        <td data-label="Nombre del Proyecto">
                          <div className="slds-truncate slds-text-title_bold">{p.name}</div>
                        </td>
                        <td data-label="Estado">
                          <select 
                            className="slds-select"
                            value={p.status || 'active'}
                            onChange={(e) => handleUpdateProjectStatus(p.id, e.target.value)}
                            style={{ 
                              width: '140px', 
                              height: '2rem', 
                              padding: '0 8px', 
                              fontSize: '12px',
                              backgroundColor: p.status === 'sold_out' ? '#e5f3e7' : p.status === 'inactive' ? '#fef0ef' : 'white',
                              color: p.status === 'sold_out' ? '#2e844a' : p.status === 'inactive' ? '#ba0517' : '#0176d3',
                              fontWeight: 'bold'
                            }}
                          >
                            <option value="active">ACTIVO</option>
                            <option value="inactive">INACTIVO</option>
                            <option value="sold_out">VENDIDO</option>
                          </select>
                        </td>
                        <td data-label="Ubicación">
                          <div className="slds-truncate slds-text-color_weak">--</div>
                        </td>
                        <td data-label="Unidades Totales" style={{textAlign: 'right'}}>
                          <div className="slds-truncate">--</div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </article>

      {/* Modal Creación SLDS */}
      {isProjectModalOpen && (
        <>
          <section role="dialog" tabIndex={-1} className="slds-modal slds-fade-in-open">
            <div className="slds-modal__container">
              <div className="slds-modal__header">
                <button 
                  className="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" 
                  title="Cerrar"
                  onClick={() => setIsProjectModalOpen(false)}
                >
                  <X size={24} style={{ color: '#000' }} />
                  <span className="slds-assistive-text">Cerrar</span>
                </button>
                <h1 className="slds-modal__title slds-hyphenate">Registrar Nuevo Proyecto</h1>
              </div>
              <div className="slds-modal__content slds-p-around_medium">
                <form id="create-project-form" onSubmit={handleCreateProject}>
                  
                  {userProfile?.role === 'owner' && (
                    <div className="slds-form-element slds-m-bottom_small">
                      <label className="slds-form-element__label">Empresa Dueña <abbr className="slds-required" title="Requerido">*</abbr></label>
                      <div className="slds-form-element__control">
                        <select 
                          required 
                          className="slds-select"
                          value={newProject.tenant_id} 
                          onChange={e => setNewProject({ ...newProject, tenant_id: e.target.value })}
                        >
                          <option value="">Seleccione a qué inmobiliaria pertenece...</option>
                          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="slds-form-element slds-m-bottom_small">
                    <label className="slds-form-element__label">Nombre del Proyecto <abbr className="slds-required" title="Requerido">*</abbr></label>
                    <div className="slds-form-element__control">
                      <input 
                        type="text" 
                        required 
                        className="slds-input" 
                        value={newProject.name} 
                        onChange={e => setNewProject({ ...newProject, name: e.target.value })} 
                        placeholder="Ej. Condominio Las Palmas" 
                      />
                    </div>
                  </div>

                  {createProjectError && (
                    <div className="slds-notify slds-notify_alert slds-alert_error slds-m-bottom_small" role="alert">
                      <h2>{createProjectError}</h2>
                    </div>
                  )}

                </form>
              </div>
              <div className="slds-modal__footer">
                <button className="slds-button slds-button_neutral" onClick={() => setIsProjectModalOpen(false)}>Cancelar</button>
                <button form="create-project-form" type="submit" disabled={isCreating} className="slds-button slds-button_brand">
                  {isCreating ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </div>
          </section>
          <div className="slds-backdrop slds-backdrop_open"></div>
        </>
      )}
    </div>
  );
}
