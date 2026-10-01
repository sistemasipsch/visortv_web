import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sedesService } from '../services/api';
import IconRenderer from '../components/IconRenderer';
import { isImageUrl } from '../constants/icons';
import {
  Film,
  Image,
  Play,
  ArrowRight,
  ShieldLock,
  Search,
  RefreshCw,
  Clock,
  Radio,
  Tv,
} from 'lucide-react';

const SedesSelection = () => {
  const navigate = useNavigate();
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadSedes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sedesService.getAll(true); // Public active only
      if (res.data.success) {
        setSedes(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sedes:', err);
      setError(
        'No se pudo conectar con el servidor de sedes. Verifique que el backend PHP esté en ejecución.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    sedesService
      .getAll(true)
      .then((res) => {
        if (res.data.success && isMounted) {
          setSedes(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching sedes:', err);
        if (isMounted) {
          setError(
            'No se pudo conectar con el servidor de sedes. Verifique que el backend PHP esté en ejecución.'
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    const handleUpdate = () => {
      sedesService.getAll(true).then((res) => {
        if (res.data.success && isMounted) setSedes(res.data.data);
      });
    };
    window.addEventListener('visorDataUpdated', handleUpdate);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      isMounted = false;
      window.removeEventListener('visorDataUpdated', handleUpdate);
      clearInterval(timer);
    };
  }, []);

  const filteredSedes = (Array.isArray(sedes) ? sedes : []).filter(
    (s) =>
      (s?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s?.description && s.description.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
      (s?.address && s.address.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  return (
    <div
      className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-[#0049EA] selection:text-white"
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, #f4f8f7 35%, #edf6fe 70%, #ffffff 100%)',
      }}
    >
      {/* Top Navigation Bar */}
      <header className="px-6 lg:px-10 py-3.5 border-b border-[#BCD1CB]/50 bg-white/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,73,234,0.03)]">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#0049EA] to-[#4CCAFA] flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              Visor<span className="text-[#0049EA] font-extrabold">TV</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-[#0049EA] border border-blue-200/80 font-black uppercase tracking-wider">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sistema de Pantallas • Seleccione la sede para iniciar la reproducción continua
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Clock for Kiosks */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 border border-[#BCD1CB]/60 text-xs text-slate-600 font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#0049EA]" />
            <span className="font-mono">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>

          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
          >
            <ShieldLock className="w-4 h-4" />
            <span>Panel Admin</span>
          </Link>
        </div>
      </header>

      {/* Hero / Sede Chooser Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0049EA] text-xs font-bold border border-blue-200/80 mb-2">
              <Radio className="w-3.5 h-3.5 text-[#4CCAFA] animate-pulse" /> Canales de Transmisión Activos
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Sedes Disponibles
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">
              Haga clic en una sede para proyectar su contenido audiovisual en pantalla completa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar sede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#BCD1CB]/60 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0049EA] transition-all shadow-xs font-medium"
              />
            </div>

            <button
              onClick={loadSedes}
              title="Recargar sedes"
              className="p-2.5 bg-white hover:bg-slate-50 border border-[#BCD1CB]/60 rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0049EA]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>
              {typeof error === 'string'
                ? error
                : error?.message || 'Error de conexión con la API'}
            </span>
            <button
              onClick={loadSedes}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && sedes.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-56 bg-white border border-[#BCD1CB]/50 rounded-[2rem] animate-pulse p-6 flex flex-col justify-between shadow-xs"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                  <div className="w-3/4 h-5 bg-slate-100 rounded-md" />
                  <div className="w-1/2 h-3 bg-slate-100 rounded-md" />
                </div>
                <div className="w-full h-10 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Sedes Grid */}
        {!loading && filteredSedes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSedes.map((sede) => {
              const hasMedia = (sede.active_media || 0) > 0;
              return (
                <div
                  key={sede.id}
                  onClick={() => navigate(`/visor/${sede.slug}`)}
                  className="group relative bg-white/95 backdrop-blur-md hover:border-[#4CCAFA] border border-[#BCD1CB]/50 rounded-[2rem] p-7 transition-all duration-300 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/15 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
                >
                  {/* Decorative top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 opacity-90 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: sede.color || '#0049EA' }}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-5">
                      {isImageUrl(sede.icon) ? (
                        <div className="w-16 h-16 rounded-2xl border border-slate-200/90 shadow-md shrink-0 overflow-hidden bg-white transition-transform group-hover:scale-105 duration-300">
                          <img
                            src={sede.icon}
                            alt={sede.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 duration-300"
                          style={{ backgroundColor: sede.color || '#0049EA' }}
                        >
                          <IconRenderer name={sede.icon} className="w-8 h-8 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0049EA] border border-blue-200">
                          <Film className="w-3 h-3 text-[#0049EA]" />
                          <span>{sede.total_videos || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <Image className="w-3 h-3 text-teal-600" />
                          <span>{sede.total_images || 0}</span>
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-800 group-hover:text-[#0049EA] transition-colors">
                      {sede.name}
                    </h3>

                    {sede.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {sede.description}
                      </p>
                    )}

                    {sede.address && (
                      <p className="text-[11px] text-slate-400 mt-2.5 font-medium flex items-center gap-1">
                        <span>📍</span> {sede.address}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-[#BCD1CB]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          hasMedia ? 'bg-[#4CCAFA] animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-600">
                        {hasMedia
                          ? `${sede.active_media} contenidos listos`
                          : 'Esperando multimedia'}
                      </span>
                    </div>

                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-bold shadow-md shadow-blue-600/20 group-hover:scale-105 transition-all">
                      <Play className="w-3 h-3 fill-white" />
                      <span>Ver TV</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredSedes.length === 0 && (
          <div className="text-center py-16 bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-[#BCD1CB]/50 shadow-xl shadow-blue-500/5 max-w-lg mx-auto p-8">
            <Tv className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No se encontraron sedes activas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Ninguna sede coincide con el filtro de búsqueda ingresado.'
                : 'No hay sedes configuradas o activas actualmente.'}
            </p>
            <Link
              to="/admin/sedes"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 hover:scale-105 transition-all"
            >
              Configurar Sedes en Panel Admin
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-[#BCD1CB]/50 bg-white/60 text-center text-xs text-slate-400 font-medium">
        Visor TV • Sistema de Pantallas y Cartelería • v2.0
      </footer>
    </div>
  );
};

export default SedesSelection;
