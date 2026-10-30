import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AdminLogin = lazy(() => import('../pages/AdminLogin'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminSedes = lazy(() => import('../pages/AdminSedes'));
const AdminMedia = lazy(() => import('../pages/AdminMedia'));
const AdminUsers = lazy(() => import('../pages/AdminUsers'));
const AdminAudit = lazy(() => import('../pages/AdminAudit'));
const AdminSettings = lazy(() => import('../pages/AdminSettings'));

const AdminLoader = () => (
  <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    <span className="text-xs font-medium text-slate-400">Cargando módulo de administración...</span>
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

export default function AdminModule() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<AdminLoader />}>
          <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route
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
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
