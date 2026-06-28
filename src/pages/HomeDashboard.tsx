import React, { useMemo } from 'react';
import { Target, Clock,  PhoneCall,  Wallet, Users, Home as PropIcon, MessageSquare, Calendar, FileText, Activity } from 'lucide-react';
 
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import styles from './HomeDashboard.module.css';

const Sparkline = ({ color }: { color: string }) => (
  <svg className={styles.sparkline} viewBox="0 0 100 40" preserveAspectRatio="none">
    <path d="M0,40 C20,20 40,30 60,10 C80,0 100,20 100,20 L100,40 L0,40 Z" fill={color} fillOpacity="0.1" />
    <path d="M0,40 C20,20 40,30 60,10 C80,0 100,20 100,20" fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
  </svg>
);

export default function HomeDashboard() {
  const { leads, loading } = useCommercialData();
  const { userProfile } = useCRM();

  const data = useMemo(() => {
    if (!leads) return null;

    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const nuevos = leads.filter(l => l.status === 'NUEVO').length;
    const enNegociacion = leads.filter(l => l.status === 'EN_NEGOCIACION').length;
    const cierres = leads.filter(l => l.status === 'VENTA_CERRADA').length;
    
    const comisiones = cierres * 1500;

    const seguimientos = leads.filter(l => l.nextFollowUpDate).map(l => {
      const isAtrasado = l.nextFollowUpDate! < todayStr;
      const isHoy = l.nextFollowUpDate! === todayStr;
      return { ...l, isAtrasado, isHoy };
    });

    const atrasados = seguimientos.filter(t => t.isAtrasado);
    const paraHoy = seguimientos.filter(t => t.isHoy);
    const tareasUrgentes = [...atrasados, ...paraHoy].slice(0, 4);

    const totales = leads.length || 1; 
    const efectivos = leads.filter(l => ['NUEVO', 'EN_NEGOCIACION', 'SEPARADO', 'VENTA_CERRADA'].includes(l.status)).length;
    const enSeguimiento = leads.filter(l => ['INCUBADORA', 'NO_CONTACTADO'].includes(l.status)).length;
    const noEfectivos = leads.filter(l => l.status === 'NO_INTERESADO').length;

    const getMs = (val: any) => {
      if (!val) return 0;
      if (val.toMillis) return val.toMillis();
      if (val.seconds) return val.seconds * 1000;
      return new Date(val).getTime();
    };

    const vistosRecientemente = [...leads]
      .sort((a, b) => getMs(b.updatedAt) - getMs(a.updatedAt))
      .slice(0, 4);

    const actividades = leads.flatMap(l => 
      (l.interactions || []).map(int => ({
        ...int,
        leadName: l.name,
        leadId: l.id
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

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
      },
      vistos: vistosRecientemente,
      actividades
    };
  }, [leads]);

  if (loading || !data) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>

        {/* CABECERA */}
        <div className={styles.header}>
            <div>
                <h2 className={styles.title}>
                    Resumen, {userProfile?.name?.split(' ')[0] || 'Usuario'}
                </h2>
                <p className={styles.subtitle}>Vista general de cartera comercial</p>
            </div>
            <button className={styles.btnPrimary}>
                <Target size={16} /> Ver mis metas
            </button>
        </div>

        {/* 1. EMBUDO DE CONVERSIÓN */}
        <div className={styles.metricsGrid}>
            <div className={`${styles.metricCard} ${styles.cardBlue}`}>
                <div className={styles.metricHeader}>
                    <p className={styles.metricLabel}>Nuevos Leads</p>
                    <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
                        <Users size={20} />
                    </div>
                </div>
                <p className={styles.metricValue}>{data.metricas.nuevos}</p>
                <Sparkline color="#3b82f6" />
            </div>
            <div className={`${styles.metricCard} ${styles.cardAmber}`}>
                <div className={styles.metricHeader}>
                    <p className={styles.metricLabel}>Citas Activas</p>
                    <div className={`${styles.iconWrapper} ${styles.iconAmber}`}>
                        <Clock size={20} />
                    </div>
                </div>
                <p className={styles.metricValue}>{data.metricas.visitas}</p>
                <Sparkline color="#f59e0b" />
            </div>
            <div className={`${styles.metricCard} ${styles.cardGreen}`}>
                <div className={styles.metricHeader}>
                    <p className={styles.metricLabel}>Cierres Mes</p>
                    <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
                        <Target size={20} />
                    </div>
                </div>
                <p className={styles.metricValue}>{data.metricas.cierres}</p>
                <Sparkline color="#10b981" />
            </div>
            <div className={`${styles.metricCard} ${styles.cardPurple}`}>
                <div className={styles.metricHeader}>
                    <p className={styles.metricLabel}>Comisiones</p>
                    <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
                        <Wallet size={20} />
                    </div>
                </div>
                <p className={`${styles.metricValue} ${styles.metricValueSpecial}`}>{data.metricas.comisiones}</p>
                <Sparkline color="#8b5cf6" />
            </div>
        </div>

        {/* VISTOS RECIENTEMENTE (Quick Access) */}
        {data.vistos.length > 0 && (
            <div className={styles.recentlyViewedSection}>
                <h3 className={styles.sectionTitle}>Vistos recientemente</h3>
                <div className={styles.recentGrid}>
                    {data.vistos.map(lead => (
                        <div key={lead.id} className={styles.recentCard}>
                            <div className={styles.recentAvatar}>{lead.name.charAt(0).toUpperCase()}</div>
                            <div className={styles.recentInfo}>
                                <p className={styles.recentName}>{lead.name}</p>
                                <p className={styles.recentStatus}>{lead.status.replace('_', ' ')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className={styles.secondaryGrid}>
            
            {/* 2. CENTRO DE COMANDO (Tareas Pendientes) */}
            <div className={styles.panelCard}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Próximos Seguimientos</h3>
                    <div className={styles.badgesGroup}>
                        {data.tareas.atrasadosCount > 0 && (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>
                              Atrasados: {data.tareas.atrasadosCount}
                          </span>
                        )}
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            Hoy: {data.tareas.paraHoyCount}
                        </span>
                    </div>
                </div>
                
                <div className={styles.tableContainer}>
                    {data.tareas.lista.length === 0 ? (
                        <div className={styles.emptyState}>
                            No hay seguimientos urgentes en cola. ¡Excelente trabajo!
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Prospecto</th>
                                    <th className={styles.th}>Nota</th>
                                    <th className={`${styles.th} ${styles.thRight}`}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.tareas.lista.map((tarea, index) => (
                                    <tr key={tarea.id || index} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div className={styles.taskProspect}>
                                                <div className={`${styles.statusDot} ${tarea.isAtrasado ? styles.dotDanger : styles.dotPrimary}`}></div>
                                                {tarea.name || 'Prospecto sin nombre'}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.taskNote}>
                                                {tarea.nextFollowUpNote || 'Seguimiento programado'}
                                            </div>
                                        </td>
                                        <td className={`${styles.td} ${styles.tdRight}`}>
                                            <button className={styles.actionBtn} title="Llamar">
                                                Contactar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className={styles.panelFooter}>
                    <button className={styles.actionBtn}>Ver todas las tareas</button>
                </div>
            </div>

            {/* 3. FEED DE ACTIVIDAD (Timeline) */}
            <div className={styles.panelCard}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>
                        <Activity size={16} style={{display: 'inline', marginRight: '8px'}} />
                        Actividad Reciente
                    </h3>
                </div>
                
                <div className={styles.timelineBody}>
                    {data.actividades.length === 0 ? (
                        <div className={styles.emptyState}>No hay actividad reciente.</div>
                    ) : (
                        <div className={styles.timeline}>
                            {data.actividades.map((act, idx) => {
                                let Icon = FileText;
                                let iconColor = '#94a3b8';
                                if (act.type === 'Llamada' || act.type === 'call') {
                                    Icon = PhoneCall; iconColor = '#3b82f6';
                                } else if (act.type === 'Reunión' || act.type === 'meeting') {
                                    Icon = Calendar; iconColor = '#f59e0b';
                                } else if (act.type === 'Mensaje' || act.type === 'message') {
                                    Icon = MessageSquare; iconColor = '#10b981';
                                }

                                return (
                                    <div key={act.id || idx} className={styles.timelineItem}>
                                        <div className={styles.timelineIcon} style={{color: iconColor, backgroundColor: `${iconColor}15`}}>
                                            <Icon size={14} />
                                        </div>
                                        <div className={styles.timelineContent}>
                                            <p className={styles.timelineText}>
                                                <strong>{act.leadName}</strong> - {act.type || 'Nota'}
                                            </p>
                                            <p className={styles.timelineNote}>{act.note}</p>
                                            <p className={styles.timelineTime}>
                                                {new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className={styles.panelFooter}>
                    <button className={styles.actionBtn}>Ver todo el historial</button>
                </div>
            </div>
            
        </div>
    </div>
  );
}