import { useState, useEffect } from 'react';
import { ShieldAlert, Database, ServerCrash, Activity, Download, Search, HardDrive,  } from 'lucide-react';
import { saasService } from '../../../services/saasService';
import { supabase } from '../../../config/supabase';

export default function GlobalAuditDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSize, setDbSize] = useState<number>(0);
  const [storageSize, setStorageSize] = useState<number>(0);
  const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500MB
  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB

  useEffect(() => {
    loadLogs();
    
    // Subscribe to realtime logs
    const channel = supabase.channel('global_audit')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'saas_audit_logs' },
        (payload) => {
          setLogs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await saasService.getAuditLogs();
      setLogs(data);
      
      const size = await saasService.getDatabaseUsage();
      setDbSize(size);

      const sSize = await saasService.getStorageUsage();
      setStorageSize(sSize);
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

  const dbUsagePercentage = Math.min(100, Math.round((dbSize / DB_LIMIT_BYTES) * 100));
  const storageUsagePercentage = Math.min(100, Math.round((storageSize / STORAGE_LIMIT_BYTES) * 100));
  
  // Calculate dynamic KPIs from the last 24 hours of logs
  const now = new Date();
  const last24hLogs = logs.filter(l => {
    const logDate = new Date(l.created_at);
    const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });
  
  const criticalErrors = last24hLogs.filter(l => l.details_json?.severity === 'CRITICAL').length;
  const warnings = last24hLogs.filter(l => l.details_json?.severity === 'WARNING').length;

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Fecha y Hora', 'Inmobiliaria (Tenant)', 'Usuario', 'Accion / Evento', 'Severidad', 'Detalles'];
    
    const rows = filteredLogs.map(log => {
      const date = new Date(log.created_at).toLocaleString();
      const tenant = log.tenants?.name || 'Global';
      const user = log.user_id || 'SYSTEM';
      const action = log.action;
      const severity = log.details_json?.severity || 'INFO';
      
      let details = log.details_json?.message || '';
      if (!details && log.details_json?.attempted_email) {
        details = `Intento fallido con: ${log.details_json.attempted_email}`;
      } else if (!details) {
        details = JSON.stringify(log.details_json || {});
      }
      
      return [
        `"${date}"`,
        `"${tenant}"`,
        `"${user}"`,
        `"${action}"`,
        `"${severity}"`,
        `"${details.replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Auditoria_Global_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="slds-m-bottom_large">
        <p className="slds-text-body_regular slds-text-color_weak">
          Centro de Comando de Auditoría. Monitorea el rendimiento de la base de datos y audita eventos críticos a través de todos los Tenants en tiempo real.
        </p>
      </div>

      {/* HEALTH KPIs ROW 1 */}
      <div className="slds-grid slds-gutters slds-m-bottom_medium">
        <div className="slds-col slds-size_1-of-2">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: `3px solid ${dbUsagePercentage > 80 ? '#ba0517' : '#2e844a'}` }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: dbUsagePercentage > 80 ? '#ba0517' : '#2e844a', padding: '8px', borderRadius: '4px' }}>
                  <Database size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Uso de Base de Datos</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">{dbUsagePercentage}%</h2>
                <div className="slds-progress-bar slds-m-top_x-small" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dbUsagePercentage} role="progressbar">
                  <span className={`slds-progress-bar__value ${dbUsagePercentage > 80 ? 'slds-theme_error' : 'slds-progress-bar__value_success'}`} style={{ width: `${dbUsagePercentage}%` }}></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-2">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: `3px solid ${storageUsagePercentage > 80 ? '#ba0517' : '#1b96ff'}` }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: storageUsagePercentage > 80 ? '#ba0517' : '#1b96ff', padding: '8px', borderRadius: '4px' }}>
                  <HardDrive size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Uso de Storage (Archivos)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">{storageUsagePercentage}%</h2>
                <div className="slds-progress-bar slds-m-top_x-small" aria-valuemin={0} aria-valuemax={100} aria-valuenow={storageUsagePercentage} role="progressbar">
                  <span className={`slds-progress-bar__value ${storageUsagePercentage > 80 ? 'slds-theme_error' : ''}`} style={{ width: `${storageUsagePercentage}%`, backgroundColor: storageUsagePercentage > 80 ? undefined : '#1b96ff' }}></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HEALTH KPIs ROW 2 */}
      <div className="slds-grid slds-gutters slds-m-bottom_large">
        <div className="slds-col slds-size_1-of-2">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: `3px solid ${criticalErrors > 0 ? '#ba0517' : '#2e844a'}` }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: criticalErrors > 0 ? '#ba0517' : '#2e844a', padding: '8px', borderRadius: '4px' }}>
                  <ServerCrash size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Errores Críticos (24h)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">{criticalErrors}</h2>
                <p className={`slds-text-body_small slds-m-top_xx-small ${criticalErrors > 0 ? 'slds-text-color_error' : 'slds-text-color_success'}`}>
                  {criticalErrors > 0 ? 'Atención requerida' : 'Sistema estable'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-2">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: `3px solid ${warnings > 10 ? '#ba0517' : '#ffb75d'}` }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-account" style={{ backgroundColor: warnings > 10 ? '#ba0517' : '#ffb75d', padding: '8px', borderRadius: '4px' }}>
                  <Activity size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Advertencias (24h)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">{warnings}</h2>
                <p className="slds-text-body_small slds-text-color_weak slds-m-top_xx-small">
                  {warnings > 10 ? 'Pico inusual detectado' : 'En rangos normales'}
                </p>
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
              <button className="slds-button slds-button_neutral" onClick={handleExportCSV}>
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
                  <th className="" scope="col" style={{ width: '180px' }}>
                    <div className="slds-truncate" title="Timestamp">Fecha y Hora</div>
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
                  <th className="" scope="col" style={{ width: '120px' }}>
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
                        <div className="slds-truncate" title={JSON.stringify(log.details_json)}>
                          {log.details_json?.message 
                            ? log.details_json.message 
                            : log.details_json?.attempted_email 
                              ? `Intento fallido con: ${log.details_json.attempted_email}` 
                              : JSON.stringify(log.details_json || {})}
                        </div>
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
