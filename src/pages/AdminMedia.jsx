import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sedesService, mediaService } from '../services/api';
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
  const [searchParams] = useSearchParams();
  const initialSedeId = searchParams.get('sede_id');

  const [sedes, setSedes] = useState([]);
  const [selectedSedeId, setSelectedSedeId] = useState(initialSedeId || '');
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [defaultDuration, setDefaultDuration] = useState(10);
  const [fitMode, setFitMode] = useState('contain');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Selection & Modals
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
    fit_mode: 'contain'
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  }, []);

  const loadMediaForSede = useCallback(async (sedeId, showSpinner = true) => {
    if (!sedeId) return;
    if (showSpinner) setLoadingMedia(true);
    setSelectedIds([]);
    try {
      const res = await mediaService.getBySede(sedeId);
      if (res.data.success) {
        setMediaItems(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      showMessage('Error al cargar la lista de contenidos multimedia', 'error');
    } finally {
      setLoadingMedia(false);
    }
  }, [showMessage]);

  // 1. Fetch Sedes on Mount
  useEffect(() => {
    let isMounted = true;
    const fetchSedes = async () => {
      try {
        const res = await sedesService.getAll(false);
        if (res.data.success && res.data.data.length > 0 && isMounted) {
          setSedes(res.data.data);
          if (!selectedSedeId) {
            setSelectedSedeId(res.data.data[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Error fetching sedes:', err);
        if (isMounted) {
          showMessage('Error al cargar la lista de sedes', 'error');
        }
      }
    };
    fetchSedes();
    return () => {
      isMounted = false;
    };
  }, [selectedSedeId, showMessage]);

  // 2. Fetch Media when selected Sede changes
  useEffect(() => {
    if (!selectedSedeId) return;
    let isMounted = true;
    mediaService.getBySede(selectedSedeId).then((res) => {
      if (res.data.success && isMounted) {
        setMediaItems(res.data.data);
        setSelectedIds([]);
      }
    }).catch((err) => {
      console.error('Error fetching media:', err);
      if (isMounted) {
        showMessage('Error al cargar la lista de contenidos multimedia', 'error');
      }
    }).finally(() => {
      if (isMounted) {
        setLoadingMedia(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedSedeId, showMessage]);

  // 3. File Upload Handling (No time validation for videos; duration applies exclusively to photos)
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

      if (res.data.success) {
        showMessage(res.data.message || 'Archivos subidos exitosamente', 'success');
        loadMediaForSede(selectedSedeId);
      }
    } catch (err) {
      console.error('Error uploading media:', err);
      const errMsg = err.response?.data?.error || err.message || 'Error al subir los archivos';
      showMessage(typeof errMsg === 'string' ? errMsg : 'Error al subir los archivos', 'error');
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

  // Add Media via External URL / CDN Link
  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlFormData.url.trim() || !selectedSedeId) return;

    try {
      const res = await mediaService.addUrl({
        ...urlFormData,
        // Videos do not have time duration validation; duration is 0 for videos, or custom for images
        duration: urlFormData.type === 'video' ? 0 : (urlFormData.duration || 10),
        sede_id: selectedSedeId
      });

      if (res.data.success) {
        showMessage('Enlace multimedia agregado exitosamente', 'success');
        setShowUrlModal(false);
        setUrlFormData({
          url: '',
          title: '',
          type: 'video',
          duration: 10,
          fit_mode: 'contain'
        });
        loadMediaForSede(selectedSedeId);
      }
    } catch (err) {
      console.error('Error adding media URL:', err);
      showMessage(err.response?.data?.error || 'Error al agregar el enlace multimedia', 'error');
    }
  };

  // 4. Update Media item
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      const res = await mediaService.update(editItem.id, {
        title: editItem.title,
        // Videos play for their natural duration (duration = 0)
        duration: editItem.type === 'video' ? 0 : (editItem.duration || 10),
        fit_mode: editItem.fit_mode,
        is_active: editItem.is_active,
      });

      if (res.data.success) {
        showMessage('Contenido actualizado correctamente', 'success');
        setEditItem(null);
        loadMediaForSede(selectedSedeId);
      }
    } catch (err) {
      console.error('Error updating media item:', err);
      showMessage('Error al actualizar el contenido', 'error');
    }
  };

  // 5. Toggle item active
  const handleToggleActive = async (item) => {
    try {
      const newActive = item.is_active ? 0 : 1;
      await mediaService.update(item.id, { is_active: newActive });
      setMediaItems(
        mediaItems.map((m) => (m.id === item.id ? { ...m, is_active: newActive } : m))
      );
    } catch (err) {
      console.error('Error toggling active state:', err);
      showMessage('Error al cambiar el estado', 'error');
    }
  };

  // 6. Delete single item
  const handleDeleteSingle = async () => {
    if (!deleteItem || isDeleting) return;
    setIsDeleting(true);
    const targetItem = deleteItem;
    const targetId = targetItem.id;

    try {
      const res = await mediaService.delete(targetId);
      if (res.data?.success || res.status === 200) {
        // Immediate optimistic UI update
        setMediaItems((prev) => prev.filter((m) => m.id !== targetId));
        setSelectedIds((prev) => prev.filter((id) => id !== targetId));
        setDeleteItem(null);
        showMessage(res.data?.message || 'Archivo multimedia eliminado exitosamente', 'success');

        // Dispatch sync event for Visor TV and dashboard components
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));

        // Refresh sedes to update counter badges
        sedesService.getAll(false).then((r) => {
          if (r.data?.success) setSedes(r.data.data);
        }).catch(() => {});

        // Re-sync media in background without flickering spinner
        loadMediaForSede(selectedSedeId, false);
      } else {
        showMessage(res.data?.error || 'Error al eliminar el archivo', 'error');
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al eliminar el archivo';
      showMessage(typeof errMsg === 'string' ? errMsg : 'Error al eliminar el archivo', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    if (!window.confirm(`¿Está seguro de eliminar los ${selectedIds.length} archivos seleccionados?`)) {
      return;
    }

    setIsDeleting(true);
    const idsToDelete = [...selectedIds];

    try {
      const res = await mediaService.bulkDelete(idsToDelete);
      if (res.data?.success || res.status === 200) {
        // Immediate optimistic UI update
        setMediaItems((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
        setSelectedIds([]);
        showMessage(res.data?.message || `${idsToDelete.length} archivos eliminados exitosamente`, 'success');

        // Dispatch sync event
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));

        // Refresh sedes to update counter badges
        sedesService.getAll(false).then((r) => {
          if (r.data?.success) setSedes(r.data.data);
        }).catch(() => {});

        // Re-sync media in background
        loadMediaForSede(selectedSedeId, false);
      } else {
        showMessage(res.data?.error || 'Error al eliminar los archivos seleccionados', 'error');
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al eliminar los archivos seleccionados';
      showMessage(typeof errMsg === 'string' ? errMsg : 'Error al eliminar los archivos seleccionados', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 8. Reorder Items
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mediaItems.length) return;

    const newItems = [...mediaItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const orders = newItems.map((item, idx) => ({
      id: item.id,
      order_num: idx + 1,
    }));

    setMediaItems(newItems);

    try {
      await mediaService.reorder(orders);
    } catch (err) {
      console.error('Error reordering media:', err);
      showMessage('Error al guardar el nuevo orden', 'error');
    }
  };

  // Select all or none
  const toggleSelectAll = () => {
    if (selectedIds.length === mediaItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaItems.map((m) => m.id));
    }
  };

  const toggleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const currentSedeObj = sedes.find((s) => s.id.toString() === selectedSedeId?.toString());

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Film className="w-7 h-7 text-[#0049EA]" />
            <span>Gestión Multimedia de Sedes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suba, organice y gestione videos e imágenes para la reproducción continua en cada sede
          </p>
        </div>

        {currentSedeObj && (
          <a
            href={`/visor/${currentSedeObj.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:scale-105"
          >
            <Tv className="w-4 h-4" />
            <span>Ver Visor TV en Vivo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Sede Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {sedes.map((s) => {
          const isSelected = s.id.toString() === selectedSedeId?.toString();
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSedeId(s.id.toString())}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#0049EA] text-white shadow-md shadow-blue-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-[#BCD1CB]/60 shadow-xs'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color || '#0049EA' }}
              />
              <span>{s.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.total_media || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert Banner */}
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

      {/* Upload Drop Zone Card */}
      <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#0049EA]" />
              <span>Subir Archivos para: <span className="text-[#0049EA] font-bold">{currentSedeObj?.name || 'Sede seleccionada'}</span></span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Formatos soportados: Videos (MP4, WebM, MOV, MKV, AVI) e Imágenes (JPG, PNG, WEBP, GIF).{' '}
              <strong className="text-emerald-600 font-semibold">Sin corte de tiempo para videos (reproducción continua completa)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowUrlModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0049EA] border border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Añadir Video por URL / CDN</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs" title="Aplica únicamente a fotos e imágenes estáticas">
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

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-300 bg-slate-50/60 hover:bg-slate-100/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*,image/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1 shadow-xs">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Arrastre y suelte sus videos o imágenes aquí, o haga clic para examinar
          </p>
          <p className="text-xs text-slate-500">
            Formatos compatibles: MP4, WebM, MOV, MKV, JPG, PNG, WebP • Sin límite de tamaño
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-medium border border-blue-100/80">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>Consejo de nitidez: Se recomienda 1080p horizontal (1920x1080) para televisores. Videos de celular se optimizan automáticamente con Nitidez Pro.</span>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 animate-fade-in">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-indigo-600 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo archivos multimedia...
              </span>
              <span className="text-slate-800 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-indigo-200/60 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Media Playlist Manager */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-[1.75rem] shadow-xl shadow-indigo-500/5 overflow-hidden space-y-4">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Playlist de Reproducción ({mediaItems.length})
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar {selectedIds.length} seleccionados</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {selectedIds.length === mediaItems.length && mediaItems.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            <button
              onClick={() => loadMediaForSede(selectedSedeId)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMedia ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Media Items List */}
        <div className="divide-y divide-slate-100">
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-indigo-50/20 transition-colors ${
                !item.is_active ? 'opacity-60 bg-slate-50/30' : ''
              }`}
            >
              {/* Left Details */}
              <div className="flex items-center gap-3.5">
                {/* Select Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelectItem(item.id)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveOrder(index, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                    title="Subir en la lista"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={index === mediaItems.length - 1}
                    onClick={() => handleMoveOrder(index, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                    title="Bajar en la lista"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnail / Media Preview */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative w-20 h-14 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer group flex items-center justify-center shadow-xs"
                >
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-indigo-600/40 transition-colors">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Title and metadata */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                      {item.title || item.original_name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        item.type === 'video'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                          : 'bg-teal-50 text-teal-700 border border-teal-200/70'
                      }`}
                    >
                      {item.type === 'video' ? 'Video' : 'Imagen'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                    <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      Subido por: {item.uploaded_by_name || 'Ashly Nicole'}
                    </span>
                    {item.created_at_human && (
                      <span className="text-slate-400">{item.created_at_human}</span>
                    )}
                    <span>Tamaño: {item.formatted_size}</span>
                    {item.type === 'image' ? (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        {item.duration || 10}s en pantalla
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-indigo-700 font-medium">
                          <Play className="w-3 h-3" />
                          Duración completa
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          Nitidez Pro
                        </span>
                      </>
                    )}
                    <span>Modo: {item.fit_mode === 'cover' ? 'Llenar' : 'Ajustar'}</span>
                    <span className="font-mono text-slate-400">#{index + 1}</span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Toggle Active Button */}
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    item.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                  title={item.is_active ? 'Desactivar de la pantalla' : 'Activar en pantalla'}
                >
                  {item.is_active ? 'Activo' : 'Oculto'}
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => setEditItem(item)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Editar detalles y duración"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {/* Preview Button */}
                <button
                  onClick={() => setPreviewItem(item)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Ver en grande"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeleteItem(item)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {mediaItems.length === 0 && !loadingMedia && (
            <div className="text-center py-16 p-6">
              <Film className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No hay archivos para esta sede</p>
              <p className="text-xs text-slate-500 mt-1">
                Suba videos o fotos en el área de arriba para configurar la lista de reproducción.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Video Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={`Vista Previa: ${previewItem?.title || ''}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center min-h-[360px] max-h-[70vh]">
            {previewItem?.type === 'video' ? (
              previewItem.url && (previewItem.url.includes('youtube.com') || previewItem.url.includes('youtu.be') || previewItem.url.includes('vimeo.com')) ? (
                <iframe
                  src={
                    previewItem.url.includes('vimeo.com')
                      ? previewItem.url.replace('vimeo.com/', 'player.vimeo.com/video/')
                      : previewItem.url.replace('watch?v=', 'embed/').split('&')[0]
                  }
                  className="w-full h-[50vh] border-0"
                  allow="autoplay; encrypted-media"
                  title={previewItem.title}
                />
              ) : (
                <video
                  src={previewItem?.url}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-h-[70vh] object-contain"
                />
              )
            ) : (
              <img
                src={previewItem?.url}
                alt={previewItem?.title}
                className="w-full max-h-[70vh] object-contain"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span>Tipo: <strong className="text-slate-800">{previewItem?.type?.toUpperCase()}</strong></span>
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
                className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar archivo</span>
              </button>
              <a
                href={previewItem?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-600 hover:underline flex items-center gap-1 font-medium"
              >
                Abrir archivo original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Media Modal */}
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>

            {editItem.type === 'image' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duración en Pantalla de la Foto (Segundos)
                </label>
                <input
                  type="number"
                  min="2"
                  max="300"
                  value={editItem.duration || 10}
                  onChange={(e) => setEditItem({ ...editItem, duration: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
                />
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <Play className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Los videos se reproducen en su totalidad según su duración natural sin cortes.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Modo de Ajuste en Pantalla
              </label>
              <select
                value={editItem.fit_mode}
                onChange={(e) => setEditItem({ ...editItem, fit_mode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              >
                <option value="contain">Ajustar a la pantalla (Preservar proporción)</option>
                <option value="cover">Llenar pantalla completa (Recortar bordes si es necesario)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const item = editItem;
                  setEditItem(null);
                  setDeleteItem(item);
                }}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar archivo</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Media via URL / CDN Modal */}
      <Modal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        title="Añadir Contenido por Enlace Directo (URL / CDN)"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddUrl} className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
            <Globe className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <p>
              Ideal para videos de gran tamaño o desplegados en la nube (AWS S3, Vercel Blob, Cloudinary o enlaces directos .mp4).
              <strong> No hay límite de tamaño ni tiempo.</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              URL Directa del Video o Imagen *
            </label>
            <input
              type="url"
              required
              placeholder="https://ejemplo.com/videos/anuncio-corporativo.mp4"
              value={urlFormData.url}
              onChange={(e) => {
                const val = e.target.value;
                const isImg = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(val);
                setUrlFormData({
                  ...urlFormData,
                  url: val,
                  type: isImg ? 'image' : 'video'
                });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Título Descriptivo
              </label>
              <input
                type="text"
                placeholder="Ej: Video Promocional 4K"
                value={urlFormData.title}
                onChange={(e) => setUrlFormData({ ...urlFormData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de Medio
              </label>
              <select
                value={urlFormData.type}
                onChange={(e) => setUrlFormData({ ...urlFormData, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              >
                <option value="video">Video (Sin límite de duración)</option>
                <option value="image">Imagen / Afiche</option>
              </select>
            </div>
          </div>

          {urlFormData.type === 'image' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Duración en Pantalla de la Foto (Segundos)
              </label>
              <input
                type="number"
                min="2"
                max="300"
                value={urlFormData.duration || 10}
                onChange={(e) => setUrlFormData({ ...urlFormData, duration: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <Play className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Los videos se reproducen de principio a fin según su duración natural.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Modo de Ajuste
            </label>
            <select
              value={urlFormData.fit_mode}
              onChange={(e) => setUrlFormData({ ...urlFormData, fit_mode: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
            >
              <option value="contain">Ajustar a la pantalla (Proporcional)</option>
              <option value="cover">Llenar pantalla completa (Cover)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowUrlModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir a la Programación</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Confirmation Modal */}
      <Modal
        isOpen={!!deleteItem}
        onClose={() => !isDeleting && setDeleteItem(null)}
        title="Eliminar Archivo Multimedia"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            ¿Está seguro de eliminar <strong>"{deleteItem?.title || deleteItem?.original_name}"</strong>?
            El archivo será eliminado definitivamente y dejará de mostrarse en el Visor TV.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteSingle}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sí, Eliminar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminMedia;
