import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { type SaaSSubscription } from '../../../services/saasService';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SaaSSubscription | null;
  onSave: (id: string, updates: { current_period_end: string, status: 'active' | 'past_due' | 'canceled' | 'pending_verification' }) => Promise<void>;
}

export default function EditSubscriptionModal({ isOpen, onClose, subscription, onSave }: EditSubscriptionModalProps) {
  const [status, setStatus] = useState('active');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subscription) {
      setStatus(subscription.status);
      if (subscription.current_period_end) {
        // Format for input type="date" (YYYY-MM-DD)
        const dateObj = new Date(subscription.current_period_end);
        setEndDate(dateObj.toISOString().split('T')[0]);
      } else {
        setEndDate('');
      }
    }
  }, [subscription]);

  if (!isOpen || !subscription) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // Construct a valid ISO string from the date input
      const finalDate = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : new Date().toISOString();
      await onSave(subscription.id, {
        status,
        current_period_end: finalDate
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
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
          <h2 className="slds-modal__title slds-hyphenate">
            Editar Suscripción: {subscription.tenants?.name || 'Inmobiliaria'}
          </h2>
        </header>
        
        <div className="slds-modal__content slds-p-around_medium">
          <form id="edit-sub-form" onSubmit={handleSave} className="slds-form slds-form_stacked">
            
            <div className="slds-form-element slds-m-bottom_medium">
              <label className="slds-form-element__label">Estado del Pago</label>
              <div className="slds-form-element__control">
                <div className="slds-select_container">
                  <select 
                    className="slds-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    <option value="active">Al día (Activo)</option>
                    <option value="pending_verification">Validando Depósito</option>
                    <option value="past_due">Moroso / Vencido</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="slds-form-element slds-m-bottom_medium">
              <label className="slds-form-element__label">
                <Calendar size={14} className="slds-m-right_xx-small" style={{display:'inline'}}/> 
                Fecha del Próximo Cobro
              </label>
              <div className="slds-form-element__control">
                <input 
                  type="date" 
                  className="slds-input" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              {status === 'past_due' && (
                <div className="slds-form-element__help" style={{ color: '#ba0517', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  <AlertCircle size={14} className="slds-m-right_xx-small"/> 
                  Si guardas como moroso, el sistema podría suspender el acceso de esta inmobiliaria.
                </div>
              )}
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
            form="edit-sub-form"
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </footer>
        </div>
      </section>
      <div className="slds-backdrop slds-backdrop_open" role="presentation"></div>
    </>
  );
}
