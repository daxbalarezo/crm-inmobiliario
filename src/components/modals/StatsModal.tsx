import React, { useState, useMemo } from 'react';
import { 
  X, BarChart3, PieChart, Copy, CheckCircle2, Filter, 
  PhoneMissed, TrendingUp, CheckCircle, Ban, Users 
} from 'lucide-react';
import type { Lead } from '../../types/definitions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

export default function StatsModal({ isOpen, onClose, leads }: Props) {
  if (!isOpen) return null;

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  const [selectedType, setSelectedType] = useState<'TODOS' | 'LOTE' | 'DEPA'>('TODOS');
  const [selectedSource, setSelectedSource] = useState('TODAS');
  
  const [copied, setCopied] = useState(false);

  // Normalización de Fuentes
  const normalizeSource = (source: string | undefined) => {
      if (!source) return 'Sin Fuente';
      const s = source.trim();
      if (s === 'Organicos') return 'Orgánicos';
      return s;
  };

  const availableSources = useMemo(() => {
    const sources = new Set(leads.map(l => normalizeSource(l.source)).filter(Boolean));
    return Array.from(sources).sort();
  }, [leads]);

  // --- LÓGICA DE CÁLCULO AVANZADA ---
  const stats = useMemo(() => {
    const filteredLeads = leads.filter(lead => {
      // 1. Filtro Fecha
      let dateObj: Date;
      if (lead.contactDate) {
          dateObj = new Date(lead.contactDate);
      } else if (lead.createdAt) {
          if (typeof lead.createdAt === 'object' && 'seconds' in lead.createdAt) {
              dateObj = new Date(lead.createdAt.seconds * 1000);
          } else {
              dateObj = new Date(lead.createdAt);
          }
      } else {
          dateObj = new Date();
      }

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const leadDateString = `${year}-${month}-${day}`;

      if (leadDateString < startDate || leadDateString > endDate) return false;

      // 2. Filtro Tipo
      if (selectedType !== 'TODOS' && lead.type !== selectedType) return false;

      // 3. Filtro Fuente
      const leadSourceNormalized = normalizeSource(lead.source);
      if (selectedSource !== 'TODAS' && leadSourceNormalized !== selectedSource) return false;

      return true;
    });

    // ESTRUCTURA DE DATOS PARA LA MATRIZ
    const sourceStats: Record<string, { 
        total: number; 
        noAnswer: number; // No Contesta
        inProcess: number; // En Gestión (Interesados/Nuevos/Visitas)
        sold: number;      // Vendidos
        discarded: number; // No Interesado
    }> = {};

    let grandTotal = 0;

    filteredLeads.forEach(lead => {
      const source = normalizeSource(lead.source);
      const status = lead.type === 'LOTE' ? lead.statusLote : lead.statusDepa;

      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, noAnswer: 0, inProcess: 0, sold: 0, discarded: 0 };
      }

      sourceStats[source].total++;
      grandTotal++;

      // CLASIFICACIÓN DE ESTADOS
      if (status === 'No Contesta') {
          sourceStats[source].noAnswer++;
      } else if (status === 'Vendido') {
          sourceStats[source].sold++;
      } else if (status === 'No Interesado') {
          sourceStats[source].discarded++;
      } else {
          // Todo lo demás (Nuevo, Contactado, Visita, Separación) cuenta como "En Gestión"
          sourceStats[source].inProcess++;
      }
    });

    const sortedSources = Object.entries(sourceStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage: grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(1) : '0'
      }));

    return { 
        total: grandTotal, 
        sortedSources 
    };
  }, [leads, startDate, endDate, selectedType, selectedSource]);

  const copyToClipboard = () => {
    const text = `📊 REPORTE DE RENDIMIENTO POR CANAL\n` +
      `📅 Periodo: ${startDate} al ${endDate}\n` +
      `--------------------------------------------------\n` +
      `FUENTE | TOTAL | 🚫 NC | 🔄 GESTIÓN | 💰 VENTAS | 🗑️ DESC\n` +
      `--------------------------------------------------\n` +
      stats.sortedSources.map(s => 
        `${s.name.padEnd(15)} | ${s.total} | ${s.noAnswer} | ${s.inProcess} | ${s.sold} | ${s.discarded}`
      ).join('\n') + 
      `\n\nTOTAL GENERAL: ${stats.total} Leads`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden ring-1 ring-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" /> Reporte de Rendimiento
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50/50">
          
          {/* FILTROS */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Filter size={14}/> Configuración del Reporte
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Desde</label>
                      <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Hasta</label>
                      <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Producto</label>
                      <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-medium outline-none" value={selectedType} onChange={e => setSelectedType(e.target.value as any)}>
                          <option value="TODOS">Todos</option>
                          <option value="LOTE">Lotes</option>
                          <option value="DEPA">Depas</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Fuente Específica</label>
                      <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-medium outline-none" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
                          <option value="TODAS">Todas</option>
                          {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
              </div>
          </div>

          {/* KPI GENERAL */}
          <div className="mb-6 flex justify-between items-end px-2">
             <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Total Leads en Rango</span>
                <div className="text-3xl font-black text-gray-800 leading-tight">{stats.total}</div>
             </div>
             <div className="text-right">
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100">
                    {stats.sortedSources.length} Canales Activos
                </span>
             </div>
          </div>

          {/* TABLA DE RESULTADOS - MATRIZ DE RENDIMIENTO */}
          <div className="space-y-2">
            
            {/* Cabecera de Tabla */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4 flex items-center gap-1">Fuente / Medio</div>
                <div className="col-span-2 text-center" title="Total Ingresados">Total</div>
                <div className="col-span-1 text-center text-rose-600" title="No Contesta"><PhoneMissed size={14} className="mx-auto"/></div>
                <div className="col-span-2 text-center text-indigo-600" title="En Gestión (Interesados)"><TrendingUp size={14} className="mx-auto"/></div>
                <div className="col-span-1 text-center text-emerald-600" title="Ventas Cerradas"><CheckCircle size={14} className="mx-auto"/></div>
                <div className="col-span-2 text-center text-gray-400" title="Descartados"><Ban size={14} className="mx-auto"/></div>
            </div>

            {/* Filas */}
            {stats.sortedSources.length > 0 ? (
                stats.sortedSources.map((item) => (
                    <div key={item.name} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white rounded-lg border border-gray-100 shadow-sm items-center hover:border-indigo-200 transition-colors">
                        
                        {/* Columna Fuente */}
                        <div className="col-span-4 font-bold text-gray-700 text-sm truncate flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-[10px] text-gray-400 font-normal">{item.percentage}% del tráfico</span>
                        </div>

                        {/* Columna Total */}
                        <div className="col-span-2 text-center">
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-bold text-xs">{item.total}</span>
                        </div>

                        {/* No Contesta */}
                        <div className="col-span-1 text-center font-bold text-xs text-rose-600">
                            {item.noAnswer > 0 ? item.noAnswer : '-'}
                        </div>

                        {/* En Gestión (El dato más importante de seguimiento) */}
                        <div className="col-span-2 text-center font-bold text-xs text-indigo-600 bg-indigo-50 py-1 rounded">
                            {item.inProcess}
                        </div>

                        {/* Ventas */}
                        <div className="col-span-1 text-center font-bold text-xs text-emerald-600">
                            {item.sold > 0 ? item.sold : '-'}
                        </div>

                        {/* Descartados */}
                        <div className="col-span-2 text-center font-bold text-xs text-gray-400">
                            {item.discarded > 0 ? item.discarded : '-'}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
                    No hay datos para mostrar en este periodo.
                </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-white flex justify-between items-center shrink-0">
            <p className="text-xs text-gray-400 italic hidden sm:block">Datos basados en Fecha de Ingreso (contactDate).</p>
            <button 
                onClick={copyToClipboard}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${copied ? 'bg-green-600 text-white' : 'bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
            >
                {copied ? <><CheckCircle2 size={18}/> Matriz Copiada</> : <><Copy size={18}/> Copiar Matriz</>}
            </button>
        </div>
      </div>
    </div>
  );
}