import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface TenantListProps {
  tenants: any[];
  loading: boolean;
  selectedTenantId: string | null;
  onSelectTenant: (tenant: any) => void;
}

export default function TenantList({ tenants, loading, selectedTenantId, onSelectTenant }: TenantListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.ruc && t.ruc.includes(searchTerm));
    
    const isActive = !t.status || t.status === 'active';
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' ? isActive : !isActive;

    return matchesSearch && matchesStatus;
  });

  return (
    <article className="slds-card slds-m-bottom_large" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="slds-card__header slds-grid">
        <header className="slds-media slds-media_center slds-has-flexi-truncate">
          <div className="slds-media__body">
            <h2 className="slds-card__header-title">
              <span className="slds-text-heading_small">Lista de Inmobiliarias ({filteredTenants.length})</span>
            </h2>
          </div>
        </header>
        <div className="slds-no-flex">
          <div className="slds-grid slds-gutters_small">
            <div className="slds-col">
              <div className="slds-form-element">
                <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left">
                  <Search size={14} className="slds-icon slds-input__icon slds-input__icon_left slds-icon-text-default" />
                  <input 
                    type="text" 
                    placeholder="Buscar empresa..." 
                    className="slds-input" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ minWidth: '200px', paddingLeft: '32px' }}
                  />
                </div>
              </div>
            </div>
            <div className="slds-col">
              <div className="slds-form-element">
                <div className="slds-form-element__control">
                  <div className="slds-select_container">
                    <select 
                      className="slds-select" 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Todos los estados</option>
                      <option value="active">Activas</option>
                      <option value="suspended">Suspendidas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_hover slds-table_fixed-layout">
          <thead>
            <tr className="slds-line-height_reset">
              <th scope="col" style={{ width: '40%' }}><div className="slds-truncate" title="Empresa">Empresa</div></th>
              <th scope="col"><div className="slds-truncate" title="Plan">Plan</div></th>
              <th scope="col"><div className="slds-truncate" title="Usuarios">Usuarios</div></th>
              <th scope="col"><div className="slds-truncate" title="Proyectos">Proyectos</div></th>
              <th scope="col"><div className="slds-truncate" title="Estado">Estado</div></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="slds-text-align_center slds-p-around_medium">
                  <div className="slds-spinner_container slds-is-relative" style={{height: '40px'}}>
                    <div role="status" className="slds-spinner slds-spinner_small slds-spinner_brand">
                      <span className="slds-assistive-text">Cargando</span>
                      <div className="slds-spinner__dot-a"></div>
                      <div className="slds-spinner__dot-b"></div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="slds-text-align_center slds-p-around_medium slds-text-color_weak">
                  No se encontraron resultados.
                </td>
              </tr>
            ) : filteredTenants.map(t => {
              const isActive = !t.status || t.status === 'active';
              const isSelected = selectedTenantId === t.id;
              
              return (
                <tr 
                  key={t.id} 
                  className={isSelected ? 'slds-is-selected' : ''}
                  onClick={() => onSelectTenant(t)}
                  style={{ cursor: 'pointer', backgroundColor: isSelected ? 'var(--slds-bg-row-selected, #eaf5fe)' : undefined }}
                >
                  <td data-label="Empresa">
                    <div className="slds-truncate slds-text-title_bold slds-text-link" title={t.name}>
                      {t.name}
                    </div>
                    <div className="slds-truncate slds-text-body_small slds-text-color_weak" title={t.id}>
                      ID: {t.id.substring(0,8)}...
                    </div>
                  </td>
                  <td data-label="Plan">
                    <div className="slds-truncate slds-text-title_caps" title={t.plan}>{t.plan}</div>
                  </td>
                  <td data-label="Usuarios">
                    <div className="slds-truncate">{t.users_count !== undefined ? t.users_count : '-'}</div>
                  </td>
                  <td data-label="Proyectos">
                    <div className="slds-truncate">{t.projects_count !== undefined ? t.projects_count : '-'}</div>
                  </td>
                  <td data-label="Estado">
                    <div className="slds-truncate">
                      <span className={`slds-badge ${isActive ? 'slds-theme_success' : 'slds-theme_error'}`}>
                        {isActive ? 'Activa' : 'Suspendida'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
