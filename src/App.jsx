import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

import { Suspense, lazy } from 'react';

// Lazy-loaded Pages for Maximum Performance & Instant Load
const SedesSelection = lazy(() => import('./pages/SedesSelection'));
const VisorTV = lazy(() => import('./pages/VisorTV'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSedes = lazy(() => import('./pages/AdminSedes'));
const AdminMedia = lazy(() => import('./pages/AdminMedia'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));

const PageLoader = () => (
  <div className="h-full min-h-[50vh] w-full flex flex-col items-center justify-center gap-3 p-8">
    <div className="w-8 h-8 rounded-full border-3 border-blue-100 border-t-[#0049EA] animate-spin" />
    <span className="text-xs font-semibold text-slate-400">Cargando...</span>
  </div>
);

// Protected Route Component for Admin
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-sm font-medium text-slate-400">Verificando sesión...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

// Superadmin-only Route Guard
const SuperadminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full min-h-[50vh] w-full flex items-center justify-center">
        <div className="text-xs font-semibold text-slate-400">Verificando permisos...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.role !== 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public / TV Kiosk Routes */}
            <Route path="/" element={<SedesSelection />} />
            <Route path="/sedes" element={<SedesSelection />} />
            <Route path="/visor/:slug" element={<VisorTV />} />
            <Route path="/tv/:slug" element={<VisorTV />} />

            {/* Admin Authentication */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Protected Dashboard Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="sedes" element={<AdminSedes />} />
              <Route path="media" element={<AdminMedia />} />
              <Route
                path="users"
                element={
                  <SuperadminRoute>
                    <AdminUsers />
                  </SuperadminRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <SuperadminRoute>
                    <AdminAudit />
                  </SuperadminRoute>
                }
              />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
