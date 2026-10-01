import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { sedesService } from '../services/api';
import { renderUserAvatar } from '../utils/avatarUtils';
import {
  LayoutDashboard,
  Building2,
  Film,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Users,
  Tv,
  MonitorPlay,
} from 'lucide-react';
import { getAdminTheme } from '../themes/adminThemes';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sedes, setSedes] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUserUpdate = () => setTick((t) => t + 1);
    window.addEventListener('visorUserUpdated', handleUserUpdate);
    return () => window.removeEventListener('visorUserUpdated', handleUserUpdate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSedes = async () => {
      try {
        const res = await sedesService.getAll();
        if (res.data.success && isMounted) {
          setSedes(res.data.data);
        }
      } catch (err) {
        console.error('Error loading sedes for sidebar:', err);
      }
    };

    fetchSedes();
    const handleUpdate = (e) => {
      if (e?.detail?.type === 'sede_deleted' && e?.detail?.id) {
        setSedes((prev) => prev.filter((s) => s.id !== e.detail.id));
      }
      fetchSedes();
    };
    window.addEventListener('visorDataUpdated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('visorDataUpdated', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Gestión de Sedes', path: '/admin/sedes', icon: Building2 },
    { label: 'Gestión Multimedia', path: '/admin/media', icon: Film },
    { label: 'Usuarios & Roles', path: '/admin/users', icon: Users, superadminOnly: true },
    { label: 'Auditoría en Vivo', path: '/admin/audit', icon: ShieldCheck, superadminOnly: true },
    { label: 'Configuración', path: '/admin/settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.superadminOnly || user?.role === 'superadmin'
  );

  const currentTheme = getAdminTheme(user?.theme);

  const activeNavItem = navItems.find((item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div
      data-theme={currentTheme.id}
      className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-[#0049EA] selection:text-white"
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, #f4f8f7 35%, #edf6fe 70%, #ffffff 100%)',
      }}
    >
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#BCD1CB]/60 text-slate-800 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0049EA] to-[#4CCAFA] flex items-center justify-center shadow-md shadow-blue-600/20">
            <Tv className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            Visor<span className="text-[#0049EA]">TV</span>
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-600 hover:text-[#0049EA] rounded-xl bg-slate-50 border border-[#BCD1CB]/60 transition"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Distinct Luminous Sidebar with Collapsible State */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen flex flex-col bg-white border-r border-[#BCD1CB]/60 shadow-[4px_0_30px_rgba(0,73,234,0.03)] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-72'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center shrink-0 transition-all duration-300 relative border-b border-[#BCD1CB]/40 ${
            collapsed ? 'justify-center px-0' : 'justify-between px-4'
          }`}
        >
          <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0049EA] to-[#4CCAFA] flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
              <Tv className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight">
                    Visor<span className="text-[#0049EA] font-black">TV</span>
                  </span>
                  <span className="text-[9px] bg-blue-50 text-[#0049EA] border border-blue-200/80 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4CCAFA] animate-pulse shrink-0" />
                  Sistema de Pantallas
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6 custom-scrollbar">
          {/* Main Menu Links */}
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : ''}
                  className={`group relative flex items-center gap-3.5 rounded-2xl transition-all duration-200 ${
                    collapsed ? 'justify-center p-3' : 'px-4 py-3 text-sm font-semibold'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0049EA] to-[#0d59f2] text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-600 hover:text-[#0049EA] hover:bg-blue-50/70'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0049EA]'
                    }`}
                  />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && isActive && (
                    <div className="w-2 h-2 rounded-full bg-white ml-2 opacity-90 shrink-0" />
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Quick Sedes TV Launcher */}
          {!collapsed && (
            <div className="space-y-2 pt-2 border-t border-[#BCD1CB]/30">
              <div className="px-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Visores ({sedes.length})</span>
                <NavLink
                  to="/"
                  target="_blank"
                  className="text-[#0049EA] hover:underline flex items-center gap-1 text-[10px] font-semibold lowercase tracking-normal"
                >
                  kiosco <ExternalLink className="w-2.5 h-2.5" />
                </NavLink>
              </div>

              <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {sedes.map((s) => (
                  <a
                    key={s.id}
                    href={`/visor/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-600 hover:text-[#0049EA] hover:bg-blue-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: s.color || '#0049EA' }}
                      />
                      <span className="truncate">{s.name}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full group-hover:bg-[#0049EA] group-hover:text-white transition-colors">
                      {s.active_media || 0}
                    </span>
                  </a>
                ))}
                {sedes.length === 0 && (
                  <p className="px-3 text-xs text-slate-400 italic">No hay sedes registradas</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Collapse Toggle Button (< in Blue Circle) on bottom-right above logout */}
        <div className={`px-4 pt-1 pb-3 mb-2 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-10 h-10 rounded-full bg-[#0049EA] hover:bg-[#003bbd] text-white flex items-center justify-center shadow-lg shadow-blue-600/35 transition-all hover:scale-110 cursor-pointer active:scale-95 shrink-0"
            title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {collapsed ? (
              <ChevronRight className="w-6 h-6 text-white" strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* User Card & Author Version Footer */}
        <div className="p-3 border-t border-[#BCD1CB]/40 bg-slate-50/70 shrink-0 space-y-2.5">
          <div
            className={`flex items-center justify-between bg-white p-2 rounded-2xl border border-[#BCD1CB]/50 shadow-xs ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {renderUserAvatar(
                user?.avatar,
                user?.name,
                'w-9 h-9 shrink-0 rounded-xl shadow-xs border border-blue-100'
              )}
              {!collapsed && (
                <div className="truncate">
                  <p className="text-xs font-bold truncate text-slate-800">
                    {user?.name || 'Administrador'}
                  </p>
                  <p className="text-[11px] font-semibold text-[#0049EA] truncate capitalize">
                    {user?.role || 'Superadmin'}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {!collapsed && (
            <div className="text-[11px] text-center text-slate-400 font-medium pt-1">
              By <strong className="text-slate-600 font-semibold">Ash 🎀</strong> • v2.0
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-[#BCD1CB]/40 shadow-[0_2px_15px_-3px_rgba(0,73,234,0.03)] px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3" />

          <div className="flex items-center gap-3">
            {/* Quick Open Kiosk button */}
            <NavLink
              to="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#0049EA] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 transition-all shadow-xs"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Kiosco</span>
            </NavLink>

            {/* Status Chip with cyan pulse */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#4CCAFA] animate-pulse" />
              <span>Sistema Activo</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-[1600px] mx-auto transition-all">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
