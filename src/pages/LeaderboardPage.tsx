import React, { useState } from 'react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import styles from './AdminDashboard.module.css';
import LeaderboardTable from '../components/admin/LeaderboardTable';
import SLATable from '../components/admin/SLATable';
import { SalesLeaderboardChart, SLAComplianceChart } from '../components/admin/PerformanceCharts';
import { useCRM } from '../context/CRMContext';

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Cabecera Ejecutiva (Page Header) */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.headerTitleBlock}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <div className={styles.headerTextGroup}>
              <p className={styles.headerBreadcrumb}>Analíticas</p>
              <h2 className={styles.title}>Panel de Rendimiento y Tiempos</h2>
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <div className="slds-select_container">
              <select 
                className={`slds-select hide-native-arrow ${styles.timeFilter}`}
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

        <div className={styles.headerDetailRow}>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>VENTAS TOTALES</p>
            <p className={styles.detailValue}>
              S/ {globalStats.totalClosed.toLocaleString('en-PE')}
            </p>
          </div>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>TASA DE CONVERSIÓN</p>
            <p className={styles.detailValue}>
              {globalStats.avgConv.toFixed(1)}%
            </p>
          </div>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>CUMPLIMIENTO SLA</p>
            <p className={styles.detailValue}>
              <span className={globalSLARate >= 80 ? 'slds-text-color_success' : globalSLARate >= 50 ? 'slds-text-color_warning' : 'slds-text-color_error'}>
                {globalSLARate.toFixed(1)}%
              </span>
            </p>
            <span className={styles.detailSubtext}>
              (Meta: {slaTargetHours}h)
            </span>
          </div>
          <div className={styles.detailItem}>
            <p className={styles.detailLabel}>TOTAL ASIGNADOS</p>
            <p className={styles.detailValue}>
              {globalStats.totalLeads}
            </p>
          </div>
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
