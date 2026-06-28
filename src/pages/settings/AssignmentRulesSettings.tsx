import { useState, useEffect } from 'react';
import { Shuffle, Users, UserPlus, UserMinus, Save } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useCRM } from '../../context/CRMContext';

export default function AssignmentRulesSettings() {
  const { tenantId } = useCRM();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock rule config state
  const [isRoundRobinEnabled, setIsRoundRobinEnabled] = useState(true);
  const [roundRobinQueue, setRoundRobinQueue] = useState<string[]>([]); // Array of agent IDs in the queue

  useEffect(() => {
    if (tenantId) fetchAgents();
  }, [tenantId]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'agent')
        .eq('status', 'active');
        
      if (error) throw error;
      setAgents(data || []);
      
      // Initialize mock queue with all agents if empty
      if (data && roundRobinQueue.length === 0) {
        setRoundRobinQueue(data.map(a => a.id));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleAgentInQueue = (agentId: string) => {
    if (roundRobinQueue.includes(agentId)) {
      setRoundRobinQueue(prev => prev.filter(id => id !== agentId));
    } else {
      setRoundRobinQueue(prev => [...prev, agentId]);
    }
  };

  const handleSave = () => {
    alert('Reglas de asignación guardadas (Simulado)');
  };

  return (
    <div>
      <div className="slds-grid slds-grid_align-spread slds-m-bottom_large">
        <div className="slds-col slds-size_2-of-3">
          <p className="slds-text-body_regular slds-text-color_weak">
            Configura cómo se distribuyen automáticamente los leads entrantes (desde Webhooks, integraciones o creación manual masiva) entre tu equipo de ventas.
          </p>
        </div>
        <div className="slds-col slds-shrink-none">
          <button className="slds-button slds-button_brand" onClick={handleSave}>
            <Save size={14} className="slds-m-right_x-small" /> Guardar Reglas
          </button>
        </div>
      </div>

      <div className="slds-grid slds-gutters">
        {/* PANEL IZQUIERDO: CONFIGURACIÓN PRINCIPAL */}
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium">
            <h3 className="slds-text-heading_small slds-m-bottom_medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shuffle size={18} /> Método de Asignación
            </h3>

            <div className="slds-form-element slds-m-bottom_medium">
              <div className="slds-form-element__control">
                <div className="slds-radio_button-group">
                  <span className="slds-button slds-radio_button">
                    <input type="radio" name="assignment_method" id="round_robin" value="round_robin" checked={isRoundRobinEnabled} onChange={() => setIsRoundRobinEnabled(true)} />
                    <label className="slds-radio_button__label" htmlFor="round_robin">
                      <span className="slds-radio_faux">Equitativo (Round-Robin)</span>
                    </label>
                  </span>
                  <span className="slds-button slds-radio_button">
                    <input type="radio" name="assignment_method" id="manual" value="manual" checked={!isRoundRobinEnabled} onChange={() => setIsRoundRobinEnabled(false)} />
                    <label className="slds-radio_button__label" htmlFor="manual">
                      <span className="slds-radio_faux">Manual (Pool)</span>
                    </label>
                  </span>
                </div>
              </div>
            </div>

            {isRoundRobinEnabled && (
              <div className="slds-box slds-theme_shade slds-m-top_medium">
                <p className="slds-text-body_small">
                  <strong>¿Cómo funciona?</strong><br/>
                  El sistema asignará el primer lead al primer asesor activo en la cola, el segundo al segundo, y así sucesivamente en un ciclo continuo.
                </p>
              </div>
            )}
            {!isRoundRobinEnabled && (
              <div className="slds-box slds-theme_shade slds-m-top_medium">
                <p className="slds-text-body_small">
                  <strong>¿Cómo funciona?</strong><br/>
                  Los leads entrantes quedarán en estado "Sin Asignar" en una bandeja general. Los mánagers o los propios asesores (si tienen permiso) deberán tomarlos manualmente.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: COLA DE ASESORES */}
        <div className="slds-col slds-size_2-of-3">
          <div className={`slds-card slds-p-around_medium ${!isRoundRobinEnabled ? 'slds-theme_shade' : ''}`}>
            <div className="slds-grid slds-grid_align-spread slds-m-bottom_medium">
              <h3 className="slds-text-heading_small" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isRoundRobinEnabled ? 1 : 0.5 }}>
                <Users size={18} /> Participantes en la Rueda
              </h3>
              {isRoundRobinEnabled && (
                <span className="slds-badge slds-theme_success">{roundRobinQueue.length} Asesores Activos</span>
              )}
            </div>

            {!isRoundRobinEnabled ? (
              <div className="slds-illustration slds-illustration_small">
                <div className="slds-text-longform slds-text-align_center">
                  <p className="slds-text-body_regular slds-text-color_weak">La rueda de asignación está desactivada en el modo manual.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="slds-spinner_container slds-is-relative" style={{ height: '100px' }}>
                <div role="status" className="slds-spinner slds-spinner_medium slds-spinner_brand">
                  <span className="slds-assistive-text">Cargando...</span>
                  <div className="slds-spinner__dot-a"></div>
                  <div className="slds-spinner__dot-b"></div>
                </div>
              </div>
            ) : agents.length === 0 ? (
              <p className="slds-text-body_regular slds-text-color_weak">No hay asesores registrados en esta inmobiliaria.</p>
            ) : (
              <ul className="slds-has-dividers_bottom-space">
                {agents.map((agent) => {
                  const isInQueue = roundRobinQueue.includes(agent.id);
                  return (
                    <li key={agent.id} className="slds-item" style={{ backgroundColor: isInQueue ? 'white' : '#f9f9f9', opacity: isInQueue ? 1 : 0.6 }}>
                      <div className="slds-media slds-media_center">
                        <div className="slds-media__figure">
                          <span className="slds-avatar slds-avatar_circle slds-avatar_medium" style={{ backgroundColor: isInQueue ? '#0176d3' : '#c9c7c5' }}>
                            <abbr className="slds-avatar__initials slds-icon-standard-user" title={agent.first_name}>{agent.first_name[0]}</abbr>
                          </span>
                        </div>
                        <div className="slds-media__body">
                          <h3 className="slds-text-heading_small">{agent.first_name} {agent.last_name}</h3>
                          <p className="slds-text-body_small slds-text-color_weak">{agent.email}</p>
                        </div>
                        <div className="slds-media__figure slds-media__figure_reverse">
                          <button 
                            className={`slds-button ${isInQueue ? 'slds-button_destructive' : 'slds-button_outline-brand'}`}
                            onClick={() => toggleAgentInQueue(agent.id)}
                            style={{ width: '100px' }}
                          >
                            {isInQueue ? (
                              <><UserMinus size={14} className="slds-m-right_xx-small" /> Pausar</>
                            ) : (
                              <><UserPlus size={14} className="slds-m-right_xx-small" /> Activar</>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
