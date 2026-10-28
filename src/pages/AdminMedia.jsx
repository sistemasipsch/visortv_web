import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mediaService, resolveMediaUrl } from '../services/api';
import Modal from '../components/Modal';
import {
  Film,
  Upload,
  Trash2,
  Play,
  Eye,
  ArrowUp,
  ArrowDown,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Tv,
  Clock,
  Link2,
  Plus,
  Globe,
  Sparkles,
} from 'lucide-react';

const AdminMedia = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSedeId = searchParams.get('sede_id') || '';

  // Server-Driven State (Single Source of Truth)
  const [selectedSedeId, setSelectedSedeId] = useState(initialSedeId);
  const [currentSede, setCurrentSede] = useState(null);
  const [availableSedes, setAvailableSedes] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload & Form State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [defaultDuration, setDefaultDuration] = useState(10);
  const [fitMode, setFitMode] = useState('contain');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Modals & Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlFormData, setUrlFormData] = useState({
    url: '',
    title: '',
    type: 'video',
    duration: 10,
    fit_mode: 'contain',
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  }, []);

  // Fetch full server-driven context (items, current sede, available sedes) in 1 single call
  const loadContext = useCallback(async (sedeId, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // Default to empty or first sede ID if not provided
      const res = await mediaService.getBySede(sedeId || 1);
      if (res.data?.success) {
        setMediaItems(res.data.data || []);
        if (res.data.current_sede) {
          setCurrentSede(res.data.current_sede);
          setSelectedSedeId(res.data.current_sede.id.toString());
        }
        if (res.data.available_sedes) {
          setAvailableSedes(res.data.available_sedes);
        }
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error al cargar multimedia:', err);
      showMessage('Error al obtener la información desde el servidor', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Initial load
  useEffect(() => {
    loadContext(selectedSedeId, true);
  }, [selectedSedeId, loadContext]);

  // Tab switch
  const handleSelectSede = (sedeId) => {
    const idStr = sedeId.toString();
    setSelectedSedeId(idStr);
    setSearchParams({ sede_id: idStr });
  };

  // Upload files
  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0 || !selectedSedeId) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('sede_id', selectedSedeId);
    formData.append('duration', defaultDuration.toString());
    formData.append('fit_mode', fitMode);

    for (let i = 0; i < files.length; i++) {
      formData.append('files[]', files[i]);
    }

    try {
      const res = await mediaService.upload(selectedSedeId, formData, (progressEvent) => {
        if (progressEvent.lengthComputable && progressEvent.total > 0) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.data?.success) {
        showMessage(res.data.message || 'Archivos subidos exitosamente', 'success');
        loadContext(selectedSedeId, false);
      }
    } catch (err) {
      console.error('Error al subir archivos:', err);
      const errMsg = err.response?.data?.error || err.message || 'Error al subir los archivos';
      showMessage(errMsg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Add external URL
  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlFormData.url.trim() || !selectedSedeId) return;

    try {
      const res = await mediaService.addUrl({
        ...urlFormData,
        duration: urlFormData.type === 'video' ? 0 : (urlFormData.duration || 10),
        sede_id: selectedSedeId,
      });

      if (res.data?.success) {
        showMessage('Enlace multimedia agregado exitosamente', 'success');
        setShowUrlModal(false);
        setUrlFormData({
          url: '',
          title: '',
          type: 'video',
          duration: 10,
          fit_mode: 'contain',
        });
        loadContext(selectedSedeId, false);
      }
    } catch (err) {
      console.error('Error al agregar URL:', err);
      showMessage(err.response?.data?.error || 'Error al agregar el enlace', 'error');
    }
  };

  // Toggle active status (optimistic 0ms)
  const handleToggleActive = async (item) => {
    const oldActive = item.is_active;
    const newActive = !oldActive;

    setMediaItems((prev) =>
      prev.map((m) =>
        m.id === item.id
          ? { ...m, is_active: newActive, status_label: newActive ? 'Activo' : 'Oculto' }
          : m
      )
    );

    try {
      await mediaService.update(item.id, { is_active: newActive ? 1 : 0 });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setMediaItems((prev) =>
        prev.map((m) =>
          m.id === item.id
            ? { ...m, is_active: oldActive, status_label: oldActive ? 'Activo' : 'Oculto' }
            : m
        )
      );
      showMessage('No se pudo cambiar el estado en el servidor', 'error');
    }
  };

  // Update item properties
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      const res = await mediaService.update(editItem.id, {
        title: editItem.title,
        duration: editItem.type === 'video' ? 0 : (editItem.duration || 10),
        fit_mode: editItem.fit_mode,
        is_active: editItem.is_active ? 1 : 0,
      });

      if (res.data?.success) {
        showMessage('Contenido actualizado correctamente', 'success');
        setEditItem(null);
        loadContext(selectedSedeId, false);
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
      showMessage('Error al actualizar el contenido', 'error');
    }
  };

  // Reorder items
  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mediaItems.length) return;

    const newItems = [...mediaItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setMediaItems(newItems);

    const orders = newItems.map((item, idx) => ({
      id: item.id,
      order_num: idx + 1,
    }));

    try {
      await mediaService.reorder(orders);
    } catch (err) {
      console.error('Error al guardar orden:', err);
      loadContext(selectedSedeId, false);
      showMessage('Error al sincronizar el nuevo orden con el servidor', 'error');
    }
  };

  // Single Delete
  const handleDeleteSingle = async () => {
    if (!deleteItem || isDeleting) return;
    setIsDeleting(true);
    const targetId = deleteItem.id;

    try {
      const res = await mediaService.delete(targetId);
      if (res.data?.success || res.status === 200) {
        setMediaItems((prev) => prev.filter((m) => m.id !== targetId));
        setSelectedIds((prev) => prev.filter((id) => id !== targetId));
        setDeleteItem(null);
        showMessage('Archivo eliminado exitosamente', 'success');
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
        loadContext(selectedSedeId, false);
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      showMessage('Error al eliminar el archivo', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    if (!window.confirm(`¿Eliminar los ${selectedIds.length} archivos seleccionados?`)) return;

    setIsDeleting(true);
    const ids = [...selectedIds];

    try {
      const res = await mediaService.bulkDelete(ids);
      if (res.data?.success || res.status === 200) {
        setMediaItems((prev) => prev.filter((m) => !ids.includes(m.id)));
        setSelectedIds([]);
        showMessage(`${ids.length} archivos eliminados`, 'success');
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
        loadContext(selectedSedeId, false);
      }
    } catch (err) {
      console.error('Error al eliminar en lote:', err);
      showMessage('Error al eliminar los archivos seleccionados', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === mediaItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaItems.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Film className="w-7 h-7 text-[#0049EA]" />
            <span>Gestión Multimedia de Sedes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Programación y control centralizado de videos e imágenes para televisores Smart TV
          </p>
        </div>

        {currentSede && (
          <a
            href={`/visor/${currentSede.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-transform hover:scale-105"
          >
            <Tv className="w-4 h-4" />
            <span>Ver Visor TV en Vivo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* 2. Sede Tabs (Delivered Ready by Backend) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {availableSedes.map((sede) => {
          const isSelected = sede.id.toString() === selectedSedeId.toString();
          return (
            <button
              key={sede.id}
              onClick={() => handleSelectSede(sede.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#0049EA] text-white shadow-md shadow-blue-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sede.color || '#0049EA' }}
              />
              <span>{sede.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sede.total_media ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Notification Banner */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 transition-all ${
            message.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {message.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 4. Upload Area (Zero-Lag, No Heavy Background Blur) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#0049EA]" />
              <span>
                Cargar Contenido para:{' '}
                <span className="text-[#0049EA] font-bold">{currentSede?.name || 'Sede Seleccionada'}</span>
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Formatos recomendados: Videos MP4 (H.264) e Imágenes JPG/PNG. Sin corte de tiempo en videos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowUrlModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0049EA] border border-blue-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Añadir Video por URL / CDN</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#0049EA]" />
              <span className="text-slate-500">Duración foto:</span>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value={5}>5 seg</option>
                <option value={8}>8 seg</option>
                <option value={10}>10 seg</option>
                <option value={15}>15 seg</option>
                <option value={20}>20 seg</option>
                <option value={30}>30 seg</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500">Ajuste:</span>
              <select
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="contain">Ajustar (Contain)</option>
                <option value="cover">Llenar (Cover)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            dragOver ? 'border-[#0049EA] bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0049EA] mb-1">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Arrastre sus videos o imágenes aquí, o haga clic para examinar
          </p>
          <p className="text-xs text-slate-400">
            Archivos optimizados automáticamente con FastStart y miniaturas para Smart TVs
          </p>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#0049EA] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo archivos multimedia al servidor...
              </span>
              <span className="text-slate-800 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0049EA] transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Media Playlist Table (Pure Presentation Driven by API Data) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Playlist de Contenidos ({mediaItems.length})
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar {selectedIds.length} seleccionados</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {selectedIds.length === mediaItems.length && mediaItems.length > 0
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>
            <button
              onClick={() => loadContext(selectedSedeId, true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Recargar desde servidor"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0049EA]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Media Items List */}
        <div className="divide-y divide-slate-100">
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors ${
                !item.is_active ? 'opacity-60 bg-slate-50/30' : ''
              }`}
            >
              {/* Left Column: Selection, Order, Thumbnail, Details */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Select Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelectOne(item.id)}
                  className="w-4 h-4 rounded text-[#0049EA] focus:ring-blue-500 border-slate-300 cursor-pointer"
                />

                {/* Move Up/Down Controls */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                    title="Subir posición"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={index === mediaItems.length - 1}
                    onClick={() => handleMove(index, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                    title="Bajar posición"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Zero-Lag Thumbnail Card (Never Streams Video in Table) */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative w-20 h-14 bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer group flex items-center justify-center shadow-xs"
                  title="Haga clic para reproducir vista previa"
                >
                  {item.thumbnail_url ? (
                    <img
                      src={resolveMediaUrl(item.thumbnail_url)}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-indigo-300">
                      <Film className="w-5 h-5 opacity-80" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-[#0049EA]/40 transition-colors">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                {/* Details (Delivered Pre-Formatted by Backend) */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                      {item.title || item.original_name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        item.type === 'video'
                          ? 'bg-blue-50 text-[#0049EA] border border-blue-200/70'
                          : 'bg-teal-50 text-teal-700 border border-teal-200/70'
                      }`}
                    >
                      {item.type_label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-slate-500">
                    <span className="text-[#0049EA] font-semibold bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
                      {item.uploaded_by_name || 'Ashly Nicole'}
                    </span>

                    {/* Pre-Calculated Size Badge from API */}
                    {item.size_badge && (
                      <span
                        className={`px-2 py-0.5 rounded border font-medium ${
                          item.size_badge.tone === 'emerald'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : item.size_badge.tone === 'amber'
                            ? 'text-amber-800 bg-amber-50 border-amber-200 font-semibold'
                            : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}
                      >
                        {item.size_badge.label}
                      </span>
                    )}

                    {/* Pre-Formatted Duration & Fit Mode from API */}
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#0049EA]" />
                      {item.duration_label}
                    </span>
                    <span>Modo: {item.fit_mode_label}</span>
                    <span className="font-mono text-slate-400">#{index + 1}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    item.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                  title={item.is_active ? 'Desactivar de la pantalla' : 'Activar en pantalla'}
                >
                  {item.status_label}
                </button>

                <button
                  onClick={() => setEditItem(item)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="Editar propiedades"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setPreviewItem(item)}
                  className="p-2 text-slate-400 hover:text-[#0049EA] hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                  title="Ver en grande"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setDeleteItem(item)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {mediaItems.length === 0 && !loading && (
            <div className="text-center py-16 p-6">
              <Film className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No hay contenidos registrados para esta sede</p>
              <p className="text-xs text-slate-500 mt-1">
                Suba videos o imágenes usando el área superior para iniciar la programación.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Lightbox Preview Modal (Mounts Video Only on User Click) */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={`Vista Previa: ${previewItem?.title || ''}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center min-h-[360px] max-h-[70vh]">
            {previewItem?.type === 'video' ? (
              <video
                src={resolveMediaUrl(previewItem.url)}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] object-contain"
              />
            ) : (
              <img
                src={resolveMediaUrl(previewItem?.url)}
                alt={previewItem?.title}
                className="w-full max-h-[70vh] object-contain"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span>Tipo: <strong className="text-slate-800">{previewItem?.type_label}</strong></span>
              <span>•</span>
              <span>Tamaño: <strong className="text-slate-800">{previewItem?.formatted_size}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const item = previewItem;
                  setPreviewItem(null);
                  setDeleteItem(item);
                }}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar archivo</span>
              </button>
              <a
                href={resolveMediaUrl(previewItem?.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0049EA] hover:underline flex items-center gap-1 font-medium"
              >
                Abrir archivo original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </Modal>

      {/* 7. Edit Item Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar Propiedades del Contenido"
        maxWidth="max-w-md"
      >
        {editItem && (
          <form onSubmit={handleUpdateItem} className="space-y-4 text-xs text-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Título / Etiqueta
              </label>
              <input
                type="text"
                value={editItem.title}
                onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {editItem.type === 'image' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duración en Pantalla (Segundos)
                </label>
                <input
                  type="number"
                  min="2"
                  max="300"
                  value={editItem.duration || 10}
                  onChange={(e) => setEditItem({ ...editItem, duration: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Modo de Ajuste
              </label>
              <select
                value={editItem.fit_mode}
                onChange={(e) => setEditItem({ ...editItem, fit_mode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="contain">Ajustar a la pantalla (Contain)</option>
                <option value="cover">Llenar pantalla completa (Cover)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0049EA] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 8. Add via URL Modal */}
      <Modal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        title="Añadir Contenido por Enlace Directo (URL / CDN)"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddUrl} className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Globe className="w-4 h-4 shrink-0 text-[#0049EA] mt-0.5" />
            <p>
              Ideal para videos alojados en CDN o almacenamiento externo (S3, Cloudinary o .mp4 directo). Sin límite de duración.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              URL Directa *
            </label>
            <input
              type="url"
              required
              placeholder="https://ejemplo.com/videos/institucional.mp4"
              value={urlFormData.url}
              onChange={(e) => setUrlFormData({ ...urlFormData, url: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Título
              </label>
              <input
                type="text"
                placeholder="Ej: Video Promocional"
                value={urlFormData.title}
                onChange={(e) => setUrlFormData({ ...urlFormData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <select
                value={urlFormData.type}
                onChange={(e) => setUrlFormData({ ...urlFormData, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="video">Video</option>
                <option value="image">Imagen</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowUrlModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0049EA] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Añadir Contenido
            </button>
          </div>
        </form>
      </Modal>

      {/* 9. Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteItem}
        onClose={() => !isDeleting && setDeleteItem(null)}
        title="Eliminar Contenido"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            ¿Confirma que desea eliminar <strong>"{deleteItem?.title || deleteItem?.original_name}"</strong>?
            Dejará de emitirse en las pantallas de esta sede.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteSingle}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminMedia;
