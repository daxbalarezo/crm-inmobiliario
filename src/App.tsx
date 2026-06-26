import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import styles from './App.module.css';
import { CRMProvider, useCRM } from './context/CRMContext';
import { GlobalDataProvider } from './context/GlobalDataProvider';
import CorporateLayout from './layouts/CorporateLayout';
import HomeDashboard from './pages/HomeDashboard';
import CommercialDashboard from './pages/CommercialDashboard';
import FollowUpsDashboard from './pages/FollowUpsDashboard';
import SettingsDashboard from './pages/SettingsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AgentAnalyticsDashboard from './pages/AgentAnalyticsDashboard';
import AdvancedReportsDashboard from './pages/AdvancedReportsDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import LoginPage from './pages/LoginPage';
import InvitedSignUp from './pages/InvitedSignUp';
import CompaniesDashboard from './pages/owner/CompaniesDashboard';
import SaaSOperations from './pages/owner/SaaSOperations';
import TeamDashboard from './pages/TeamDashboard';
import ProjectsDashboard from './pages/ProjectsDashboard';
import TemplatesDashboard from './pages/TemplatesDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import SLAPage from './pages/SLAPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, tenant, authReady, logout } = useCRM();

  // Esperamos a que Firebase confirme si hay sesion o no
  if (!authReady) {
    return (
      <div className={styles.loadingContainer}>
        <div className="text-center">
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Cargando sesion...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (userProfile?.role !== 'owner' && tenant?.status === 'suspended') {
    return (
      <div className={styles.suspendedContainer}>
        <div className={styles.suspendedCard}>
          <div className={styles.suspendedIconContainer}>
            <svg className={styles.suspendedIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className={styles.suspendedTitle}>Acceso Suspendido</h2>
          <p className={styles.suspendedDescription}>El acceso de tu empresa ha sido temporalmente suspendido. Por favor, comunícate con el administrador del sistema para regularizar tu cuenta.</p>
          <button onClick={logout} className={styles.logoutButton}>Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { userProfile } = useCRM();
  if (userProfile?.role === 'owner') {
    return (
      <CorporateLayout>
        <CompaniesDashboard />
      </CorporateLayout>
    );
  }
  if (userProfile?.role === 'manager') {
    return (
      <CorporateLayout>
        <AdminDashboard />
      </CorporateLayout>
    );
  }
  return (
    <CorporateLayout>
      <HomeDashboard />
    </CorporateLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CRMProvider>
        <GlobalDataProvider>
          <Routes>
            {/* Ruta publica */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<InvitedSignUp />} />

            <Route path="/" element={
              <AuthGuard>
                <HomeRoute />
              </AuthGuard>
            } />
            <Route path="/comercial" element={
              <AuthGuard>
                <CorporateLayout>
                  <CommercialDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/seguimientos" element={
              <AuthGuard>
                <CorporateLayout>
                  <FollowUpsDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/finanzas" element={
              <AuthGuard>
                <CorporateLayout>
                  <FinanceDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/configuracion" element={
              <AuthGuard>
                <CorporateLayout>
                  <SettingsDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/empresas" element={
              <AuthGuard>
                <CorporateLayout>
                  <CompaniesDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/saas/*" element={
              <AuthGuard>
                <CorporateLayout>
                  <SaaSOperations />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/analitica-agentes" element={
              <AuthGuard>
                <CorporateLayout>
                  <AgentAnalyticsDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/reportes-avanzados" element={
              <AuthGuard>
                <CorporateLayout>
                  <AdvancedReportsDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/rendimiento" element={
              <AuthGuard>
                <CorporateLayout>
                  <LeaderboardPage />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/equipo" element={
              <AuthGuard>
                <CorporateLayout>
                  <TeamDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/proyectos" element={
              <AuthGuard>
                <CorporateLayout>
                  <ProjectsDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />
            <Route path="/plantillas" element={
              <AuthGuard>
                <CorporateLayout>
                  <TemplatesDashboard />
                </CorporateLayout>
              </AuthGuard>
            } />

            {/* Cualquier ruta desconocida va al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GlobalDataProvider>
      </CRMProvider>
    </BrowserRouter>
  );
}
