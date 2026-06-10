import React, { useMemo } from 'react';
import { Target, Clock, AlertCircle, PhoneCall, ArrowRight, Wallet, Users, Home as PropIcon } from 'lucide-react';
// Usamos "import type" para obligar a Vite a compilarlo correctamente
import type { Lead } from '../types/definitions'; 
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';

export default function HomeDashboard() {
  const { leads, loading } = useCommercialData();
  const { userProfile } = useCRM();

  // Cálculo de datos en tiempo real
  const data = useMemo(() => {
    if (!leads) return null;

    const today = new Date();
    // Ajuste de zona horaria local (Perú) para evitar cruces UTC
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // 1. MÉTRICAS DEL EMBUDO
    const nuevos = leads.filter(l => l.status === 'NUEVO').length;
    // Mapeamos 'EN_NEGOCIACION' como visitas/citas activas
    const enNegociacion = leads.filter(l => l.status === 'EN_NEGOCIACION').length;
    const cierres = leads.filter(l => l.status === 'VENTA_CERRADA').length;
    
    // Regla de negocio provisional (Ej: S/ 1,500 fijos de comisión por unidad)
    const comisiones = cierres * 1500;

    // 2. GESTIÓN DE TAREAS (Seguimientos)
    const seguimientos = leads.filter(l => l.nextFollowUpDate).map(l => {
      const isAtrasado = l.nextFollowUpDate! < todayStr;
      const isHoy = l.nextFollowUpDate! === todayStr;
      return { ...l, isAtrasado, isHoy };
    });

    const atrasados = seguimientos.filter(t => t.isAtrasado);
    const paraHoy = seguimientos.filter(t => t.isHoy);
    // Unimos y ordenamos para mostrar primero lo más urgente
    const tareasUrgentes = [...atrasados, ...paraHoy].slice(0, 4);

    // 3. CALIDAD DE LEADS
    const totales = leads.length || 1; // Evitamos división por cero
    const efectivos = leads.filter(l => ['NUEVO', 'EN_NEGOCIACION', 'SEPARADO', 'VENTA_CERRADA'].includes(l.status)).length;
    const enSeguimiento = leads.filter(l => ['INCUBADORA', 'NO_CONTACTADO'].includes(l.status)).length;
    const noEfectivos = leads.filter(l => l.status === 'NO_INTERESADO').length;

    return {
      metricas: {
        nuevos,
        visitas: enNegociacion,
        cierres,
        comisiones: `S/ ${comisiones.toLocaleString('en-PE')}`
      },
      tareas: {
        atrasadosCount: atrasados.length,
        paraHoyCount: paraHoy.length,
        lista: tareasUrgentes
      },
      calidad: {
        totales: leads.length,
        efectivos: { count: efectivos, pct: Math.round((efectivos / totales) * 100) },
        enSeguimiento: { count: enSeguimiento, pct: Math.round((enSeguimiento / totales) * 100) },
        noEfectivos: { count: noEfectivos, pct: Math.round((noEfectivos / totales) * 100) }
      }
    };
  }, [leads]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6AC]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">


        {/* CABECERA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-2xl font-semibold text-[#181818] tracking-tight">
                    Resumen, {userProfile?.name?.split(' ')[0] || 'Usuario'}
                </h2>
                <p className="text-[#444444] mt-1 text-sm">Vista general de cartera comercial</p>
            </div>
            <button className="bg-white border border-[#DDDBDA] text-[#0176D3] px-4 py-2 rounded-sm text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all">
                <Target size={16} /> Ver mis metas
            </button>
        </div>

        {/* 1. EMBUDO DE CONVERSIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-sm border border-[#DDDBDA]">
                <p className="text-[#444444] text-sm font-medium uppercase tracking-wide mb-1">Nuevos Leads</p>
                <p className="text-3xl font-light text-[#181818]">{data.metricas.nuevos}</p>
            </div>
            <div className="bg-white p-4 rounded-sm border border-[#DDDBDA]">
                <p className="text-[#444444] text-sm font-medium uppercase tracking-wide mb-1">Citas Activas</p>
                <p className="text-3xl font-light text-[#181818]">{data.metricas.visitas}</p>
            </div>
            <div className="bg-white p-4 rounded-sm border border-[#DDDBDA]">
                <p className="text-[#444444] text-sm font-medium uppercase tracking-wide mb-1">Cierres Mes</p>
                <p className="text-3xl font-light text-[#181818]">{data.metricas.cierres}</p>
            </div>
            <div className="bg-white p-4 rounded-sm border-t-4 border-t-[#0176D3] border-b border-x border-[#DDDBDA]">
                <p className="text-[#0176D3] text-sm font-bold uppercase tracking-wide mb-1">Comisiones</p>
                <p className="text-3xl font-semibold text-[#181818]">{data.metricas.comisiones}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* 2. CENTRO DE COMANDO (Tareas Pendientes) */}
            <div className="xl:col-span-2 bg-white rounded-sm border border-[#DDDBDA] flex flex-col">
                <div className="px-4 py-3 border-b border-[#DDDBDA] flex items-center justify-between bg-[#F3F3F3]/50">
                    <h3 className="font-semibold text-sm text-[#181818] uppercase tracking-wide">
                        Próximos Seguimientos
                    </h3>
                    <div className="flex gap-2">
                        {data.tareas.atrasadosCount > 0 && (
                          <span className="text-[13px] font-bold px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
                              Atrasados: {data.tareas.atrasadosCount}
                          </span>
                        )}
                        <span className="text-[13px] font-bold px-2 py-0.5 rounded-sm bg-white text-[#444444] border border-[#DDDBDA]">
                            Hoy: {data.tareas.paraHoyCount}
                        </span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {data.tareas.lista.length === 0 ? (
                        <div className="p-6 text-center text-[#444444] text-sm">
                            No hay seguimientos urgentes en cola.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-[#181818] border-collapse">
                            <thead className="bg-white border-b border-[#DDDBDA]">
                                <tr>
                                    <th className="px-4 py-2 font-semibold text-[#444444] font-normal w-1/2">Prospecto</th>
                                    <th className="px-4 py-2 font-semibold text-[#444444] font-normal">Nota</th>
                                    <th className="px-4 py-2 font-semibold text-[#444444] font-normal text-right w-16">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DDDBDA]">
                                {data.tareas.lista.map((tarea, index) => (
                                    <tr key={tarea.id || index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-3 rounded-full ${tarea.isAtrasado ? 'bg-rose-500' : 'bg-[#0176D3]'}`}></div>
                                                {tarea.name || 'Prospecto sin nombre'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-[#444444] truncate max-w-[200px]">{tarea.nextFollowUpNote || 'Seguimiento programado'}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button className="text-[#0176D3] hover:underline font-semibold" title="Llamar">
                                                Contactar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="p-3 border-t border-[#DDDBDA] text-center bg-white">
                    <button className="text-sm font-semibold text-[#0176D3] hover:underline">Ver todo</button>
                </div>
            </div>

            {/* 3. CALIDAD DE LEADS (Stacked Bar) */}
            <div className="bg-white rounded-sm border border-[#DDDBDA] flex flex-col justify-between">
                <div className="px-4 py-3 border-b border-[#DDDBDA] bg-[#F3F3F3]/50">
                    <h3 className="font-semibold text-sm text-[#181818] uppercase tracking-wide">Desempeño de Leads</h3>
                </div>
                
                <div className="p-5 flex-1">
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-4xl font-light text-[#181818]">{data.calidad.totales}</span>
                        <span className="text-sm text-[#444444] font-medium uppercase tracking-wider">Total</span>
                    </div>

                    <div className="w-full flex h-2 overflow-hidden mb-6 bg-slate-200 rounded-sm">
                        <div className="bg-[#027E46] h-full transition-all duration-1000" style={{ width: `${data.calidad.efectivos.pct}%` }} title="Efectivos"></div>
                        <div className="bg-[#0176D3] h-full transition-all duration-1000" style={{ width: `${data.calidad.enSeguimiento.pct}%` }} title="En Seguimiento"></div>
                        <div className="bg-[#B9B9B9] h-full transition-all duration-1000" style={{ width: `${data.calidad.noEfectivos.pct}%` }} title="No Efectivos"></div>
                    </div>

                    <table className="w-full text-left text-sm text-[#181818]">
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="py-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-sm bg-[#027E46]"></span>
                                    <span className="font-medium text-[#444444]">Efectivos</span>
                                </td>
                                <td className="py-2 text-right font-semibold">{data.calidad.efectivos.count} <span className="text-slate-400 font-normal ml-1">({data.calidad.efectivos.pct}%)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-sm bg-[#0176D3]"></span>
                                    <span className="font-medium text-[#444444]">Seguimiento</span>
                                </td>
                                <td className="py-2 text-right font-semibold">{data.calidad.enSeguimiento.count} <span className="text-slate-400 font-normal ml-1">({data.calidad.enSeguimiento.pct}%)</span></td>
                            </tr>
                            <tr>
                                <td className="py-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-sm bg-[#B9B9B9]"></span>
                                    <span className="font-medium text-[#444444]">Pérdida</span>
                                </td>
                                <td className="py-2 text-right font-semibold">{data.calidad.noEfectivos.count} <span className="text-slate-400 font-normal ml-1">({data.calidad.noEfectivos.pct}%)</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    </div>
  );
}