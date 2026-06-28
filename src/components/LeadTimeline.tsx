import React, { useState, useEffect } from 'react';
import { getLeadActivitiesService, logActivityService, updateLeadActivityStatus } from '../services/activities';
import type { Lead, LeadActivity } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Phone, CheckSquare, Mail, Zap, FileText, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import styles from './LeadTimeline.module.css';

interface Props {
  lead: Lead;
}

export default function LeadTimeline({ lead }: Props) {
  const { tenantId, userProfile } = useCRM();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [activeTab, setActiveTab] = useState<'call' | 'task' | 'whatsapp'>('call');

  useEffect(() => {
    if (!tenantId || !lead.id) return;
    loadActivities();
  }, [tenantId, lead.id]);

  const loadActivities = async () => {
    setLoading(true);
    const data = await getLeadActivitiesService(tenantId!, lead.id!);
    setActivities(data);
    setLoading(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !tenantId || !userProfile || !lead.id) return;

    let actionType: LeadActivity['actionType'] = 'note_added';
    if (activeTab === 'task') actionType = 'task_completed';
    if (activeTab === 'whatsapp') actionType = 'whatsapp_sent';

    try {
      // 1. Escribir la Actividad en Supabase
      const statusToSave = activeTab === 'task' ? 'open' : 'completed';
      const dueToSave = activeTab === 'task' && dueDate ? new Date(dueDate).toISOString() : undefined;

      await logActivityService(
        tenantId,
        lead.id,
        userProfile.uid,
        userProfile.name,
        actionType,
        note.trim(),
        undefined, // metadata
        dueToSave,
        statusToSave
      );

      // Si fue exitoso, recargar datos desde Supabase
      setNote('');
      setDueDate('');
      await loadActivities();

      // 2. Mantenimiento del SLA en Firebase (Legacy) 
      try {
        const updates: any = { updatedAt: serverTimestamp() };
        if (!lead.firstContactAt) {
          updates.firstContactAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'leads', lead.id), updates);
      } catch (fbErr) {
        console.warn("Advertencia: No se pudo actualizar el SLA en Firebase (El token Auth ya está en Supabase).", fbErr);
      }
      
    } catch (e: any) {
      console.error("Supabase Save Error:", e);
      alert(`Error de Supabase: ${e.message || JSON.stringify(e)}\n\n(Revisa si falta ejecutar el script SQL o si la política RLS está bloqueando tu usuario).`);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateLeadActivityStatus(taskId, 'completed');
      await loadActivities();
    } catch (e: any) {
      console.error("Error completing task:", e);
      alert(`Error completando tarea: ${e.message}`);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'note_added': return <Phone size={14} color="white" />;
      case 'task_completed': return <CheckSquare size={14} color="white" />;
      case 'email_sent': return <Mail size={14} color="white" />;
      case 'whatsapp_sent': return <MessageCircle size={14} color="white" />;
      case 'stage_change': return <Zap size={14} color="white" />;
      default: return <Clock size={14} color="white" />;
    }
  };

  const getSldsIconClass = (type: string) => {
    switch (type) {
      case 'note_added': return 'slds-icon-standard-log-a-call';
      case 'task_completed': return 'slds-icon-standard-task';
      case 'email_sent': return 'slds-icon-standard-email';
      case 'whatsapp_sent': return 'slds-icon-standard-sms';
      case 'stage_change': return 'slds-icon-standard-opportunity';
      default: return 'slds-icon-standard-default';
    }
  };

  const pendingTasks = activities.filter(a => a.status === 'open');
  const historyActivities = activities.filter(a => a.status !== 'open');

  return (
    <div className="slds-p-around_medium">
      
      {/* ACTIVITY PUBLISHER (ESTÁNDAR SALESFORCE) */}
      <div className="slds-box slds-box_small slds-m-bottom_large" style={{ backgroundColor: '#f3f3f3', border: 'none' }}>
        <div className="slds-tabs_default">
          <ul className="slds-tabs_default__nav" role="tablist">
            <li className={`slds-tabs_default__item ${activeTab === 'call' ? 'slds-is-active' : ''}`} title="Registrar Llamada" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" onClick={e => { e.preventDefault(); setActiveTab('call'); }}>
                <span className="slds-m-right_xx-small" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Phone size={14} color={activeTab === 'call' ? '#0176d3' : '#747474'} />
                </span>
                Registrar Llamada
              </a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'task' ? 'slds-is-active' : ''}`} title="Nueva Tarea" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" onClick={e => { e.preventDefault(); setActiveTab('task'); }}>
                <span className="slds-m-right_xx-small" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CheckSquare size={14} color={activeTab === 'task' ? '#0176d3' : '#747474'} />
                </span>
                Nueva Tarea
              </a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'whatsapp' ? 'slds-is-active' : ''}`} title="WhatsApp" role="presentation">
              <a className="slds-tabs_default__link" href="#" role="tab" onClick={e => { e.preventDefault(); setActiveTab('whatsapp'); }}>
                <span className="slds-m-right_xx-small" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <MessageCircle size={14} color={activeTab === 'whatsapp' ? '#0176d3' : '#747474'} />
                </span>
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
        <div className="slds-p-around_small slds-theme_default">
           <form onSubmit={handleAddNote}>
             <textarea 
                className="slds-textarea slds-m-bottom_small" 
                rows={3} 
                placeholder={activeTab === 'call' ? "Describa el resultado de la llamada..." : activeTab === 'task' ? "Describa la tarea a realizar..." : "Resumen del WhatsApp enviado..."}
                value={note}
                onChange={e => setNote(e.target.value)}
                required
             />
             {activeTab === 'task' && (
               <div className="slds-form-element slds-m-bottom_small">
                 <label className="slds-form-element__label">Fecha de Vencimiento (Requerida)</label>
                 <div className="slds-form-element__control">
                   <input 
                     type="datetime-local" 
                     className="slds-input" 
                     value={dueDate}
                     onChange={e => setDueDate(e.target.value)}
                     required={activeTab === 'task'}
                   />
                 </div>
               </div>
             )}
             <div className="slds-grid slds-grid_align-end">
               <button type="submit" disabled={!note.trim() || (activeTab === 'task' && !dueDate)} className="slds-button slds-button_brand">
                 Guardar {activeTab === 'call' ? 'Nota' : activeTab === 'task' ? 'Tarea' : 'WhatsApp'}
               </button>
             </div>
           </form>
        </div>
      </div>

      {/* ACTIVITY TIMELINE (ESTÁNDAR SALESFORCE) */}
      {loading ? (
        <div className="slds-p-around_medium slds-text-align_center slds-text-color_weak">Cargando historial...</div>
      ) : (
        <>
          {/* SECCIÓN DE TAREAS PENDIENTES */}
          {pendingTasks.length > 0 && (
            <div className="slds-m-bottom_large">
              <h3 className="slds-text-title_caps slds-m-bottom_small slds-text-color_weak">Próximos Pasos (Pendientes)</h3>
              <ul className="slds-timeline">
                {pendingTasks.map(act => {
                  let dateObj = new Date();
                  if (act.dueDate) {
                    dateObj = new Date(act.dueDate);
                  }
                  
                  const isOverdue = dateObj < new Date();

                  return (
                    <li key={act.id} className="slds-timeline__item">
                      <span className="slds-assistive-text">Tarea Pendiente</span>
                      <div className="slds-media">
                        <div className="slds-media__figure">
                          <div className={`slds-icon_container slds-icon-standard-task slds-timeline__icon`} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tarea Pendiente">
                            <CheckSquare size={14} color="white" />
                          </div>
                        </div>
                        <div className="slds-media__body">
                          <div className="slds-grid slds-grid_align-spread slds-timeline__trigger">
                            <div className="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
                              <div className="slds-checkbox slds-m-right_small">
                                <input type="checkbox" name={`options-${act.id}`} id={`checkbox-${act.id}`} value={`checkbox-${act.id}`} onChange={() => handleCompleteTask(act.id)} />
                                <label className="slds-checkbox__label" htmlFor={`checkbox-${act.id}`}>
                                  <span className="slds-checkbox_faux"></span>
                                </label>
                              </div>
                              <h3 className="slds-truncate" title={act.description}>
                                <strong>Tarea Programada</strong>
                              </h3>
                            </div>
                            <div className="slds-timeline__actions slds-timeline__actions_inline">
                              <p className={`slds-timeline__date ${isOverdue ? 'slds-text-color_error slds-text-title_bold' : ''}`}>
                                Vence: {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <p className="slds-m-horizontal_xx-small slds-text-body_small slds-m-left_large">
                             Asignado a <strong>{act.userName}</strong>
                          </p>
                          <article className="slds-box slds-timeline__item_details slds-theme_shade slds-m-top_x-small slds-m-left_large" style={{ marginLeft: '2.5rem' }}>
                            <div>
                              <p className="slds-truncate" style={{ whiteSpace: 'pre-wrap' }} title={act.description}>
                                {act.description}
                              </p>
                            </div>
                          </article>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* SECCIÓN DE HISTORIAL COMPLETADO */}
          <h3 className="slds-text-title_caps slds-m-bottom_small slds-text-color_weak">Historial</h3>
          <ul className="slds-timeline">
            {historyActivities.length === 0 ? (
              <p className="slds-p-around_medium slds-text-align_center slds-text-color_weak">No hay historial registrado.</p>
            ) : (
              historyActivities.map(act => {
                let dateObj = new Date();
                if (act.createdAt?.toDate) {
                  dateObj = act.createdAt.toDate();
                } else if (typeof act.createdAt === 'string') {
                  dateObj = new Date(act.createdAt);
                }
                
                const isNote = act.actionType === 'note_added';
                
                return (
                  <li key={act.id} className="slds-timeline__item">
                    <span className="slds-assistive-text">{act.actionType}</span>
                    <div className="slds-media">
                      <div className="slds-media__figure">
                        <div className={`slds-icon_container ${getSldsIconClass(act.actionType)} slds-timeline__icon`} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={act.actionType}>
                          {getActionIcon(act.actionType)}
                        </div>
                      </div>
                      <div className="slds-media__body">
                        <div className="slds-grid slds-grid_align-spread slds-timeline__trigger">
                          <div className="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
                            <h3 className="slds-truncate" title={act.description}>
                              <a href="#" onClick={e=>e.preventDefault()}>
                                <strong>{isNote ? 'Llamada / Nota' : act.actionType === 'email_sent' ? 'Correo Electrónico' : act.actionType === 'whatsapp_sent' ? 'Mensaje de WhatsApp' : act.actionType === 'task_completed' ? 'Tarea Completada' : 'Actividad'}</strong>
                              </a>
                            </h3>
                          </div>
                          <div className="slds-timeline__actions slds-timeline__actions_inline">
                            <p className="slds-timeline__date">{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <p className="slds-m-horizontal_xx-small slds-text-body_small">
                           Registrado por <strong>{act.userName}</strong>
                        </p>
                        <article className="slds-box slds-timeline__item_details slds-theme_shade slds-m-top_x-small slds-m-horizontal_xx-small" id={`task-item-${act.id}`}>
                          <div>
                            <p className="slds-truncate" style={{ whiteSpace: 'pre-wrap' }} title={act.description}>
                              {act.description}
                            </p>
                          </div>
                        </article>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}
