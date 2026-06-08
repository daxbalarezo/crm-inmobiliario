import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider, useCRM } from './context/CRMContext';
import CorporateLayout from './layouts/CorporateLayout';
import HomeDashboard from './pages/HomeDashboard';
import CommercialDashboard from './pages/CommercialDashboard';
import FollowUpsDashboard from './pages/FollowUpsDashboard';
import LoginPage from './pages/LoginPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useCRM();

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
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <CRMProvider>
        <Routes>
          {/* Ruta publica */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas - sin Routes anidado */}
          <Route path="/" element={
            <AuthGuard>
              <CorporateLayout>
                <HomeDashboard />
              </CorporateLayout>
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

          {/* Cualquier ruta desconocida va al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CRMProvider>
    </BrowserRouter>
  );
}
