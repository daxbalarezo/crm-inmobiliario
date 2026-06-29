import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Check, X } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useCRM } from '../../context/CRMContext';
import type { PipelineStage } from '../../types/definitions';

interface StagesProps {
  type: 'lead' | 'opportunity';
}

export default function StagesSettings() {
  return (
    <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
      <StageManager type="lead" title="Estados de Prospectos (Leads)" description="Define las etapas iniciales de prospección. Solo deben usarse para contactar y calificar al cliente potencial." />
      <hr style={{ margin: '0', borderColor: 'var(--slds-border)' }} />
      <StageManager type="opportunity" title="Etapas del Pipeline (Oportunidades)" description="Define los hitos del negocio (donde ya hay dinero de por medio). Empiezan desde que se califica el prospecto." />
    </div>
  );
}

function StageManager({ type, title, description }: { type: 'lead' | 'opportunity', title: string, description: string }) {
  const { tenantId, tenant } = useCRM();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#0176D3');
  const [formIsClosed, setFormIsClosed] = useState(false);
  const [formProbability, setFormProbability] = useState(0);

  useEffect(() => {
    if (tenant) {
      if (type === 'lead') {
        setStages(tenant.lead_statuses || []);
      } else {
        setStages(tenant.pipeline_stages || []);
      }
      setLoading(false);
    }
  }, [tenant, type]);

  const handleSave = async (newStages: PipelineStage[]) => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      const field = type === 'lead' ? 'lead_statuses' : 'pipeline_stages';
      const { error } = await supabase
        .from('tenants')
        .update({ [field]: newStages })
        .eq('id', tenantId);

      if (error) throw error;
      setStages(newStages);
    } catch (e) {
      console.error(e);
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
      setEditingId(null);
    }
  };

  const addStage = () => {
    const newId = 'temp-' + Date.now();
    setEditingId(newId);
    setFormName('');
    setFormColor('#0176D3');
    setFormIsClosed(false);
    setFormProbability(type === 'opportunity' ? 50 : 0);
  };

  const editStage = (s: PipelineStage) => {
    setEditingId(s.id || s.name);
    setFormName(s.name);
    setFormColor(s.color);
    setFormIsClosed(s.is_closed || false);
    setFormProbability(s.probability || 0);
  };

  const confirmEdit = () => {
    if (!formName.trim()) return;
    const isNew = editingId?.startsWith('temp-');
    
    let updatedStages = [...stages];
    
    if (isNew) {
      updatedStages.push({
        id: formName.toUpperCase().replace(/\s+/g, '_'),
        name: formName.trim(),
        color: formColor,
        is_closed: formIsClosed,
        probability: type === 'opportunity' ? formProbability : 0,
        order: stages.length + 1
      });
    } else {
      updatedStages = updatedStages.map(s => {
        if ((s.id || s.name) === editingId) {
          return {
            ...s,
            name: formName.trim(),
            color: formColor,
            is_closed: formIsClosed,
            probability: type === 'opportunity' ? formProbability : s.probability
          };
        }
        return s;
      });
    }
    
    handleSave(updatedStages);
  };

  const removeStage = (idOrName: string) => {
    if (!window.confirm('¿Seguro de eliminar esta etapa? Podría ocultar temporalmente registros en esa etapa hasta que los reasignes.')) return;
    const updated = stages.filter(s => (s.id || s.name) !== idOrName);
    // re-order
    updated.forEach((s, idx) => s.order = idx + 1);
    handleSave(updated);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="slds-text-heading_small slds-m-bottom_xx-small" style={{ fontWeight: 'bold' }}>{title}</h2>
        <p className="slds-text-color_weak">{description}</p>
      </div>
      
      <div className="slds-box" style={{ padding: '0', backgroundColor: 'white' }}>
        <table className="slds-table slds-table_cell-buffer slds-table_bordered">
          <thead>
            <tr className="slds-line-height_reset">
              <th scope="col" style={{ width: '50px' }}><div className="slds-truncate">Orden</div></th>
              <th scope="col"><div className="slds-truncate">Nombre</div></th>
              <th scope="col"><div className="slds-truncate">Color</div></th>
              {type === 'opportunity' && <th scope="col"><div className="slds-truncate">% Éxito</div></th>}
              <th scope="col"><div className="slds-truncate">¿Es Cierre?</div></th>
              <th scope="col" style={{ width: '100px' }}><div className="slds-truncate">Acciones</div></th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, idx) => {
              const isEditingThis = (s.id || s.name) === editingId;
              return (
                <tr key={s.id || s.name} className="slds-hint-parent">
                  <td>{idx + 1}</td>
                  <td>
                    {isEditingThis ? (
                      <input className="slds-input" value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
                    ) : (
                      <strong>{s.name}</strong>
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', backgroundColor: s.color, borderRadius: '4px' }}></div>
                    )}
                  </td>
                  {type === 'opportunity' && (
                    <td>
                      {isEditingThis ? (
                        <input className="slds-input" type="number" value={formProbability} onChange={e => setFormProbability(Number(e.target.value))} style={{ width: '80px' }} />
                      ) : (
                        <span>{s.probability}%</span>
                      )}
                    </td>
                  )}
                  <td>
                    {isEditingThis ? (
                      <input type="checkbox" checked={formIsClosed} onChange={e => setFormIsClosed(e.target.checked)} />
                    ) : (
                      s.is_closed ? 'Sí' : 'No'
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={confirmEdit} disabled={isSaving} className="slds-button slds-button_icon slds-button_icon-brand"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="slds-button slds-button_icon slds-button_icon-error"><X size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => editStage(s)} className="slds-button slds-button_icon slds-button_icon-border"><Edit2 size={16} /></button>
                        <button onClick={() => removeStage(s.id || s.name)} className="slds-button slds-button_icon slds-button_icon-border-filled" style={{ color: 'red' }}><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {editingId?.startsWith('temp-') && (
              <tr className="slds-hint-parent">
                <td>{stages.length + 1}</td>
                <td><input className="slds-input" value={formName} onChange={e => setFormName(e.target.value)} autoFocus placeholder="Ej: Negociación" /></td>
                <td><input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} /></td>
                {type === 'opportunity' && (
                  <td><input className="slds-input" type="number" value={formProbability} onChange={e => setFormProbability(Number(e.target.value))} style={{ width: '80px' }} /></td>
                )}
                <td><input type="checkbox" checked={formIsClosed} onChange={e => setFormIsClosed(e.target.checked)} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={confirmEdit} disabled={isSaving} className="slds-button slds-button_icon slds-button_icon-brand"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="slds-button slds-button_icon slds-button_icon-error"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!editingId && (
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--slds-border)' }}>
            <button onClick={addStage} className="slds-button slds-button_neutral">
              <Plus size={16} className="slds-m-right_xx-small" /> Agregar Etapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
