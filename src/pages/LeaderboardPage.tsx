import React, { useState } from 'react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import LeaderboardTable from '../components/admin/LeaderboardTable';
import SLATable from '../components/admin/SLATable';
import { SalesLeaderboardChart, SLAComplianceChart } from '../components/admin/PerformanceCharts';
import { useCRM } from '../context/CRMContext';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'performance' | 'sla'>('performance');
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const { loading, stats, globalStats } = useAdminMetrics(timeRange);
  const { tenant } = useCRM();

  if (loading) {
    return (
      <div className="slds-p-around_xx-large slds-text-align_center">
        <div role="status" className="slds-spinner slds-spinner_medium slds-spinner_brand">
          <span className="slds-assistive-text">Cargando...</span>
          <div className="slds-spinner__dot-a"></div>
          <div className="slds-spinner__dot-b"></div>
        </div>
      </div>
    );
  }

  const slaTargetHours = tenant?.slaTargetHours || 2;
  const globalSLACompliant = stats.reduce((acc, curr) => acc + curr.slaCompliantLeads, 0);
  const globalSLAContacted = stats.reduce((acc, curr) => acc + curr.totalContactedLeads, 0);
  const globalSLARate = globalSLAContacted > 0 ? (globalSLACompliant / globalSLAContacted) * 100 : 0;

  return (
    <>
    <style>{`
      .hide-native-arrow {
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        padding-top: 0px !important;
        padding-bottom: 4px !important;
        line-height: normal !important;
      }
    `}</style>
    <div className="slds-grid slds-grid_vertical slds-p-around_none slds-m-bottom_large">
      
      {/* HEADER SECTION */}
      <div className="slds-page-header slds-page-header_record-home slds-m-bottom_medium" style={{ backgroundColor: '#ffffff', borderRadius: '4px', borderBottom: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-performance" style={{ backgroundColor: '#F2CF5B', padding: '0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                  <Trophy style={{ color: 'white' }} size={24} />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Panel de Rendimiento y Tiempos">Panel de Rendimiento y Tiempos</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Analíticas</p>
              </div>
            </div>
          </div>
          
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                <div className="slds-select_container">
                  <select 
                    className="slds-select hide-native-arrow"
                    value={timeRange} 
                    onChange={e => setTimeRange(e.target.value)}
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

        <div className="slds-page-header__row slds-page-header__row_details" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #DDDBDA' }}>
          <ul className="slds-page-header__detail-row">
            <li className="slds-page-header__detail-block">
              <div className="slds-text-title slds-truncate" title="VENTAS TOTALES">VENTAS TOTALES</div>
              <div className="slds-truncate" title={`S/ ${globalStats.totalClosed.toLocaleString('en-PE')}`}>
                <span className="slds-text-heading_small slds-text-color_success" style={{ fontWeight: 600 }}>S/ {globalStats.totalClosed.toLocaleString('en-PE')}</span>
              </div>
            </li>
            <li className="slds-page-header__detail-block">
              <div className="slds-text-title slds-truncate" title="TASA DE CONVERSIÓN">TASA DE CONVERSIÓN</div>
              <div className="slds-truncate" title={`${globalStats.avgConv.toFixed(1)}%`}>
                <span className="slds-text-heading_small" style={{ fontWeight: 600 }}>{globalStats.avgConv.toFixed(1)}%</span>
              </div>
            </li>
            <li className="slds-page-header__detail-block">
              <div className="slds-text-title slds-truncate" title="CUMPLIMIENTO SLA">CUMPLIMIENTO SLA</div>
              <div className="slds-truncate" title={`${globalSLARate.toFixed(1)}%`}>
                <span className={`slds-text-heading_small ${globalSLARate >= 80 ? 'slds-text-color_success' : globalSLARate >= 50 ? 'slds-text-color_warning' : 'slds-text-color_error'}`} style={{ fontWeight: 600 }}>
                  {globalSLARate.toFixed(1)}%
                </span>
                <span className="slds-text-color_weak slds-m-left_x-small" style={{ fontSize: '0.75rem' }}>(Meta: {slaTargetHours}h)</span>
              </div>
            </li>
            <li className="slds-page-header__detail-block">
              <div className="slds-text-title slds-truncate" title="TOTAL ASIGNADOS">TOTAL ASIGNADOS</div>
              <div className="slds-truncate" title={`${globalStats.totalLeads}`}>
                <span className="slds-text-heading_small" style={{ fontWeight: 600 }}>{globalStats.totalLeads}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* 2. Capa Visual (Gráficos) */}
      <div className="slds-grid slds-gutters slds-m-bottom_medium">
        <div className="slds-col slds-size_2-of-3">
          <article className="slds-card" style={{ height: '100%' }}>
            <div className="slds-card__header slds-grid">
              <header className="slds-media slds-media_center slds-has-flexi-truncate">
                <div className="slds-media__body">
                  <h2 className="slds-card__header-title">
                    <span className="slds-text-heading_small">Volumen de Ventas por Asesor (Top 10)</span>
                  </h2>
                </div>
              </header>
            </div>
            <div className="slds-card__body slds-card__body_inner">
              <SalesLeaderboardChart stats={stats} />
            </div>
          </article>
        </div>
        
        <div className="slds-col slds-size_1-of-3">
          <article className="slds-card" style={{ height: '100%' }}>
            <div className="slds-card__header slds-grid">
              <header className="slds-media slds-media_center slds-has-flexi-truncate">
                <div className="slds-media__body">
                  <h2 className="slds-card__header-title">
                    <span className="slds-text-heading_small">Salud de Tiempos de Respuesta</span>
                  </h2>
                </div>
              </header>
            </div>
            <div className="slds-card__body slds-card__body_inner">
              <SLAComplianceChart stats={stats} />
            </div>
          </article>
        </div>
      </div>

      {/* 3. Capa de Detalle (List Views en Pestañas) */}
      <article className="slds-card">
        <div className="slds-tabs_default">
          <ul className="slds-tabs_default__nav" role="tablist">
            <li className={`slds-tabs_default__item ${activeTab === 'performance' ? 'slds-is-active' : ''}`} title="Tabla de Rendimiento Comercial" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" tabIndex={0} aria-selected={activeTab === 'performance'} aria-controls="tab-default-1" id="tab-default-1__item" onClick={(e) => { e.preventDefault(); setActiveTab('performance'); }}>
                Vista Detallada de Rendimiento
              </a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'sla' ? 'slds-is-active' : ''}`} title="Tabla de Cumplimiento de Tiempos" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" tabIndex={-1} aria-selected={activeTab === 'sla'} aria-controls="tab-default-2" id="tab-default-2__item" onClick={(e) => { e.preventDefault(); setActiveTab('sla'); }}>
                Vista Detallada de Tiempos de Respuesta
              </a>
            </li>
          </ul>
          <div id="tab-default-1" className={`slds-tabs_default__content ${activeTab === 'performance' ? 'slds-show' : 'slds-hide'}`} role="tabpanel" aria-labelledby="tab-default-1__item">
            <LeaderboardTable stats={stats} />
          </div>
          <div id="tab-default-2" className={`slds-tabs_default__content ${activeTab === 'sla' ? 'slds-show' : 'slds-hide'}`} role="tabpanel" aria-labelledby="tab-default-2__item">
            <SLATable stats={stats} />
          </div>
        </div>
      </article>
    </div>
    </>
  );
}
