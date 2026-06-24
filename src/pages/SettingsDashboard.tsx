import React, { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import { seedTestData, clearTestData } from '../utils/dataSeeder';

import DataModelSettings from './settings/DataModelSettings';
import RolesSettings from './settings/RolesSettings';
import AuditDashboard from './settings/AuditDashboard';
import WorkflowsDashboard from './settings/WorkflowsDashboard';
import BusinessRulesSettings from './settings/BusinessRulesSettings';

import styles from './SettingsDashboard.module.css';

export default function SettingsDashboard() {
  const { userProfile, tenantId } = useCRM();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'campos';
  
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    if (!tenantId) return;
    const confirm = window.confirm('¿Estás seguro de BORRAR TODOS LOS DATOS ACTUALES y re-inyectar 400 prospectos nuevos? Esta acción no se puede deshacer.');
    if (!confirm) return;

    setIsSeeding(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId)));
      const fetchedUsers = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id })).filter((u: any) => u.role === 'agent');
      
      if (fetchedUsers.length === 0) {
        alert('Debes tener al menos 1 asesor registrado en la plataforma para generar datos.');
        setIsSeeding(false);
        return;
      }

      await clearTestData(tenantId);
      await seedTestData(tenantId, fetchedUsers);
      alert('¡Datos generados exitosamente! Por favor recarga la página para ver las analíticas pobladas.');
    } catch (e) {
      console.error(e);
      alert('Hubo un error al inyectar datos.');
    }
    setIsSeeding(false);
  };

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className={styles.title}>Configuración Técnica</h2>
          <p className={styles.subtitle}>Ajustes del sistema y modelo de datos</p>
        </div>
        <div>
          <button 
            onClick={handleSeed} 
            disabled={isSeeding}
            style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, fontSize: '14px', border: 'none', cursor: isSeeding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSeeding ? 'Generando...' : '⚙️ Limpiar y Re-Sembrar (400 Leads)'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        {/* CAMPOS PERSONALIZADOS */}
        {activeTab === 'campos' && <DataModelSettings />}

        {/* ROLES Y PERMISOS */}
        {activeTab === 'roles' && <RolesSettings />}

        {/* AUDITORÍA */}
        {activeTab === 'auditoria' && <AuditDashboard />}

        {/* WORKFLOWS */}
        {activeTab === 'workflows' && <WorkflowsDashboard />}

        {/* REGLAS DE NEGOCIO */}
        {activeTab === 'reglas' && <BusinessRulesSettings />}
      </div>
    </div>
  );
}
