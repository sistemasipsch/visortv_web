import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

// Ultra-fast client cache configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TV Error Boundary caught error:', error, errorInfo);
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-lg font-black">TV</span>
          </div>
          <h2 className="text-base font-bold text-white mb-1">Reconectando Visor TV...</h2>
          <p className="text-xs text-slate-400">Recuperando transmisión automáticamente...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoader = () => (
  <div className="fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center gap-4 text-white z-50">
    <div className="w-9 h-9 rounded-full border-3 border-rose-950 border-t-rose-500 animate-spin" />
    <span className="text-xs font-mono font-semibold tracking-wider text-slate-400">Cargando Visor TV...</span>
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
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </GlobalErrorBoundary>
);
}

export default App;
