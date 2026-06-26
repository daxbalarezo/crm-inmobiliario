import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Shield, FileText, CreditCard, Bell } from 'lucide-react';
import PlanManagement from './SaaSOperations/PlanManagement';
import SeedTemplates from './SaaSOperations/SeedTemplates';
import BillingDashboard from './SaaSOperations/BillingDashboard';
import GlobalAuditDashboard from './SaaSOperations/GlobalAuditDashboard';
import BroadcastsDashboard from './SaaSOperations/BroadcastsDashboard';

export default function SaaSOperations() {
  const location = useLocation();
  const path = location.pathname;

  let activeSection = 'planes';
  if (path.includes('plantillas')) activeSection = 'plantillas';
  if (path.includes('facturacion')) activeSection = 'facturacion';
  if (path.includes('auditoria')) activeSection = 'auditoria';
  if (path.includes('comunicados')) activeSection = 'comunicados';

  const getSectionData = () => {
    switch (activeSection) {
      case 'planes':
        return {
          title: 'Gestión de Planes y Límites',
          icon: Shield,
          description: 'Configura los límites (usuarios, leads, proyectos) para cada plan (Starter, Pro, Enterprise).',
        };
      case 'plantillas':
        return {
          title: 'Plantillas Semilla (Global Seed Data)',
          icon: FileText,
          description: 'Define las etapas de venta, reglas SLA y plantillas de correo por defecto que se clonan al crear una nueva inmobiliaria.',
        };
      case 'facturacion':
        return {
          title: 'Facturación y Suscripciones',
          icon: CreditCard,
          description: 'Historial de pagos, integraciones con pasarelas (Stripe) y control de morosidad.',
        };
      case 'auditoria':
        return {
          title: 'Auditoría Global (System Logs)',
          icon: Settings,
          description: 'Registro de eventos a nivel de sistema, uso de base de datos, intentos de acceso y salud global.',
        };
      case 'comunicados':
        return {
          title: 'Comunicados Globales (Broadcasts)',
          icon: Bell,
          description: 'Envía notificaciones masivas a todos los usuarios de todas las inmobiliarias (ej. Mantenimiento programado).',
        };
      default:
        return {
          title: 'Operaciones SaaS',
          icon: Settings,
          description: 'Selecciona una opción del menú lateral.',
        };
    }
  };

  const sectionData = getSectionData();
  const IconComponent = sectionData.icon;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* PAGE HEADER DINÁMICO */}
      <div className="slds-page-header slds-m-bottom_medium" style={{ backgroundColor: 'white' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-custom" title={sectionData.title} style={{ color: 'white', backgroundColor: '#344a5e' }}>
                  <IconComponent size={32} className="slds-icon slds-page-header__icon" />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title={sectionData.title}>
                        {sectionData.title}
                      </span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Operaciones SaaS (Owner)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* CONTENT */}
      <div className="slds-card slds-p-around_medium" style={{ flex: 1 }}>
        {activeSection === 'planes' && <PlanManagement />}
        {activeSection === 'plantillas' && <SeedTemplates />}
        {activeSection === 'facturacion' && <BillingDashboard />}
        {activeSection === 'auditoria' && <GlobalAuditDashboard />}
        {activeSection === 'comunicados' && <BroadcastsDashboard />}
        
        {activeSection !== 'planes' && activeSection !== 'plantillas' && activeSection !== 'facturacion' && activeSection !== 'auditoria' && activeSection !== 'comunicados' && (
          <>
            <p className="slds-text-body_regular slds-text-color_weak slds-m-bottom_medium">
              {sectionData.description}
            </p>
            <div className="slds-illustration slds-illustration_large" aria-hidden="true">
              <div className="slds-text-longform">
                <h3 className="slds-text-heading_medium">Módulo en construcción...</h3>
                <p className="slds-text-body_regular">Esta sección está siendo desarrollada para brindarte el máximo control corporativo.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
