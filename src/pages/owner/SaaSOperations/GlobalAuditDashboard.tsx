import React, { useState, useEffect } from 'react';
import { ShieldAlert, Database, ServerCrash, Activity, Download, Search } from 'lucide-react';
import { saasService } from '../../../services/saasService';

export default function GlobalAuditDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await saasService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => 
    (log.tenants?.name || 'Global').toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details_json ? JSON.stringify(log.details_json) : '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="slds-badge slds-theme_error">CRÍTICO</span>;
      case 'WARNING':
        return <span className="slds-badge slds-theme_warning">ADVERTENCIA</span>;
      case 'INFO':
        return <span className="slds-badge slds-theme_success">INFO</span>;
      default:
        return <span className="slds-badge">{severity}</span>;
    }
  };

  return (
    <div>
      <div className="slds-m-bottom_large">
        <p className="slds-text-body_regular slds-text-color_weak">
          Centro de Comando de Auditoría. Monitorea el rendimiento de la base de datos y audita eventos críticos a través de todos los Tenants en tiempo real.
        </p>
      </div>

      {/* HEALTH KPIs */}
      <div className="slds-grid slds-gutters slds-m-bottom_large">
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #2e844a' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: '#2e844a', padding: '8px', borderRadius: '4px' }}>
                  <Database size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Uso de Base de Datos</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">42%</h2>
                <div className="slds-progress-bar slds-m-top_x-small" aria-valuemin={0} aria-valuemax={100} aria-valuenow={42} role="progressbar">
                  <span className="slds-progress-bar__value slds-progress-bar__value_success" style={{ width: '42%' }}></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #ba0517' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: '#ba0517', padding: '8px', borderRadius: '4px' }}>
                  <ServerCrash size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Errores 5xx (24h)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">0</h2>
                <p className="slds-text-body_small slds-text-color_success slds-m-top_xx-small">Sistema estable</p>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #ffb75d' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-account" style={{ backgroundColor: '#ffb75d', padding: '8px', borderRadius: '4px' }}>
                  <Activity size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Intentos Fallidos (24h)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">12</h2>
                <p className="slds-text-body_small slds-text-color_weak slds-m-top_xx-small">En rangos normales</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER LOG TABLE */}
      <div className="slds-card slds-p-around_medium">
        <div className="slds-grid slds-grid_align-spread slds-m-bottom_medium">
          <h3 className="slds-text-heading_small" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#0176d3" /> Master Log (Eventos Recientes)
          </h3>
          <div className="slds-grid slds-gutters">
            <div className="slds-col">
              <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left">
                <Search size={14} className="slds-icon slds-input__icon slds-input__icon_left slds-icon-text-default" />
                <input 
                  type="text" 
                  className="slds-input" 
                  placeholder="Buscar Inmobiliaria o Evento..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="slds-col">
              <button className="slds-button slds-button_neutral">
                <Download size={14} className="slds-m-right_xx-small" /> Exportar CSV
              </button>
            </div>
          </div>
        </div>

        <div style={{ width: '100%' }}>
          <div className="slds-scrollable_y" style={{ height: '400px' }}>
            <table className="slds-table slds-table_cell-buffer slds-table_bordered">
              <thead>
                <tr className="slds-line-height_reset">
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Timestamp">Fecha y Hora</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Severidad">Severidad</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Tenant">Inmobiliaria (Tenant)</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Usuario">Usuario</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Acción">Acción / Evento</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Severidad">Severidad</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Detalles">Detalles</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const severity = log.details_json?.severity || 'INFO';
                    return (
                    <tr key={log.id} className="slds-hint-parent">
                      <td data-label="Fecha/Hora">
                        <div className="slds-truncate" title={new Date(log.created_at).toLocaleString()}>{new Date(log.created_at).toLocaleString()}</div>
                      </td>
                      <td data-label="Inmobiliaria">
                        <div className="slds-truncate" title={log.tenants?.name || 'Global'}><strong>{log.tenants?.name || 'Global'}</strong></div>
                      </td>
                      <td data-label="Usuario">
                        <div className="slds-truncate" title={log.user_id || 'SYSTEM'}>{log.user_id || 'SYSTEM'}</div>
                      </td>
                      <td data-label="Acción">
                        <div className="slds-truncate" title={log.action}><code style={{ background: '#f4f6f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{log.action}</code></div>
                      </td>
                      <td data-label="Severidad">
                        {getSeverityBadge(severity)}
                      </td>
                      <td data-label="Detalles">
                        <div className="slds-truncate" title={log.details_json?.message || ''}>{log.details_json?.message || ''}</div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      {loading ? 'Cargando logs de auditoría...' : 'No se encontraron registros de auditoría para esta búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
