import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import { saasService, type SaaSSubscription } from '../../../services/saasService';

export default function BillingDashboard() {
  const [subscriptions, setSubscriptions] = useState<SaaSSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await saasService.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMRR = subscriptions.reduce((acc, curr) => acc + Number(curr.mrr), 0);
  const totalARR = totalMRR * 12;

  const handleApproveDeposit = async (id: string) => {
    try {
      await saasService.updateSubscriptionStatus(id, 'active');
      setSubscriptions(prev => prev.map(sub => 
        sub.id === id ? { ...sub, status: 'active' } : sub
      ));
      alert('Depósito aprobado y suscripción renovada exitosamente.');
    } catch (error) {
      console.error('Error approving deposit:', error);
      alert('Error al aprobar el depósito');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="slds-badge slds-theme_success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12}/> Al día</span>;
      case 'pending_verification':
        return <span className="slds-badge slds-theme_warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Validando Depósito</span>;
      case 'past_due':
        return <span className="slds-badge slds-theme_error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12}/> Vencido / Esperando Pago</span>;
      case 'canceled':
        return <span className="slds-badge slds-theme_error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12}/> Cancelado</span>;
      default:
        return <span className="slds-badge">Desconocido</span>;
    }
  };

  return (
    <div>
      <div className="slds-m-bottom_large">
        <p className="slds-text-body_regular slds-text-color_weak">
          Panel financiero principal. Dado que el modelo de cobro es mediante depósito bancario manual, aquí podrás validar comprobantes, conciliar pagos y extender las suscripciones de tus clientes.
        </p>
      </div>

      {/* KPIs */}
      <div className="slds-grid slds-gutters slds-m-bottom_large">
        <div className="slds-col slds-size_1-of-4">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #0176d3' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: '#0176d3', padding: '8px', borderRadius: '4px' }}>
                  <DollarSign size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">MRR (Mensual)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">${totalMRR}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-4">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #1b96ff' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-log-a-call" style={{ backgroundColor: '#1b96ff', padding: '8px', borderRadius: '4px' }}>
                  <TrendingUp size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">ARR (Anual)</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">${totalARR}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-4">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #2e844a' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-account" style={{ backgroundColor: '#2e844a', padding: '8px', borderRadius: '4px' }}>
                  <Users size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Inmobiliarias Activas</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">{inmobiliarias.length}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="slds-col slds-size_1-of-4">
          <div className="slds-card slds-p-around_medium" style={{ borderTop: '3px solid #ba0517' }}>
            <div className="slds-media slds-media_center">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-error" style={{ backgroundColor: '#ba0517', padding: '8px', borderRadius: '4px' }}>
                  <AlertCircle size={20} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <p className="slds-text-heading_small slds-text-color_weak">Churn Rate</p>
                <h2 className="slds-text-heading_large slds-m-top_xx-small">0%</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUSCRIPTIONS TABLE */}
      <div className="slds-card slds-p-around_medium">
        <div className="slds-grid slds-grid_align-spread slds-m-bottom_medium">
          <h3 className="slds-text-heading_small">Control de Suscripciones y Depósitos</h3>
          <button className="slds-button slds-button_neutral">
            <Upload size={14} className="slds-m-right_xx-small" /> Registrar Pago Manualmente
          </button>
        </div>

        <div style={{ width: '100%' }}>
          <div className="slds-scrollable_y" style={{ height: '100%' }}>
            <table className="slds-table slds-table_cell-buffer slds-table_bordered">
              <thead>
                <tr className="slds-line-height_reset">
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Inmobiliaria">Inmobiliaria</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Plan">Plan Actual</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="MRR">MRR</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Estado">Estado del Pago</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Próximo Cobro">Próximo Cobro</div>
                  </th>
                  <th className="" scope="col">
                    <div className="slds-truncate" title="Acciones">Acciones</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length > 0 ? (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="slds-hint-parent">
                      <td data-label="Inmobiliaria">
                        <div className="slds-truncate" title={sub.tenants?.name || 'Desconocida'}><strong>{sub.tenants?.name || 'Desconocida'}</strong></div>
                      </td>
                      <td data-label="Plan">
                        <div className="slds-truncate" title={sub.saas_plans?.name || 'Desconocido'}>{sub.saas_plans?.name || 'Desconocido'}</div>
                      </td>
                      <td data-label="MRR">
                        <div className="slds-truncate" title={`$${sub.mrr}`}>${sub.mrr}</div>
                      </td>
                      <td data-label="Estado">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td data-label="Próximo Cobro">
                        <div className="slds-truncate" title={sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}>
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td data-label="Acciones">
                        {sub.status === 'pending_verification' ? (
                          <button 
                            className="slds-button slds-button_success" 
                            style={{ color: 'white' }}
                            onClick={() => handleApproveDeposit(sub.id)}
                          >
                            Aprobar Depósito
                          </button>
                        ) : (
                          <button className="slds-button slds-button_outline-brand" disabled={sub.status === 'active'}>
                            Reclamar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      {loading ? 'Cargando suscripciones...' : 'No hay suscripciones registradas.'}
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
