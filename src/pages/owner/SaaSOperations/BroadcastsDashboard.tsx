import React, { useState, useEffect } from 'react';
import { Send, Bell, AlertTriangle, Info, Clock } from 'lucide-react';
import { saasService, type Broadcast } from '../../../services/saasService';

export default function BroadcastsDashboard() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    try {
      setLoading(true);
      const data = await saasService.getBroadcasts();
      setHistory(data);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) {
      alert('Por favor completa el título y el mensaje.');
      return;
    }

    try {
      setLoading(true);
      await saasService.createBroadcast({
        title,
        content: message,
        severity,
        target_scope: 'all_tenants'
      });
      
      setTitle('');
      setMessage('');
      alert('Comunicado global enviado a todas las inmobiliarias exitosamente.');
      await loadBroadcasts(); // Refresh list
    } catch (error) {
      console.error('Error creating broadcast:', error);
      alert('Error al enviar comunicado.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'info':
        return <span className="slds-badge slds-theme_success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12}/> Informativo</span>;
      case 'warning':
        return <span className="slds-badge slds-theme_warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Mantenimiento</span>;
      case 'critical':
        return <span className="slds-badge slds-theme_error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12}/> Urgente</span>;
      default:
        return <span className="slds-badge">{sev}</span>;
    }
  };

  return (
    <div>
      <div className="slds-m-bottom_large">
        <p className="slds-text-body_regular slds-text-color_weak">
          Herramienta de comunicación masiva. Los mensajes enviados desde aquí aparecerán como notificaciones prioritarias en el panel de control de todos los usuarios (Managers y Asesores) de todas las inmobiliarias.
        </p>
      </div>

      <div className="slds-grid slds-gutters">
        {/* COMPOSER (FORMULARIO) */}
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%' }}>
            <h3 className="slds-text-heading_small slds-m-bottom_medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#0176d3" /> Redactar Comunicado
            </h3>

            <div className="slds-form slds-form_stacked">
              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="Requerido">* </abbr>Título del Mensaje
                </label>
                <div className="slds-form-element__control">
                  <input 
                    type="text" 
                    className="slds-input" 
                    placeholder="Ej. Mantenimiento el Domingo 3AM"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">Nivel de Severidad</label>
                <div className="slds-form-element__control">
                  <div className="slds-select_container">
                    <select className="slds-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                      <option value="INFO">Informativo (Nuevas Funciones, Tips)</option>
                      <option value="WARNING">Mantenimiento (Cortes programados)</option>
                      <option value="CRITICAL">Urgente (Caídas de servicio, Bugs críticos)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="Requerido">* </abbr>Cuerpo del Mensaje
                </label>
                <div className="slds-form-element__control">
                  <textarea 
                    className="slds-textarea" 
                    rows={6}
                    placeholder="Escribe los detalles aquí..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <button className="slds-button slds-button_brand slds-button_stretch" onClick={handleSend}>
                <Bell size={16} className="slds-m-right_x-small" /> Publicar Globalmente
              </button>
            </div>
          </div>
        </div>

        {/* HISTORY TABLE */}
        <div className="slds-col slds-size_2-of-3">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%' }}>
            <h3 className="slds-text-heading_small slds-m-bottom_medium">Historial de Comunicados</h3>

            <div style={{ width: '100%' }}>
              <div className="slds-scrollable_y" style={{ height: '400px' }}>
                <table className="slds-table slds-table_cell-buffer slds-table_bordered">
                  <thead>
                    <tr className="slds-line-height_reset">
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Fecha">Fecha de Envío</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Severidad">Severidad</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Título">Título</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Severidad">Severidad</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Alcance">Alcance</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Estado">Estado</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                {history.length > 0 ? (
                  history.map((item) => (
                    <tr key={item.id} className="slds-hint-parent">
                      <td data-label="Fecha">
                        <div className="slds-truncate" title={new Date(item.created_at).toLocaleString()}>{new Date(item.created_at).toLocaleString()}</div>
                      </td>
                      <td data-label="Título">
                        <div className="slds-truncate" title={item.title}><strong>{item.title}</strong></div>
                      </td>
                      <td data-label="Severidad">
                        {getSeverityBadge(item.severity)}
                      </td>
                      <td data-label="Alcance">
                        <div className="slds-truncate" title={item.target_scope}>{item.target_scope === 'all_tenants' ? 'Todos los Tenants' : item.target_scope}</div>
                      </td>
                      <td data-label="Estado">
                        <span className="slds-badge slds-theme_success">Enviado</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      {loading ? 'Cargando comunicados...' : 'No hay comunicados enviados.'}
                    </td>
                  </tr>
                )}
              </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
