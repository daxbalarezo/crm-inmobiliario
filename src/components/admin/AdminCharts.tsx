import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import styles from './AdminCharts.module.css';

interface FunnelData {
  stage: string;
  count: number;
}

interface SourceData {
  name: string;
  value: number;
}

interface WorkloadData {
  name: string;
  activeLeads: number;
}

interface LossReasonData {
  reason: string;
  count: number;
}

interface ActivityData {
  name: string;
  activities: number;
}

interface AdminChartsProps {
  funnelData: FunnelData[];
  sourceData: SourceData[];
  workloadData: WorkloadData[];
  lossReasonData: LossReasonData[];
  activityData: ActivityData[];
}

const SLDS_CATEGORICAL_COLORS = ['#52B7D8', '#E16032', '#FFB03B', '#54A77B', '#4FD2D2', '#E287B2', '#0176D3', '#0B5CAB'];

export default function AdminCharts({ funnelData, sourceData, workloadData, lossReasonData, activityData }: AdminChartsProps) {
  
  const formatName = (name: string) => {
    if (!name) return '';
    const lower = name.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <div className={styles.chartsContainer}>
      {/* Funnel Chart */}
      <article className={`slds-card ${styles.colSpan2}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slds-card__header slds-grid" style={{ marginBottom: '16px' }}>
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Embudo de Conversión Comercial</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak">Volumen de prospectos por etapa en el periodo seleccionado</p>
            </div>
          </header>
          <Link 
            to="/analitica-agentes" 
            className={styles.sldsButtonNeutral}
          >
            Ver detalle
          </Link>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid stroke="#ECEBEA" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#706E6B' }} />
              <YAxis dataKey="stage" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#444444' }} />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Prospectos']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={40}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SLDS_CATEGORICAL_COLORS[index % SLDS_CATEGORICAL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Source Pie Chart */}
      <article className="slds-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slds-card__header slds-grid" style={{ marginBottom: '16px' }}>
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Fuentes de Adquisición</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak">Top 5 orígenes de prospectos</p>
            </div>
          </header>
          <Link 
            to="/reportes-avanzados?type=source"
            className={styles.sldsButtonNeutral}
          >
            Ver detalle
          </Link>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SLDS_CATEGORICAL_COLORS[index % SLDS_CATEGORICAL_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => [value, 'Prospectos']} contentStyle={{ borderRadius: '4px', border: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#444' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Workload Bar Chart */}
      <article className="slds-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slds-card__header slds-grid" style={{ marginBottom: '16px' }}>
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Carga de Trabajo Activa</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak">Leads sin resolver por asesor</p>
            </div>
          </header>
          <Link 
            to="/reportes-avanzados?type=workload"
            className={styles.sldsButtonNeutral}
          >
            Ver detalle
          </Link>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid stroke="#ECEBEA" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#706E6B' }} />
              <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tickFormatter={formatName} tick={{ fontSize: 13, fill: '#444444' }} />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Leads Activos']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="activeLeads" fill="#52B7D8" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      {/* Activity Bar Chart */}
      <article className="slds-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slds-card__header slds-grid" style={{ marginBottom: '16px' }}>
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Métricas de Productividad</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak">Total de acciones registradas por asesor</p>
            </div>
          </header>
          <Link 
            to="/reportes-avanzados?type=productivity"
            className={styles.sldsButtonNeutral}
          >
            Ver detalle
          </Link>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid stroke="#ECEBEA" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#706E6B' }} />
              <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tickFormatter={formatName} tick={{ fontSize: 13, fill: '#444444' }} />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Acciones Registradas']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="activities" fill="#E16032" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Loss Reasons Pie Chart */}
      <article className="slds-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slds-card__header slds-grid" style={{ marginBottom: '16px' }}>
          <header className="slds-media slds-media_center slds-has-flexi-truncate">
            <div className="slds-media__body">
              <h2 className="slds-card__header-title">
                <span className="slds-text-heading_small slds-truncate">Análisis de Ventas Perdidas</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak">Principales motivos de pérdida</p>
            </div>
          </header>
          <Link 
            to="/reportes-avanzados?type=loss_reasons"
            className={styles.sldsButtonNeutral}
          >
            Ver detalle
          </Link>
        </div>
        <div className="slds-card__body slds-card__body_inner" style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lossReasonData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="reason"
                stroke="none"
              >
                {lossReasonData.map((entry, index) => (
                  <Cell key={`cell-loss-${index}`} fill={SLDS_CATEGORICAL_COLORS[(index + 4) % SLDS_CATEGORICAL_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => [value, 'Casos Perdidos']} contentStyle={{ borderRadius: '4px', border: '1px solid #DDDBDA', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#444' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
