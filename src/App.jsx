import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded Pages for Maximum Performance & Instant Smart TV Load
const SedesSelection = lazy(() => import('./pages/SedesSelection'));
const VisorTV = lazy(() => import('./pages/VisorTV'));

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

// Silent neutral fallback (zero spinners or loading text shown to patients)
const SilentFallback = () => (
  <div className="fixed inset-0 w-full h-full bg-black z-50 pointer-events-none" />
);

function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<SilentFallback />}>
          <Routes>
            {/* Public TV & Kiosk Routes (Priority #1, ultra-lightweight) */}
            <Route path="/" element={<SedesSelection />} />
            <Route path="/sedes" element={<SedesSelection />} />
            <Route path="/visor/:slug" element={<VisorTV />} />
            <Route path="/tv/:slug" element={<VisorTV />} />

            {/* Seamless handover to isolated Admin Portal if accessed via TV entry */}
            <Route
              path="/admin/*"
              element={
                <div
                  ref={() => {
                    window.location.href = '/admin';
                  }}
                />
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
}

export default App;
