import { Navigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import ContractTemplateSettings from './settings/ContractTemplateSettings';
import styles from './SettingsDashboard.module.css';

export default function TemplatesDashboard() {
  const { userProfile } = useCRM();

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Plantillas de Contratos</h2>
          <p className={styles.subtitle}>Gestión de plantillas y variables para la generación de documentos</p>
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        <ContractTemplateSettings />
      </div>
    </div>
  );
}
