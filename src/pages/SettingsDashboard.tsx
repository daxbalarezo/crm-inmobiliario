import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';

import DataModelSettings from './settings/DataModelSettings';
import RolesSettings from './settings/RolesSettings';
import AuditDashboard from './settings/AuditDashboard';
import WorkflowsDashboard from './settings/WorkflowsDashboard';

import styles from './SettingsDashboard.module.css';

export default function SettingsDashboard() {
  const { userProfile } = useCRM();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'campos';

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Configuración Técnica</h2>
          <p className={styles.subtitle}>Ajustes del sistema y modelo de datos</p>
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
      </div>
    </div>
  );
}
