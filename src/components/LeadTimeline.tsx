import React, { useState, useEffect } from 'react';
import { getLeadActivitiesService, logActivityService } from '../services/activities';
import type { Lead, LeadActivity } from '../types/definitions';
import { useCRM } from '../context/CRMContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Clock, CheckCircle, Edit, FileText, Send, Zap } from 'lucide-react';
import styles from './LeadTimeline.module.css';

interface Props {
  lead: Lead;
}

export default function LeadTimeline({ lead }: Props) {
  const { tenantId, userProfile } = useCRM();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

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

    // Log the note
    await logActivityService(
      tenantId,
      lead.id,
      userProfile.uid,
      userProfile.name,
      'note_added',
      note.trim()
    );

    // Track SLA TTFC
    const updates: any = { updatedAt: serverTimestamp() };
    if (!lead.firstContactAt) {
      updates.firstContactAt = serverTimestamp();
    }
    
    // Also append to old interactions for backward compatibility
    const oldNote = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'Nota',
      note: note.trim()
    };
    updates.interactions = [oldNote, ...(lead.interactions || [])];

    await updateDoc(doc(db, 'leads', lead.id), updates);
    setNote('');
    loadActivities();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'stage_change': return <Zap size={14} color="#eab308" />;
      case 'note_added': return <FileText size={14} color="#3b82f6" />;
      case 'task_completed': return <CheckCircle size={14} color="#22c55e" />;
      case 'lead_created': return <Clock size={14} color="#64748b" />;
      default: return <Clock size={14} color="#94a3b8" />;
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Historial y Trazabilidad</h3>
      
      <form onSubmit={handleAddNote} className={styles.noteForm}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Escribe una nota o resultado de llamada..."
          className={styles.noteInput}
          rows={3}
        />
        <button type="submit" disabled={!note.trim()} className={styles.submitBtn}>
          <Send size={16} /> Guardar Nota
        </button>
      </form>

      {loading ? (
        <div className={styles.loading}>Cargando historial...</div>
      ) : (
        <div className={styles.timeline}>
          {activities.length === 0 ? (
            <p className={styles.empty}>No hay historial registrado.</p>
          ) : (
            activities.map(act => {
              const dateObj = act.createdAt?.toDate ? act.createdAt.toDate() : new Date();
              return (
                <div key={act.id} className={styles.timelineItem}>
                  <div className={styles.iconWrapper}>
                    {getIcon(act.actionType)}
                  </div>
                  <div className={styles.content}>
                    <div className={styles.header}>
                      <span className={styles.userName}>{act.userName}</span>
                      <span className={styles.date}>
                        {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={styles.desc}>{act.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
