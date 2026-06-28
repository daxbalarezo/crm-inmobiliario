import React, { useState } from 'react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import AdminKPIs from '../components/admin/AdminKPIs';
import AdminCharts from '../components/admin/AdminCharts';
import { BarChart2 } from 'lucide-react';

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const { loading, globalStats, funnelData, sourceData, workloadData, lossReasonData, activityData } = useAdminMetrics(timeRange);

  if (loading) {
    return (
      <div className="slds-p-around_xx-large slds-text-align_center slds-text-color_weak">
        Cargando métricas...
      </div>
    );
  }

  return (
    <div className="slds-grid slds-grid_vertical slds-p-around_none">
      
      {/* HEADER SECTION */}
      <div className="slds-page-header slds-page-header_record-home" style={{ backgroundColor: '#ffffff', borderRadius: '4px', borderBottom: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.10)' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-performance" style={{ backgroundColor: '#7F8CE7', padding: '0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                  <BarChart2 style={{ color: 'white' }} size={24} />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Visión General">Visión General</span>
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
        <div className="slds-page-header__row slds-page-header__row_details" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #DDDBDA' }}>
          <AdminKPIs globalStats={globalStats} />
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="slds-m-top_medium">
        <AdminCharts 
          funnelData={funnelData} 
          sourceData={sourceData} 
          workloadData={workloadData} 
          lossReasonData={lossReasonData}
          activityData={activityData}
        />
      </div>

    </div>
  );
}
