import { useState } from 'react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import SLATable from '../components/admin/SLATable';
import { Clock } from 'lucide-react';

export default function SLAPage() {
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const { loading, stats } = useAdminMetrics(timeRange);

  if (loading) {
    return <div className="slds-p-around_xx-large slds-text-align_center slds-text-color_weak">Cargando métricas...</div>;
  }

  return (
    <div className="slds-grid slds-grid_vertical slds-p-around_none">
      
      {/* HEADER SECTION */}
      <div className="slds-page-header slds-page-header_record-home" style={{ backgroundColor: '#ffffff', borderRadius: '4px', borderBottom: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-performance" style={{ backgroundColor: '#F2CF5B', padding: '0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                  <Clock style={{ color: 'white' }} size={24} />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Tiempos de Respuesta (SLA)">Tiempos de Respuesta (SLA)</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Agilidad en el primer contacto</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                <div className="slds-select_container">
                  <select 
                    value={timeRange} 
                    onChange={e => setTimeRange(e.target.value)}
                    className="slds-select"
                  >
                    <option value="this_month">Este mes</option>
                    <option value="last_month">Mes pasado</option>
                    <option value="last_6_months">Últimos 6 meses</option>
                    <option value="this_year">Este año</option>
                    <option value="all">Histórico Total</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="slds-m-top_medium">
        <article className="slds-card">
          <div className="slds-card__body slds-card__body_inner">
            <SLATable stats={stats} />
          </div>
        </article>
      </div>
    </div>
  );
}
