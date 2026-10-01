import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsService } from '../services/api';
import { useAuth } from '../context/useAuth';
import IconRenderer from '../components/IconRenderer';
import { isImageUrl } from '../constants/icons';
import {
  Building2,
  Film,
  Image,
  HardDrive,
  ExternalLink,
  Upload,
  Play,
  ArrowRight,
  RefreshCw,
  Server,
  Users,
  ShieldCheck,
  FileCode2,
  ChevronRight,
  Tv,
  Sparkles,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await statsService.getStats();
        if (res.data.success && isMounted) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('visorDataUpdated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('visorDataUpdated', handleUpdate);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await statsService.getStats();
      if (res.data.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error refreshing dashboard stats:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
        <div className="relative flex justify-center items-center">
          <div className="absolute animate-ping h-14 w-14 rounded-full bg-[#4CCAFA] opacity-75" />
          <div className="relative h-14 w-14 rounded-full border-4 border-blue-200 border-t-[#0049EA] animate-spin" />
        </div>
        <p className="mt-4 text-slate-500 font-semibold text-sm">Cargando panel de control...</p>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Sedes Activas',
      value: stats?.stats?.total_sedes || 0,
      description: `${stats?.stats?.active_sedes || 0} sedes en transmisión`,
      icon: Building2,
      color: 'blue',
      bg: 'bg-[#0049EA]',
      text: 'text-[#0049EA]',
      lightBg: 'bg-blue-50',
      shadow: 'shadow-blue-500/10',
      link: '/admin/sedes',
    },
    {
      title: 'Videos en Bucle',
      value: stats?.stats?.total_videos || 0,
      description: 'Streaming continuo HTTP 206',
      icon: Film,
      color: 'cyan',
      bg: 'bg-[#4CCAFA]',
      text: 'text-[#0284c7]',
      lightBg: 'bg-sky-50',
      shadow: 'shadow-sky-500/10',
      link: '/admin/media',
    },
    {
      title: 'Cartelería / Fotos',
      value: stats?.stats?.total_images || 0,
      description: 'Duración por pase programable',
      icon: Image,
      color: 'teal',
      bg: 'bg-teal-500',
      text: 'text-teal-600',
      lightBg: 'bg-teal-50',
      shadow: 'shadow-teal-500/10',
      link: '/admin/media',
    },
    ...(isSuperAdmin
      ? [
          {
            title: 'Usuarios & Accesos',
            value: stats?.stats?.total_users || 0,
            description: `${stats?.stats?.active_users || 0} con sesión habilitada`,
            icon: Users,
            color: 'slate',
            bg: 'bg-slate-700',
            text: 'text-slate-800',
            lightBg: 'bg-slate-100',
            shadow: 'shadow-slate-500/10',
            link: '/admin/users',
          },
        ]
      : []),
    {
      title: 'Almacenamiento',
      value: stats?.stats?.formatted_storage || '0 B',
      description: `${stats?.stats?.total_media || 0} archivos subidos`,
      icon: HardDrive,
      color: 'amber',
      bg: 'bg-amber-500',
      text: 'text-amber-600',
      lightBg: 'bg-amber-50',
      shadow: 'shadow-amber-500/10',
      link: '/admin/media',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto">
      {/* Royal Blue & Cyan Hero Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0049EA] via-[#0041d4] to-[#0284c7] p-8 sm:p-10 md:p-12 text-white shadow-2xl group">
        {/* Floating Decorative Blur Blobs */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#4CCAFA]/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#4CCAFA]" />
              <span>Visor TV Pro</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              {getGreeting()}, <span className="text-[#4CCAFA]">Administrador</span>
            </h1>

            <p className="max-w-2xl text-sm sm:text-base text-blue-100 font-medium opacity-95 leading-relaxed">
              Supervisión de transmisiones multimedia en tiempo real, gestión de sedes remotas y
              cartelería digital para Smart TVs.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold backdrop-blur-md transition-all cursor-pointer shadow-sm"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
            </button>

            <Link
              to="/admin/media"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#0049EA] hover:bg-blue-50 font-bold text-xs shadow-xl shadow-blue-950/20 transition-all hover:scale-105"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Contenido</span>
            </Link>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#4CCAFA] to-[#0284c7] hover:from-[#38bde8] hover:to-[#0275b1] text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
            >
              <Tv className="w-4 h-4" />
              <span>Ver Kiosco</span>
              <ExternalLink className="w-3 h-3 opacity-90" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          isSuperAdmin ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'
        } gap-5`}
      >
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`group relative overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-md p-6 shadow-xl ${kpi.shadow} border border-[#BCD1CB]/40 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col justify-between`}
            >
              {/* Decorative background blob */}
              <div
                className={`absolute -top-12 -right-12 h-32 w-32 rounded-full ${kpi.bg} opacity-5 blur-2xl group-hover:opacity-15 transition-opacity duration-500`}
              />

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    {kpi.title}
                  </h3>
                  <p className="text-3xl font-black tracking-tight text-slate-800 drop-shadow-sm">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${kpi.lightBg} ${kpi.text} shadow-xs group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="relative z-10 mt-4 border-t border-[#BCD1CB]/30 pt-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 tracking-wide flex items-center truncate">
                  <span className={`w-1.5 h-1.5 rounded-full ${kpi.bg} mr-2 opacity-80 shrink-0`} />
                  <span className="truncate">{kpi.description}</span>
                </p>
                {kpi.link && (
                  <Link
                    to={kpi.link}
                    className="text-slate-400 hover:text-[#0049EA] transition-colors p-1"
                    title="Ir al módulo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Sedes Status (2 Cols) & Live Audit / System (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sedes y Pantallas */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0049EA] shadow-xs border border-blue-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-800">
                  Sedes & Pantallas
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Monitoreo de pantallas configuradas en la red
                </p>
              </div>
            </div>

            <Link
              to="/admin/sedes"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0049EA] hover:text-blue-700 bg-blue-50/80 px-3.5 py-1.5 rounded-xl border border-blue-200/60 transition-colors"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {stats?.sedes?.map((sede) => (
              <div
                key={sede.id}
                className="group bg-white/95 backdrop-blur-md border border-[#BCD1CB]/40 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      {isImageUrl(sede.icon) ? (
                        <div className="w-14 h-14 rounded-2xl border border-slate-200/90 shadow-sm shrink-0 overflow-hidden bg-white">
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
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                          style={{ backgroundColor: sede.color || '#0049EA' }}
                        >
                          <IconRenderer name={sede.icon || 'Building2'} className="w-7 h-7 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">
                          {sede.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">/{sede.slug}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider ${
                        sede.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {sede.is_active ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 px-2 border border-[#BCD1CB]/30 rounded-2xl bg-slate-50/60 text-center my-3">
                    <div>
                      <p className="text-base font-extrabold text-slate-800">
                        {sede.media_count || 0}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Total
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-[#0049EA]">
                        {sede.video_count || 0}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Videos
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-teal-600">
                        {sede.image_count || 0}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Fotos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <a
                    href={`/visor/${sede.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Lanzar TV</span>
                  </a>
                  <Link
                    to={`/admin/media?sede_id=${sede.id}`}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all border border-[#BCD1CB]/40"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Audit Timeline & System Status */}
        <div className="space-y-6">
          {/* Audit Events Feed (Superadmin only) or TV Guide (Admin) */}
          {isSuperAdmin ? (
            <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/40 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#BCD1CB]/30 pb-3">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0049EA]" />
                  <span>Auditoría Reciente</span>
                </h2>
                <Link
                  to="/admin/audit"
                  className="text-xs font-bold text-[#0049EA] hover:underline"
                >
                  Ver todo
                </Link>
              </div>

              <div className="space-y-3">
                {stats?.recent_audits && stats.recent_audits.length > 0 ? (
                  stats.recent_audits.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl border border-[#BCD1CB]/30 text-xs space-y-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {log.user_name || 'Ashly Nicole'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {log.created_at_human}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-snug">{log.description}</p>
                      {log.sede_name && (
                        <span className="inline-block text-[10px] text-[#0049EA] bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-200/80">
                          {log.sede_name}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No hay registros recientes
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/40 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#BCD1CB]/30 pb-3">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#0049EA]" />
                  <span>Guía de Transmisión TV</span>
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Smart TV
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100/80 space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0049EA]" />
                    <span>Modo Nitidez Pro Automático</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    El visor optimiza los bordes y contraste de los videos de celular. Presione <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded font-mono font-bold text-slate-700">A</kbd> en pantalla completa para alternar modos.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-2">
                  <p className="font-bold text-slate-800">Atajos rápidos en el televisor:</p>
                  <ul className="space-y-1.5 text-slate-600 text-[11px]">
                    <li className="flex items-center justify-between">
                      <span>Pantalla completa</span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-semibold">F11 / F</kbd>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Activar / Silenciar sonido</span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-semibold">M</kbd>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Pausar / Reanudar transmisión</span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-semibold">Espacio</kbd>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* System Environment */}
          <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/40 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#BCD1CB]/30 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#0049EA]" />
                <span>Infraestructura</span>
              </h3>
              <a
                href="http://127.0.0.1:8000/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#0049EA] hover:underline flex items-center gap-1"
              >
                <FileCode2 className="w-3 h-3" />
                <span>Swagger</span>
              </a>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                <span className="font-medium">Backend:</span>
                <span className="font-mono font-bold text-slate-800">
                  Laravel {stats?.system?.laravel_version}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                <span className="font-medium">PHP Runtime:</span>
                <span className="font-mono font-bold text-slate-800">
                  {stats?.system?.php_version}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                <span className="font-medium">Límite Subida:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {stats?.system?.upload_max_filesize}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-500">
                <span className="font-medium">Autoría:</span>
                <span className="font-bold text-slate-800">
                  {stats?.system?.author || 'Ashly Nicole'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
