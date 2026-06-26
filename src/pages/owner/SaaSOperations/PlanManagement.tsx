import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { saasService, type SaaSPlan } from '../../../services/saasService';
import { supabase } from '../../../config/supabase';

export default function PlanManagement() {
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await saasService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: string, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFeatureChange = (id: string, featureKey: string, value: any) => {
    setPlans(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          features_json: {
            ...(p.features_json || {}),
            [featureKey]: value
          }
        };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      for (const plan of plans) {
        await supabase.from('saas_plans').update(plan).eq('id', plan.id);
      }
      alert("Planes guardados en la nube correctamente.");
    } catch (error) {
      console.error('Error saving plans:', error);
      alert('Error al guardar los planes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="slds-grid slds-grid_align-spread slds-m-bottom_medium">
        <div>
          <p className="slds-text-body_regular slds-text-color_weak slds-m-bottom_medium">
            Configura los límites (usuarios, leads, proyectos) para cada plan de suscripción ofrecido a las inmobiliarias.
          </p>
        </div>
        <div>
          <button className="slds-button slds-button_brand" onClick={handleSave}>
            <Save size={14} className="slds-m-right_x-small" />
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="slds-grid slds-gutters">
        {plans.map((plan) => (
          <div key={plan.id} className="slds-col slds-size_1-of-3">
            <div className="slds-card slds-p-around_medium" style={{ borderTop: `4px solid ${plan.id === 'starter' ? '#b0c4df' : plan.id === 'pro' ? '#0176d3' : '#1a1a1a'}`, height: '100%' }}>
              <div className="slds-m-bottom_medium slds-text-align_center">
                <h3 className="slds-text-heading_large slds-text-color_default slds-m-bottom_x-small">{plan.name}</h3>
              </div>

              <div className="slds-form slds-form_stacked">
                <div className="slds-form-element slds-m-bottom_small">
                  <label className="slds-form-element__label">Precio Mensual (S/)</label>
                  <div className="slds-form-element__control">
                    <input 
                      type="number" 
                      className="slds-input" 
                      value={plan.price_monthly}
                      onChange={(e) => handleInputChange(plan.id, 'price_monthly', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="slds-form-element slds-m-bottom_small">
                  <label className="slds-form-element__label">Límite de Usuarios Activos</label>
                  <div className="slds-form-element__control">
                    <input 
                      type="number" 
                      className="slds-input" 
                      value={plan.max_users}
                      onChange={(e) => handleInputChange(plan.id, 'max_users', Number(e.target.value))}
                    />
                  </div>
                  <div className="slds-form-element__help">Use 999 para ilimitado</div>
                </div>

                <div className="slds-form-element slds-m-bottom_small">
                  <label className="slds-form-element__label">Límite de Proyectos</label>
                  <div className="slds-form-element__control">
                    <input 
                      type="number" 
                      className="slds-input" 
                      value={plan.max_projects}
                      onChange={(e) => handleInputChange(plan.id, 'max_projects', Number(e.target.value))}
                    />
                  </div>
                  <div className="slds-form-element__help">Use 999 para ilimitado</div>
                </div>

                <div className="slds-form-element slds-m-bottom_small">
                  <div className="slds-checkbox">
                    <input 
                      type="checkbox" 
                      name={`api-${plan.id}`} 
                      id={`api-${plan.id}`} 
                      checked={plan.features_json?.apiAccess || false}
                      onChange={(e) => handleFeatureChange(plan.id, 'apiAccess', e.target.checked)}
                    />
                    <label className="slds-checkbox__label" htmlFor={`api-${plan.id}`}>
                      <span className="slds-checkbox_faux"></span>
                      <span className="slds-form-element__label">Acceso a API de Integración</span>
                    </label>
                  </div>
                </div>

                <div className="slds-form-element slds-m-bottom_small">
                  <label className="slds-form-element__label">Nivel de Soporte</label>
                  <div className="slds-form-element__control">
                    <div className="slds-select_container">
                      <select 
                        className="slds-select"
                        value={plan.features_json?.supportLevel || 'standard'}
                        onChange={(e) => handleFeatureChange(plan.id, 'supportLevel', e.target.value)}
                      >
                        <option value="standard">Soporte Estándar</option>
                        <option value="priority">Soporte Prioritario</option>
                        <option value="24_7">Soporte 24/7 Premium</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
