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
import StagesSettings from './settings/StagesSettings';

export default function SettingsDashboard() {
  const { userProfile, tenantId, tenant, activeProjectId } = useCRM();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'campos';
  
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    if (!tenantId) return;
    const confirm = window.confirm('¿Estás seguro de inyectar 30 prospectos de prueba a cada asesor activo en el sistema?');
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

  const handleClearOnly = async () => {
    if (!tenantId) return;
    const confirm = window.confirm('¿Estás seguro de BORRAR TODOS LOS DATOS ACTUALES de prueba? Toda la información de prospectos y actividades se perderá irrevocablemente.');
    if (!confirm) return;

    setIsSeeding(true);
    try {
      await clearTestData(tenantId);
      alert('¡Base de datos limpiada exitosamente! Por favor recarga la página para ver el sistema en blanco.');
    } catch (e) {
      console.error(e);
      alert('Hubo un error al limpiar datos.');
    }
    setIsSeeding(false);
  };

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  const getHeaderData = () => {
    switch (activeTab) {
      case 'campos': return { title: 'Modelo de Datos', icon: Database };
      case 'etapas': return { title: 'Etapas de Negocio', icon: Database };
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="slds-button slds-button_outline-brand"
                      onClick={handleClearOnly} 
                      disabled={isSeeding}
                    >
                      {isSeeding ? 'Procesando...' : 'Limpiar BD'}
                    </button>
                    <button 
                      className="slds-button slds-button_destructive"
                      onClick={handleSeed} 
                      disabled={isSeeding}
                    >
                      {isSeeding ? 'Generando...' : 'Sembrar Datos (30 por Asesor)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div className="slds-tabs_default">
          <ul className="slds-tabs_default__nav" role="tablist">
            <li className={`slds-tabs_default__item ${activeTab === 'campos' ? 'slds-is-active' : ''}`} title="Campos Personalizados">
              <a className="slds-tabs_default__link" href="?tab=campos" id="tab-campos">Campos Personalizados</a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'etapas' ? 'slds-is-active' : ''}`} title="Etapas de Negocio">
              <a className="slds-tabs_default__link" href="?tab=etapas" id="tab-etapas">Etapas de Negocio</a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'roles' ? 'slds-is-active' : ''}`} title="Roles y Permisos">
              <a className="slds-tabs_default__link" href="?tab=roles" id="tab-roles">Roles y Permisos</a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'asignacion' ? 'slds-is-active' : ''}`} title="Reglas de Asignación">
              <a className="slds-tabs_default__link" href="?tab=asignacion" id="tab-asignacion">Asignación Automática</a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'reglas' ? 'slds-is-active' : ''}`} title="Reglas de Negocio">
              <a className="slds-tabs_default__link" href="?tab=reglas" id="tab-reglas">Reglas (SLA)</a>
            </li>
            <li className={`slds-tabs_default__item ${activeTab === 'auditoria' ? 'slds-is-active' : ''}`} title="Registro de Auditoría">
              <a className="slds-tabs_default__link" href="?tab=auditoria" id="tab-auditoria">Auditoría (Logs)</a>
            </li>
          </ul>
          
          <div className="slds-tabs_default__content slds-show" style={{ padding: '1rem 0' }}>
            {activeTab === 'campos' && <DataModelSettings />}
            {activeTab === 'etapas' && <StagesSettings />}
            {activeTab === 'roles' && <RolesSettings />}
            {activeTab === 'integraciones' && <IntegrationsSettings />}
            {activeTab === 'asignacion' && <AssignmentRulesSettings />}
            {activeTab === 'reglas' && <BusinessRulesSettings />}
            {activeTab === 'auditoria' && <AuditDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
}
