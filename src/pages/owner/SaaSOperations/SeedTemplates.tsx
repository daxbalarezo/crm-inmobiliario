import { useState, useEffect } from 'react';
import { GitCommit, Plus, Clock, Save, GripVertical, Trash2 } from 'lucide-react';
import { saasService, type SeedTemplate } from '../../../services/saasService';
import { supabase } from '../../../config/supabase';

export default function SeedTemplates() {
  const [stages, setStages] = useState<any[]>([]);
  const [slaRule, setSlaRule] = useState<any>({
    firstContactHours: 2,
    followUpDays: 3,
    autoReassignAfterDays: 5
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await saasService.getSeedTemplates();
      
      const pipelineStages = data
        .filter(t => t.type === 'pipeline_stage')
        .map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          probability: t.config_json?.probability || 0,
          color: t.config_json?.color || '#000',
          order: t.config_json?.order || 0
        }))
        .sort((a, b) => a.order - b.order);
      
      setStages(pipelineStages);

      const slaTemplate = data.find(t => t.type === 'sla_rule');
      if (slaTemplate && slaTemplate.config_json) {
        setSlaRule(slaTemplate.config_json);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Actualizar o crear Pipeline Stages
      for (const stage of stages) {
        if (typeof stage.id === 'string' && !stage.id.startsWith('new_')) {
          await supabase.from('saas_seed_templates').update({
            name: stage.name,
            description: stage.description,
            config_json: {
              probability: stage.probability,
              color: stage.color,
              order: stage.order
            }
          }).eq('id', stage.id);
        } else if (typeof stage.id === 'string' && stage.id.startsWith('new_')) {
          await supabase.from('saas_seed_templates').insert([{
            type: 'pipeline_stage',
            name: stage.name,
            description: stage.description || 'Etapa del proceso',
            config_json: {
              probability: stage.probability,
              color: stage.color,
              order: stage.order
            }
          }]);
        }
      }
      
      // Actualizar SLA Rule (buscamos o creamos)
      const { data: existingSla } = await supabase.from('saas_seed_templates').select('id').eq('type', 'sla_rule').single();
      if (existingSla) {
        await supabase.from('saas_seed_templates').update({ config_json: slaRule }).eq('id', existingSla.id);
      } else {
        await supabase.from('saas_seed_templates').insert([{
          type: 'sla_rule',
          name: 'Global SLA',
          description: 'Default SLA rules',
          config_json: slaRule
        }]);
      }
      alert('Plantillas base guardadas en la nube. Estas se inyectarán en los nuevos Tenants al momento del onboarding.');
    } catch (error) {
      console.error('Error saving templates:', error);
      alert('Error al guardar plantillas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = () => {
    const newOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 1;
    const newStage = {
      id: `new_${Date.now()}`,
      name: 'Nueva Etapa',
      description: '',
      probability: 0,
      color: '#0176d3',
      order: newOrder
    };
    setStages([...stages, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    const newStages = [...stages];
    newStages.splice(index, 1);
    setStages(newStages);
  };

  return (
    <div>
      <div className="slds-grid slds-grid_align-spread slds-m-bottom_large">
        <div className="slds-col slds-size_2-of-3">
          <p className="slds-text-body_regular slds-text-color_weak">
            Configura el "Starter Pack" de tu CRM. Estas son las etapas de ventas, probabilidades y tiempos de respuesta por defecto que heredarán todas las inmobiliarias nuevas al momento de registrarse en la plataforma.
          </p>
        </div>
        <div className="slds-col slds-shrink-none">
          <button className="slds-button slds-button_brand" onClick={handleSave}>
            <Save size={14} className="slds-m-right_x-small" /> Guardar Plantillas Globales
          </button>
        </div>
      </div>

      <div className="slds-grid slds-gutters">
        
        {/* PIPELINE BASE (OPPORTUNITY STAGES) */}
        <div className="slds-col slds-size_2-of-3">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%' }}>
            <div className="slds-grid slds-grid_align-spread slds-m-bottom_medium">
              <h3 className="slds-text-heading_small" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitCommit size={18} color="#0176d3" /> Embudo de Ventas (Estándar Salesforce)
              </h3>
              <button className="slds-button slds-button_neutral" onClick={handleAddStage}>
                <Plus size={14} className="slds-m-right_xx-small" /> Añadir Etapa
              </button>
            </div>

            <div style={{ width: '100%' }}>
              <div className="slds-scrollable_y" style={{ height: '400px' }}>
                <table className="slds-table slds-table_cell-buffer slds-table_bordered">
                  <thead>
                    <tr className="slds-line-height_reset">
                      <th className="" scope="col" style={{ width: '40px' }}></th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Etapa">Nombre de la Etapa</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Probabilidad">Prob. (%)</div>
                      </th>
                      <th className="" scope="col">
                        <div className="slds-truncate" title="Color">Color</div>
                      </th>
                      <th className="" scope="col" style={{ width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage, index) => (
                      <tr key={stage.id} className="slds-hint-parent">
                        <td role="gridcell" style={{ cursor: 'grab' }}>
                          <GripVertical size={16} color="#747474" />
                        </td>
                        <td data-label="Etapa">
                          <div className="slds-truncate" title={stage.name}>
                            <input 
                              type="text" 
                              className="slds-input" 
                              value={stage.name} 
                              onChange={(e) => {
                                const newStages = [...stages];
                                newStages[index].name = e.target.value;
                                setStages(newStages);
                              }}
                              style={{ border: '1px solid transparent', backgroundColor: 'transparent' }}
                              onFocus={(e) => e.target.style.border = '1px solid #0176d3'}
                              onBlur={(e) => e.target.style.border = '1px solid transparent'}
                            />
                          </div>
                          <div className="slds-text-body_small slds-text-color_weak slds-m-top_xx-small">{stage.description}</div>
                        </td>
                        <td data-label="Probabilidad">
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              className="slds-input" 
                              value={stage.probability}
                              onChange={(e) => {
                                const newStages = [...stages];
                                newStages[index].probability = parseInt(e.target.value) || 0;
                                setStages(newStages);
                              }}
                              min="0" max="100"
                              style={{ width: '60px', border: '1px solid transparent', backgroundColor: 'transparent' }}
                              onFocus={(e) => e.target.style.border = '1px solid #0176d3'}
                              onBlur={(e) => e.target.style.border = '1px solid transparent'}
                            /> 
                            <span className="slds-m-left_xx-small">%</span>
                          </div>
                        </td>
                        <td data-label="Color">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="color" 
                              value={stage.color}
                              onChange={(e) => {
                                const newStages = [...stages];
                                newStages[index].color = e.target.value;
                                setStages(newStages);
                              }}
                              style={{ width: '32px', height: '32px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                            />
                            <span className="slds-text-body_small slds-text-color_weak">{stage.color}</span>
                          </div>
                        </td>
                        <td role="gridcell">
                          <button className="slds-button slds-button_icon slds-button_icon-error" title="Eliminar" onClick={() => handleRemoveStage(index)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="slds-m-top_medium">
              <div className="slds-notify slds-notify_alert slds-alert_info" role="alert">
                <span className="slds-assistive-text">info</span>
                <h2>Las etapas "Cerrado Ganado" y "Cerrado Perdido" son requeridas por el sistema para calcular el ROI.</h2>
              </div>
            </div>

          </div>
        </div>

        {/* SLA Y REGLAS DE NEGOCIO BASE */}
        <div className="slds-col slds-size_1-of-3">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%' }}>
            <h3 className="slds-text-heading_small slds-m-bottom_medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#d96f32" /> Reglas de Rendimiento (SLA) Base
            </h3>

            <div className="slds-form slds-form_stacked">
              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="Requerido">* </abbr>Tiempo para 1er Contacto (Horas)
                </label>
                <div className="slds-form-element__control">
                  <input 
                    type="number" 
                    className="slds-input" 
                    value={slaRule.firstContactHours}
                    onChange={(e) => setSlaRule({...slaRule, firstContactHours: parseInt(e.target.value)})}
                  />
                </div>
                <div className="slds-form-element__help">Si un lead nuevo no es contactado en este tiempo, se marca como "Desatendido".</div>
              </div>

              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="Requerido">* </abbr>Frecuencia de Seguimiento (Días)
                </label>
                <div className="slds-form-element__control">
                  <input 
                    type="number" 
                    className="slds-input" 
                    value={slaRule.followUpDays}
                    onChange={(e) => setSlaRule({...slaRule, followUpDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="slds-form-element__help">Tiempo máximo sin interacción antes de que un lead se considere "Frío".</div>
              </div>

              <div className="slds-form-element slds-m-bottom_medium">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="Requerido">* </abbr>Auto-reasignación (Días inactivo)
                </label>
                <div className="slds-form-element__control">
                  <input 
                    type="number" 
                    className="slds-input" 
                    value={slaRule.autoReassignAfterDays}
                    onChange={(e) => setSlaRule({...slaRule, autoReassignAfterDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="slds-form-element__help">Quitar el lead al asesor si no lo trabaja, y devolverlo al Pool.</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
