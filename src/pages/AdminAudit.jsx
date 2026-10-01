import React, { useState, useEffect, useCallback } from 'react';
import { auditService, sedesService } from '../services/api';
import Modal from '../components/Modal';
import { renderUserAvatar } from '../utils/avatarUtils';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Building2,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  Calendar,
  RotateCcw,
} from 'lucide-react';

const AdminAudit = () => {
  const [logs, setLogs] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSede, setSelectedSede] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const params = {
        page,
        per_page: 20,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedSede) params.sede_id = selectedSede;
      if (selectedAction) params.action = selectedAction;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await auditService.getLogs(params);
      if (res.data.success) {
        setLogs(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, selectedSede, selectedAction, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    sedesService.getAll(false).then((res) => {
      if (res.data.success) {
        setSedes(res.data.data);
      }
    }).catch((err) => console.error('Error fetching sedes for audit filter:', err));
  }, []);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedSede('');
    setSelectedAction('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const getActionBadge = (action = '') => {
    if (action.includes('delete') || action.includes('remove')) {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
        label: 'Eliminación',
      };
    }
    if (action.includes('upload') || action.includes('create') || action.includes('add')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        label: 'Creación / Subida',
      };
    }
    if (action.includes('reorder')) {
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        label: 'Reordenamiento',
      };
    }
    if (action.includes('login') || action.includes('auth')) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        label: 'Acceso / Seguridad',
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'Actualización',
    };
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-[1.75rem] border border-[#BCD1CB]/50 shadow-xl shadow-blue-500/5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#0049EA] flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Auditoría del Sistema
              <span className="text-xs bg-blue-50 text-[#0049EA] px-2.5 py-0.5 rounded-full font-bold border border-blue-200/70">
                En Tiempo Real
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Registro histórico y trazabilidad de cada acción, subida de contenidos y cambios por sede
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0049EA]' : ''}`} />
          <span>{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#BCD1CB]/50 shadow-xl shadow-blue-500/5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por usuario, acción o descripción..."
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-xs text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:border-[#0049EA] transition"
            />
          </div>

          <div>
            <select
              value={selectedSede}
              onChange={(e) => {
                setSelectedSede(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 rounded-xl focus:bg-white focus:outline-none focus:border-[#0049EA] transition"
            >
              <option value="">Todas las Sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 rounded-xl focus:bg-white focus:outline-none focus:border-[#0049EA] transition"
            >
              <option value="">Todas las Acciones</option>
              <option value="media.upload">Subida de Medios</option>
              <option value="media.delete">Eliminación de Medios</option>
              <option value="media.reorder">Reordenamiento</option>
              <option value="sede">Cambios en Sedes</option>
              <option value="user">Gestión de Usuarios</option>
              <option value="auth">Seguridad & Login</option>
            </select>
          </div>
        </div>

        {/** Date Filters & Clear Action **/}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#0049EA]" />
              Filtrar por Fecha:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400 text-[11px]">Desde:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-800 text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400 text-[11px]">Hasta:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-800 text-xs focus:outline-none"
              />
            </div>
          </div>

          {(search || selectedSede || selectedAction || dateFrom || dateTo) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0049EA] border border-blue-200 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Timeline List */}
      <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[1.75rem] overflow-hidden shadow-xl shadow-blue-500/5">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0049EA]" />
            <p className="text-sm font-medium">Cargando registros de auditoría...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Activity className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-base font-semibold text-slate-800">No se encontraron eventos</p>
            <p className="text-xs text-slate-500">Intenta cambiar los filtros de búsqueda o fecha.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const badge = getActionBadge(log.action);
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    {renderUserAvatar(log.user_avatar, log.user_name, 'w-10 h-10 shrink-0 shadow-sm')}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {log.user_name || 'Ashly Nicole'}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {log.sede_name && (
                          <span className="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200">
                            <Building2 className="w-3 h-3 text-rose-500" />
                            {log.sede_name}
                          </span>
                        )}
                      </div>

                      <p className="text-xs md:text-sm text-slate-600 leading-snug">{log.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {log.created_at_human || log.created_at_formatted}
                        </span>
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLog(log)}
                    className="self-end sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-rose-600" />
                    <span>Detalles</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Página <strong className="text-slate-900">{pagination.current_page}</strong> de{' '}
              <strong className="text-slate-900">{pagination.last_page}</strong> ({pagination.total} registros)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-lg transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-lg transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Detalle Técnico del Evento"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Usuario Autor:</span>
                <span className="font-semibold text-slate-900">{selectedLog.user_name || 'Ashly Nicole'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sede Afectada:</span>
                <span className="font-medium text-slate-800">{selectedLog.sede_name || 'General / Global'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Acción:</span>
                <code className="text-[11px] bg-slate-200 px-2 py-0.5 rounded text-rose-700 font-mono">
                  {selectedLog.action}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y Hora:</span>
                <span>{selectedLog.created_at_formatted} ({selectedLog.created_at_human})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección IP:</span>
                <span>{selectedLog.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Metadatos y Cambios (JSON):</span>
                <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.user_agent && (
              <div className="text-[11px] text-slate-500 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong className="text-slate-700">Agente de Usuario: </strong>
                {selectedLog.user_agent}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminAudit;
