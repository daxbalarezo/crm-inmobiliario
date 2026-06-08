import React, { useMemo } from 'react';
import { Target, Clock, AlertCircle, PhoneCall, ArrowRight, Wallet, Users, Home as PropIcon } from 'lucide-react';
// Usamos "import type" para obligar a Vite a compilarlo correctamente
import type { Lead } from '../types/definitions'; 
import { useCommercialData } from '../hooks/useCommercialData';

export default function HomeDashboard() {
  const { leads, loading } = useCommercialData();

  // MOTOR DE CÁLCULO EN TIEMPO REAL (Memoizado para alto rendimiento)
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
    
    // Regla de negocio provisional (Ej: S/ 1,500 fijos de comisión por lote)
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
                <h2 className="text-3xl font-[Poppins] font-extrabold text-[#0B2B40] tracking-tight">Hola, Daniel </h2>
                <p className="text-slate-500 font-medium mt-1">Este es el resumen de tu cartera comercial para hoy.</p>
            </div>
            <button className="bg-[#0B2B40] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#154260] transition-all shadow-md">
                <Target size={18} className="text-[#4DB6AC]" /> Ver mis metas
            </button>
        </div>

        {/* 1. EMBUDO DE CONVERSIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-[#4DB6AC] transition-all">
                <div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nuevos Leads</p>
                    <p className="text-3xl font-black text-[#0B2B40] mt-1">{data.metricas.nuevos}</p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-100 transition-colors"><Users size={22} className="text-blue-600"/></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-[#4DB6AC] transition-all">
                <div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Visitas Agendadas</p>
                    <p className="text-3xl font-black text-[#0B2B40] mt-1">{data.metricas.visitas}</p>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-xl group-hover:bg-purple-100 transition-colors"><PropIcon size={22} className="text-purple-600"/></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-[#4DB6AC] transition-all">
                <div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cierres Mes</p>
                    <p className="text-3xl font-black text-[#0B2B40] mt-1">{data.metricas.cierres}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl group-hover:bg-emerald-100 transition-colors"><Target size={22} className="text-emerald-600"/></div>
            </div>
            <div className="bg-[#0B2B40] p-5 rounded-2xl shadow-md flex items-start justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[#4DB6AC] font-bold uppercase tracking-widest text-[10px]">Proyección Comisiones</p>
                    <p className="text-3xl font-black text-white mt-1">{data.metricas.comisiones}</p>
                </div>
                <div className="relative z-10 bg-white/10 p-2.5 rounded-xl text-white"><Wallet size={22} /></div>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full border-4 border-white/5"></div>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* 2. CENTRO DE COMANDO (Tareas Pendientes) */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-[#0B2B40] flex items-center gap-2">
                        <Clock className="text-[#F2A900]" size={20}/> Tareas Pendientes
                    </h3>
                    <div className="flex gap-2">
                        <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                            Atrasados ({data.tareas.atrasadosCount})
                        </button>
                        <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            Para Hoy ({data.tareas.paraHoyCount})
                        </button>
                    </div>
                </div>
                
                <div className="p-0 flex-1">
                    {data.tareas.lista.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 font-medium">
                            No tienes tareas urgentes por el momento. ¡Buen trabajo!
                        </div>
                    ) : (
                        data.tareas.lista.map((tarea, index) => (
                            <div key={tarea.id || index} className="group flex items-center justify-between p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tarea.isAtrasado ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {tarea.isAtrasado ? <AlertCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#0B2B40]">{tarea.name || 'Prospecto sin nombre'}</p>
                                        <p className="text-sm text-slate-500 font-medium truncate max-w-xs">{tarea.nextFollowUpNote || 'Realizar seguimiento programado'}</p>
                                    </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 bg-white border border-slate-200 text-[#0B2B40] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:border-[#4DB6AC] hover:text-[#4DB6AC] transition-all flex items-center gap-2">
                                    <PhoneCall size={16}/> Gestionar
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button className="text-sm font-bold text-[#4DB6AC] hover:text-[#3da096]">Ver todas las tareas</button>
                </div>
            </div>

            {/* 3. CALIDAD DE LEADS (Stacked Bar) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div>
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-[#0B2B40]">Leads</h3>
                        <p className="text-sm text-slate-500 font-medium">Rendimiento comercial global</p>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-4xl font-[Poppins] font-black text-[#0B2B40]">{data.calidad.totales}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Totales</span>
                    </div>

                    <div className="w-full flex h-3.5 rounded-full overflow-hidden mb-6 bg-slate-100 shadow-inner">
                        <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${data.calidad.efectivos.pct}%` }} title="Efectivos"></div>
                        <div className="bg-[#F2A900] h-full transition-all duration-1000" style={{ width: `${data.calidad.enSeguimiento.pct}%` }} title="En Seguimiento"></div>
                        <div className="bg-rose-400 h-full transition-all duration-1000" style={{ width: `${data.calidad.noEfectivos.pct}%` }} title="No Efectivos"></div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                                <span className="font-bold text-slate-600">Efectivos</span>
                            </div>
                            <span className="font-black text-[#0B2B40]">{data.calidad.efectivos.count} <span className="text-slate-400 font-semibold ml-1 text-xs">({data.calidad.efectivos.pct}%)</span></span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-[#F2A900] shadow-sm shadow-[#F2A900]/50"></span>
                                <span className="font-bold text-slate-600">En Seguimiento</span>
                            </div>
                            <span className="font-black text-[#0B2B40]">{data.calidad.enSeguimiento.count} <span className="text-slate-400 font-semibold ml-1 text-xs">({data.calidad.enSeguimiento.pct}%)</span></span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50"></span>
                                <span className="font-bold text-slate-600">No Efectivos</span>
                            </div>
                            <span className="font-black text-[#0B2B40]">{data.calidad.noEfectivos.count} <span className="text-slate-400 font-semibold ml-1 text-xs">({data.calidad.noEfectivos.pct}%)</span></span>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
  );
}