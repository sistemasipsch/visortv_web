import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sedesService } from '../services/api';
import Modal from '../components/Modal';
import IconRenderer from '../components/IconRenderer';
import { AVAILABLE_ICONS, isImageUrl } from '../constants/icons';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Tv,
  Film,
  Image,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  RefreshCw,
  Check,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

const PRESET_COLORS = [
  '#0049EA', // Azul Eléctrico
  '#4CCAFA', // Celeste Neón
  '#10B981', // Verde Esmeralda
  '#F59E0B', // Ámbar Cálido
  '#D946EF', // Fucsia Neón
  '#8B5CF6', // Púrpura Vibrante
];

const AdminSedes = () => {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSede, setSelectedSede] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    color: '#0049EA',
    icon: 'Building2',
    is_active: 1,
  });

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  }, []);

  const loadSedes = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setLoading(true);
    try {
      const res = await sedesService.getAll(false);
      if (res.data.success) {
        setSedes(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sedes:', err);
      showMessage('Error al cargar la lista de sedes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    let isMounted = true;
    sedesService.getAll(false).then((res) => {
      if (res.data.success && isMounted) {
        setSedes(res.data.data);
      }
    }).catch((err) => {
      console.error('Error fetching sedes:', err);
      if (isMounted) {
        showMessage('Error al cargar la lista de sedes', 'error');
      }
    }).finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    const handleUpdate = () => {
      sedesService.getAll(false).then((res) => {
        if (res.data.success && isMounted) setSedes(res.data.data);
      });
    };
    window.addEventListener('visorDataUpdated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('visorDataUpdated', handleUpdate);
    };
  }, [showMessage]);

  const handleOpenCreate = () => {
    setSelectedSede(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      color: PRESET_COLORS[sedes.length % PRESET_COLORS.length] || '#0049EA',
      icon: 'Building2',
      is_active: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (sede) => {
    setSelectedSede(sede);
    setFormData({
      name: sede.name,
      description: sede.description || '',
      address: sede.address || '',
      color: sede.color || '#0049EA',
      icon: sede.icon || 'Building2',
      is_active: sede.is_active,
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (sede) => {
    setSelectedSede(sede);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showMessage('El nombre de la sede es obligatorio', 'error');
      return;
    }

    setFormLoading(true);
    try {
      if (selectedSede) {
        // Update
        const res = await sedesService.update(selectedSede.id, formData);
        if (res.data.success) {
          showMessage('Sede actualizada exitosamente', 'success');
        }
      } else {
        // Create
        const res = await sedesService.create(formData);
        if (res.data.success) {
          showMessage('Sede creada exitosamente', 'success');
        }
      }
      setModalOpen(false);
      loadSedes();
      window.dispatchEvent(new CustomEvent('visorDataUpdated', { detail: { type: 'sede_saved' } }));
    } catch (err) {
      console.error('Error saving sede:', err);
      showMessage(err.response?.data?.error || 'Error al guardar la sede', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSede) return;
    const deletedId = selectedSede.id;
    setFormLoading(true);
    try {
      const res = await sedesService.delete(deletedId);
      if (res.data.success) {
        showMessage('Sede eliminada exitosamente', 'success');
      }
      setDeleteModalOpen(false);
      loadSedes();
      window.dispatchEvent(new CustomEvent('visorDataUpdated', { detail: { type: 'sede_deleted', id: deletedId } }));
    } catch (err) {
      console.error('Error deleting sede:', err);
      showMessage(err.response?.data?.error || 'Error al eliminar la sede', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Move Sede Up or Down in order
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sedes.length) return;

    const newSedes = [...sedes];
    const temp = newSedes[index];
    newSedes[index] = newSedes[targetIndex];
    newSedes[targetIndex] = temp;

    // Build reorder payload
    const orders = newSedes.map((s, idx) => ({
      id: s.id,
      order_num: idx + 1,
    }));

    setSedes(newSedes);

    try {
      await sedesService.reorder(orders);
      loadSedes();
      window.dispatchEvent(new CustomEvent('visorDataUpdated', { detail: { type: 'sede_reordered' } }));
    } catch (err) {
      console.error('Error reordering sedes:', err);
      showMessage('Error al guardar el nuevo orden', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#0049EA]" />
            <span>Gestión de Sedes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administre las sedes o sucursales que proyectan contenido en las pantallas TV
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Nueva Sede</span>
        </button>
      </div>

      {/* Alert / Notification banner */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
            message.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {message.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Sedes Table / List Card */}
      <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[2rem] shadow-xl shadow-blue-500/5 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
              Total Sedes Registradas
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100/70 text-[#0049EA] text-xs font-black">
              {sedes.length}
            </span>
          </div>
          <button
            onClick={() => loadSedes(true)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Recargar sedes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0049EA]' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {sedes.map((sede, index) => (
            <div
              key={sede.id}
              className="p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-blue-50/30 transition-all duration-200"
            >
              {/* Left Info */}
              <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1.5 shrink-0 pt-1">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveOrder(index, -1)}
                    className="p-1.5 text-slate-400 hover:text-[#0049EA] hover:bg-blue-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="Subir orden"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === sedes.length - 1}
                    onClick={() => handleMoveOrder(index, 1)}
                    className="p-1.5 text-slate-400 hover:text-[#0049EA] hover:bg-blue-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="Bajar orden"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Sede Icon & Avatar */}
                {isImageUrl(sede.icon) ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200/90 shadow-md shrink-0 overflow-hidden bg-white">
                    <img
                      src={sede.icon}
                      alt={sede.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div
                      className="w-full h-full items-center justify-center text-white hidden"
                      style={{ backgroundColor: sede.color || '#0049EA' }}
                    >
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform"
                    style={{ backgroundColor: sede.color || '#0049EA' }}
                  >
                    <IconRenderer name={sede.icon} className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                  </div>
                )}

                {/* Name, Slug, Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      {sede.name}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        sede.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {sede.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed font-normal">
                    {sede.description || 'Sin descripción'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 mt-3 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200/80">
                      /{sede.slug}
                    </span>
                    {sede.address && (
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-[#0049EA] shrink-0" />
                        <span>{sede.address}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Media counts & Actions */}
              <div className="flex flex-wrap items-center gap-3 lg:self-center shrink-0 pt-2 lg:pt-0">
                {/* Media Badges */}
                <div className="flex items-center gap-2 mr-1">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0049EA] text-xs font-bold border border-blue-200/80">
                    <Film className="w-3.5 h-3.5 text-[#0049EA]" />
                    <span>{sede.total_videos || 0} Videos</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sede.total_images || 0} Fotos</span>
                  </span>
                </div>

                {/* Manage media */}
                <Link
                  to={`/admin/media?sede_id=${sede.id}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Multimedia
                </Link>

                {/* Open Visor TV */}
                <a
                  href={`/visor/${sede.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-105"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Visor TV</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEdit(sede)}
                  className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Editar Sede"
                >
                  <Edit className="w-4.5 h-4.5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleOpenDelete(sede)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar Sede"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}

          {sedes.length === 0 && !loading && (
            <div className="text-center py-16 p-6">
              <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">No hay sedes creadas</p>
              <p className="text-xs text-slate-500 mt-1">Haga clic en "Agregar Nueva Sede" para registrar la primera.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSede ? 'Editar Sede' : 'Crear Nueva Sede'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre de la Sede *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Sede Principal (Norte)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Descripción
            </label>
            <textarea
              rows={2}
              placeholder="Breve descripción del área de pantallas..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Dirección o Ubicación Física
            </label>
            <input
              type="text"
              placeholder="Ej: Calle 100 # 15 - 20"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0049EA] transition-colors"
            />
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Color Distintivo (6 Colores Vivos)
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`w-7 h-7 rounded-lg transition-transform cursor-pointer shadow-xs ${
                    formData.color === c ? 'scale-115 ring-2 ring-[#0049EA] ring-offset-2' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-7 h-7 bg-transparent rounded-lg cursor-pointer border border-slate-300"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Icon or Image URL Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ícono o Imagen de la Sede
              </label>
              <span className="text-[11px] text-slate-400">6 íconos o URL personalizada</span>
            </div>
            
            {/* 6 Clean Icons */}
            <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 mb-2">
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: iconName })}
                  className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    formData.icon === iconName
                      ? 'bg-[#0049EA] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title={iconName}
                >
                  <IconRenderer name={iconName} className="w-5 h-5" />
                </button>
              ))}
            </div>

            {/* Image URL input */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-medium">O introduce una URL de imagen o logotipo:</label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  placeholder="https://ejemplo.com/logo-sede.png"
                  value={formData.icon && isImageUrl(formData.icon) ? formData.icon : ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0049EA] transition-colors"
                />
                {formData.icon && (
                  <div className="w-12 h-12 rounded-2xl border border-slate-200/90 flex items-center justify-center overflow-hidden shrink-0 shadow-sm bg-white">
                    {isImageUrl(formData.icon) ? (
                      <img
                        src={formData.icon}
                        alt="Preview Sede"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white"
                        style={{ backgroundColor: formData.color }}
                      >
                        <IconRenderer name={formData.icon} className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0049EA]" />
            </label>
            <span className="text-xs font-semibold text-slate-700">
              {formData.is_active ? 'Sede Activa (Visible en pantallas)' : 'Sede Inactiva (Oculta)'}
            </span>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Guardando...' : selectedSede ? 'Actualizar Sede' : 'Crear Sede'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar Eliminación de Sede"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <p>
              Esta acción eliminará permanentemente la sede <strong>{selectedSede?.name}</strong> y{' '}
              <strong>todos sus archivos multimedia (videos e imágenes)</strong> alojados en el servidor.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            ¿Está seguro de que desea continuar? Esta operación no se puede deshacer.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={formLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Eliminando...' : 'Sí, Eliminar Sede'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSedes;
