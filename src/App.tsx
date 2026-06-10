import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider, useCRM } from './context/CRMContext';
import CorporateLayout from './layouts/CorporateLayout';
import HomeDashboard from './pages/HomeDashboard';
import CommercialDashboard from './pages/CommercialDashboard';
import FollowUpsDashboard from './pages/FollowUpsDashboard';
import SettingsDashboard from './pages/SettingsDashboard';
import LoginPage from './pages/LoginPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, tenant, authReady, logout } = useCRM();

  // Esperamos a que Firebase confirme si hay sesion o no
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-bold">Cargando sesion...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (userProfile?.role !== 'owner' && tenant?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Suspendido</h2>
          <p className="text-slate-600 mb-6">El acceso de tu empresa ha sido temporalmente suspendido. Por favor, comunícate con el administrador del sistema para regularizar tu cuenta.</p>
          <button onClick={logout} className="w-full bg-[#0176D3] text-white py-2 rounded font-semibold hover:bg-[#015C99] transition-colors">Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { userProfile } = useCRM();
  if (userProfile?.role === 'owner') return <Navigate to="/configuracion" replace />;
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
        <Routes>
          {/* Ruta publica */}
          <Route path="/login" element={<LoginPage />} />

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
          <Route path="/configuracion" element={
            <AuthGuard>
              <CorporateLayout>
                <SettingsDashboard />
              </CorporateLayout>
            </AuthGuard>
          } />

          {/* Cualquier ruta desconocida va al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CRMProvider>
    </BrowserRouter>
  );
}
