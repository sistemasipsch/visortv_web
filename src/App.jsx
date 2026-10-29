import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded Pages for Maximum Performance & Instant Smart TV Load
const SedesSelection = lazy(() => import('./pages/SedesSelection'));
const VisorTV = lazy(() => import('./pages/VisorTV'));

// Deferred Admin Module (includes React Query, AuthContext, Admin Layout, and Modules)
// Completely isolated so Smart TVs and Public Kiosk never download or execute admin code!
const AdminModule = lazy(() => import('./admin/AdminModule'));

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

function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public TV & Kiosk Routes (Priority #1, ultra-lightweight) */}
            <Route path="/" element={<SedesSelection />} />
            <Route path="/sedes" element={<SedesSelection />} />
            <Route path="/visor/:slug" element={<VisorTV />} />
            <Route path="/tv/:slug" element={<VisorTV />} />

            {/* Admin Management (Deferred / Lazy-loaded on demand post-login) */}
            <Route path="/admin/*" element={<AdminModule />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
}

export default App;
