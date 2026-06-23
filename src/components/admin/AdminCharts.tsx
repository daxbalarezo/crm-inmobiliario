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

const CORPORATE_COLORS = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
const FUNNEL_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e3a8a'];

export default function AdminCharts({ funnelData, sourceData, workloadData, lossReasonData, activityData }: AdminChartsProps) {
  return (
    <div className={styles.chartsContainer}>
      {/* Funnel Chart */}
      <div className={`${styles.chartCard} ${styles.fullWidth}`}>
        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className={styles.cardTitle}>Embudo de Conversión Comercial</h3>
            <p className={styles.cardSubtitle}>Volumen de prospectos por etapa en el periodo seleccionado</p>
          </div>
          <Link 
            to="/analitica-agentes" 
            style={{ fontSize: '13px', color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none', padding: '6px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', transition: 'background-color 0.2s' }}
          >
            Ver detalle por asesor →
          </Link>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" />
              <YAxis />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Prospectos']}
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={60}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source Pie Chart */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className={styles.cardTitle}>Fuentes de Adquisición</h3>
            <p className={styles.cardSubtitle}>Top 5 orígenes de prospectos</p>
          </div>
          <Link 
            to="/reportes-avanzados?type=source"
            style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORPORATE_COLORS[index % CORPORATE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => [value, 'Prospectos']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workload Bar Chart */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className={styles.cardTitle}>Carga de Trabajo Activa</h3>
            <p className={styles.cardSubtitle}>Leads sin resolver por asesor</p>
          </div>
          <Link 
            to="/reportes-avanzados?type=workload"
            style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Leads Activos']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="activeLeads" fill="#475569" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Activity Bar Chart */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className={styles.cardTitle}>Métricas de Productividad</h3>
            <p className={styles.cardSubtitle}>Total de acciones registradas por asesor</p>
          </div>
          <Link 
            to="/reportes-avanzados?type=productivity"
            style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <RechartsTooltip 
                formatter={(value: number) => [value, 'Acciones Registradas']}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="activities" fill="#1e293b" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss Reasons Pie Chart */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className={styles.cardTitle}>Análisis de Ventas Perdidas</h3>
            <p className={styles.cardSubtitle}>Principales motivos de pérdida</p>
          </div>
          <Link 
            to="/reportes-avanzados?type=loss_reasons"
            style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}
          >
            Ver detalle →
          </Link>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lossReasonData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
                label={({ reason, percent }) => `${reason} ${(percent * 100).toFixed(0)}%`}
              >
                {lossReasonData.map((entry, index) => (
                  <Cell key={`cell-loss-${index}`} fill={CORPORATE_COLORS[(index + 2) % CORPORATE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number) => [value, 'Casos Perdidos']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
