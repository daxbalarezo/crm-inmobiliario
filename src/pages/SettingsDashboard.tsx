import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Settings, Database, Users, Link as LinkIcon, Shuffle, ShieldAlert, FileText } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import { seedTestData, clearTestData } from '../utils/dataSeeder';

import DataModelSettings from './settings/DataModelSettings';
import RolesSettings from './settings/RolesSettings';
import AuditDashboard from './settings/AuditDashboard';
import BusinessRulesSettings from './settings/BusinessRulesSettings';
import IntegrationsSettings from './settings/IntegrationsSettings';
import AssignmentRulesSettings from './settings/AssignmentRulesSettings';

export default function SettingsDashboard() {
  const { userProfile, tenantId, tenant, activeProjectId } = useCRM();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'campos';
  
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    if (!tenantId) return;
    const confirm = window.confirm('¿Estás seguro de BORRAR TODOS LOS DATOS ACTUALES y re-inyectar 400 prospectos nuevos? Esta acción no se puede deshacer.');
    if (!confirm) return;

    setIsSeeding(true);
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      const fetchedUsers = allUsers.filter(u => u.role !== 'owner' && u.role !== 'manager');
      
      if (fetchedUsers.length === 0) {
        alert('Debes tener al menos 1 asesor registrado en la plataforma para generar datos.');
        setIsSeeding(false);
        return;
      }
      
      const stages = tenant?.pipeline_stages || [];
      if (stages.length === 0) {
        alert("La empresa no tiene un embudo de ventas configurado. Configura el modelo de datos primero.");
        setIsSeeding(false);
        return;
      }

      await clearTestData(tenantId);
      const projectIdToUse = activeProjectId || '4e137da0-3ea5-4c91-92a4-7408fbd0fb07';
      await seedTestData(tenantId, fetchedUsers, stages, projectIdToUse);
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

  const getHeaderData = () => {
    switch (activeTab) {
      case 'campos': return { title: 'Modelo de Datos', icon: Database };
      case 'roles': return { title: 'Roles y Permisos', icon: Users };
      case 'integraciones': return { title: 'Integraciones (Webhooks)', icon: LinkIcon };
      case 'asignacion': return { title: 'Reglas de Asignación', icon: Shuffle };
      case 'reglas': return { title: 'Reglas de Negocio (SLA)', icon: ShieldAlert };
      case 'auditoria': return { title: 'Registro de Auditoría', icon: FileText };
      default: return { title: 'Configuración Inmobiliaria', icon: Settings };
    }
  };

  const headerData = getHeaderData();
  const IconComponent = headerData.icon;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* PAGE HEADER DINÁMICO */}
      <div className="slds-page-header slds-m-bottom_medium" style={{ backgroundColor: 'white' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-custom" title={headerData.title} style={{ color: 'white', backgroundColor: '#344a5e' }}>
                  <IconComponent size={32} className="slds-icon slds-page-header__icon" />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title={headerData.title}>
                        {headerData.title}
                      </span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Configuración Inmobiliaria (Tenant Admin)</p>
              </div>
            </div>
          </div>
          
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                {activeTab === 'campos' && (
                  <button 
                    className="slds-button slds-button_destructive"
                    onClick={handleSeed} 
                    disabled={isSeeding}
                  >
                    {isSeeding ? 'Generando...' : 'Limpiar y Re-Sembrar (400 Leads)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {activeTab === 'campos' && <DataModelSettings />}
        {activeTab === 'roles' && <RolesSettings />}
        {activeTab === 'integraciones' && <IntegrationsSettings />}
        {activeTab === 'asignacion' && <AssignmentRulesSettings />}
        {activeTab === 'auditoria' && <AuditDashboard />}
        {activeTab === 'reglas' && <BusinessRulesSettings />}
      </div>
    </div>
  );
}
