import React, { useState } from 'react';
import { X } from 'lucide-react';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; ruc: string; plan: string; firstProject: string }) => Promise<void>;
}

export default function NewTenantModal({ isOpen, onClose, onSave }: NewTenantModalProps) {
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantRuc, setNewTenantRuc] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('starter');
  const [newTenantFirstProject, setNewTenantFirstProject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;
    setIsCreating(true);
    try {
      await onSave({
        name: newTenantName,
        ruc: newTenantRuc,
        plan: newTenantPlan,
        firstProject: newTenantFirstProject
      });
      // Reset form
      setNewTenantName('');
      setNewTenantRuc('');
      setNewTenantPlan('starter');
      setNewTenantFirstProject('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <section role="dialog" tabIndex={-1} aria-modal="true" className="slds-modal slds-fade-in-open">
        <div className="slds-modal__container">
          <header className="slds-modal__header">
            <button 
              className="slds-button slds-button_icon slds-modal__close" 
              title="Cerrar"
              onClick={onClose}
            >
              <X size={24} />
              <span className="slds-assistive-text">Cerrar</span>
            </button>
            <h2 className="slds-text-heading_medium slds-hyphenate">Registrar Nueva Inmobiliaria</h2>
          </header>
          <div className="slds-modal__content slds-p-around_medium">
            <form id="new-tenant-form" onSubmit={handleSubmit}>
              
              <div className="slds-form-element slds-m-bottom_small">
                <label className="slds-form-element__label">
                  <abbr className="slds-required" title="required">* </abbr>
                  Nombre Comercial
                </label>
                <div className="slds-form-element__control">
                  <input 
                    type="text" 
                    required 
                    value={newTenantName} 
                    onChange={e => setNewTenantName(e.target.value)} 
                    className="slds-input" 
                    placeholder="Ej. Constructora Los Andes" 
                  />
                </div>
              </div>

              <div className="slds-form-element slds-m-bottom_small">
                <label className="slds-form-element__label">RUC (Opcional)</label>
                <div className="slds-form-element__control">
                  <input 
                    type="text" 
                    value={newTenantRuc} 
                    onChange={e => setNewTenantRuc(e.target.value)} 
                    className="slds-input" 
                    placeholder="Ej. 20123456789" 
                  />
                </div>
              </div>

              <div className="slds-form-element slds-m-bottom_small">
                <label className="slds-form-element__label">Plan Asignado</label>
                <div className="slds-form-element__control">
                  <div className="slds-select_container">
                    <select 
                      value={newTenantPlan} 
                      onChange={e => setNewTenantPlan(e.target.value)} 
                      className="slds-select"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="slds-form-element slds-m-bottom_small">
                <label className="slds-form-element__label">Nombre del 1er Proyecto (Opcional)</label>
                <div className="slds-form-element__control">
                  <input 
                    type="text" 
                    value={newTenantFirstProject} 
                    onChange={e => setNewTenantFirstProject(e.target.value)} 
                    className="slds-input" 
                    placeholder="Ej. Condominio Las Palmas" 
                  />
                </div>
              </div>

            </form>
          </div>
          <footer className="slds-modal__footer">
            <button 
              className="slds-button slds-button_neutral" 
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button 
              className="slds-button slds-button_brand" 
              type="submit" 
              form="new-tenant-form"
              disabled={isCreating}
            >
              {isCreating ? 'Creando...' : 'Guardar Empresa'}
            </button>
          </footer>
        </div>
      </section>
      <div className="slds-backdrop slds-backdrop_open" role="presentation"></div>
    </>
  );
}
