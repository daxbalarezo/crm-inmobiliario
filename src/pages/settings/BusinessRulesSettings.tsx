import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCRM } from '../../context/CRMContext';
import styles from './DataModelSettings.module.css';

export default function BusinessRulesSettings() {
  const { tenantId, tenant } = useCRM();
  const [slaHours, setSlaHours] = useState<number>(2);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (tenant?.slaTargetHours !== undefined) {
      setSlaHours(tenant.slaTargetHours);
    }
  }, [tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setIsSaving(true);
    setMessage('');
    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        slaTargetHours: slaHours
      });
      setMessage('Reglas de negocio actualizadas correctamente. Los cambios pueden tardar en reflejarse o requerir recargar la página.');
    } catch (error) {
      console.error('Error saving SLA rules:', error);
      setMessage('Error al guardar las reglas.');
    }
    setIsSaving(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Reglas de Negocio y SLA</h2>
          <p className={styles.subtitle}>Configura los objetivos y tiempos límite para la evaluación de tu equipo comercial.</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginTop: '24px' }}>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup} style={{ maxWidth: '400px' }}>
            <label className={styles.formLabel} style={{ fontSize: '15px', fontWeight: 600 }}>
              Tiempo Ideal de Primer Contacto (SLA)
            </label>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', marginTop: '4px' }}>
              Define en cuántas horas máximo un asesor debe contactar a un nuevo prospecto. Este valor se usa para medir el porcentaje de cumplimiento SLA en el panel de Rendimiento.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="number" 
                required 
                min="0.5"
                step="0.5"
                value={slaHours} 
                onChange={e => setSlaHours(parseFloat(e.target.value))} 
                className={styles.formInput} 
                style={{ width: '120px' }}
              />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Horas</span>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              type="submit" 
              disabled={isSaving}
              style={{ 
                backgroundColor: 'var(--primary-color)', 
                color: 'white', 
                padding: '10px 20px', 
                borderRadius: '6px', 
                fontWeight: 500, 
                border: 'none', 
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            {message && <span style={{ color: message.includes('Error') ? '#ef4444' : '#10b981', fontSize: '14px', fontWeight: 500 }}>{message}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
