import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import type { AgentStats } from '../../hooks/useAdminMetrics';

interface PerformanceChartsProps {
  stats: AgentStats[];
}

export function SalesLeaderboardChart({ stats }: PerformanceChartsProps) {
  // Ordenar por volumen de ventas y tomar el top 5 o 10
  const data = [...stats]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10)
    .map(stat => ({
      name: stat.name,
      Ventas: stat.totalVolume,
    }));

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => `S/ ${value / 1000}k`} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: number) => [`S/ ${value.toLocaleString('en-PE')}`, 'Ventas Totales']}
            contentStyle={{ borderRadius: '4px', border: '1px solid #DDDBDA' }}
          />
          <Bar dataKey="Ventas" fill="#0176d3" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SLAComplianceChart({ stats }: PerformanceChartsProps) {
  // Sumar todos los leads contactados y los que cumplieron SLA
  const totalContacted = stats.reduce((acc, curr) => acc + curr.totalContactedLeads, 0);
  const totalCompliant = stats.reduce((acc, curr) => acc + curr.slaCompliantLeads, 0);
  const totalNonCompliant = totalContacted - totalCompliant;
  const totalUncontacted = stats.reduce((acc, curr) => acc + curr.uncontactedLeads, 0);

  const data = [
    { name: 'A Tiempo (SLA)', value: totalCompliant, color: '#54A77B' }, // SLDS Categorical Green
    { name: 'Fuera de Tiempo', value: totalNonCompliant, color: '#FFB03B' }, // SLDS Categorical Yellow/Orange
    { name: 'Sin Contactar (Alerta)', value: totalUncontacted, color: '#E16032' }, // SLDS Categorical Red/Orange
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="slds-illustration slds-illustration_small" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="slds-text-longform slds-text-align_center">
          <h3 className="slds-text-heading_medium">Sin Datos</h3>
          <p className="slds-text-body_regular">No hay leads registrados en este periodo.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value} leads`, 'Cantidad']}
            contentStyle={{ borderRadius: '4px', border: '1px solid #DDDBDA' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
