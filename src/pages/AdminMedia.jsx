import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
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
  Globe,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

const AdminMedia = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSedeId = searchParams.get('sede_id') || '1';

  const [selectedSedeId, setSelectedSedeId] = useState(initialSedeId);
  const queryClient = useQueryClient();

  // 1. TanStack Query: High-Performance In-Memory Cache (0ms Sede Switching)
  const {
    data: responseData,
    isLoading: loading,
    isFetching,
    refetch: refetchMedia,
  } = useQuery({
    queryKey: ['admin-media', selectedSedeId],
    queryFn: async () => {
      const res = await mediaService.getBySede(selectedSedeId);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentSede = responseData?.current_sede || null;
  const availableSedes = responseData?.available_sedes || [];
  const serverItems = responseData?.data || [];

  // Local media items state for immediate drag/reorder/deletion responsiveness
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    if (serverItems) {
      setMediaItems(serverItems);
    }
  }, [serverItems]);

  // Upload & Form State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(10);
  const [fitMode, setFitMode] = useState('contain');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Maintenance state
  const [isOptimizing, setIsOptimizing] = useState(false);

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
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  }, []);

  // Tab switch (Instant from React Query Cache)
  const handleSelectSede = (sedeId) => {
    const idStr = sedeId.toString();
    setSelectedSedeId(idStr);
    setSelectedIds([]);
    setSearchParams({ sede_id: idStr });
  };

  // Upload files with client-side image compression
  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0 || !selectedSedeId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const allowedExts = ['mp4', 'jpg', 'jpeg', 'png'];
      const validFiles = [];
      const rejectedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!allowedExts.includes(ext)) {
          rejectedFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      }

      if (rejectedFiles.length > 0) {
        showMessage(
          `Formato incompatible con Smart TV: ${rejectedFiles.join(', ')}. Los televisores solo soportan videos MP4 (.mp4) e imágenes JPG o PNG.`,
          'error'
        );
        if (validFiles.length === 0) {
          setUploading(false);
          return;
        }
      }

      const processedFiles = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        if (file.type.startsWith('image/')) {
          setCompressing(true);
          try {
            // Downscale to Full HD and compress before upload via WebWorker
            const compressed = await imageCompression(file, {
              maxSizeMB: 1.2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            });
            const processedFile = new File([compressed], file.name, { type: compressed.type });
            processedFiles.push(processedFile);
          } catch {
            processedFiles.push(file);
          } finally {
            setCompressing(false);
          }
        } else {
          processedFiles.push(file);
        }
      }

      const formData = new FormData();
      formData.append('sede_id', selectedSedeId);
      formData.append('duration', defaultDuration.toString());
      formData.append('fit_mode', fitMode);

      for (let i = 0; i < processedFiles.length; i++) {
        formData.append('files[]', processedFiles[i]);
      }

      const res = await mediaService.upload(selectedSedeId, formData, (progressEvent) => {
        if (progressEvent.lengthComputable && progressEvent.total > 0) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.data?.success) {
        showMessage(res.data.message || 'Archivos subidos exitosamente', 'success');
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
      }
    } catch (err) {
      console.error('Error al subir archivos:', err);
      const errMsg = err.response?.data?.error || err.message || 'Error al subir los archivos';
      showMessage(errMsg, 'error');
    } finally {
      setUploading(false);
      setCompressing(false);
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
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
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
        Number(m.id) === Number(item.id)
          ? { ...m, is_active: newActive, status_label: newActive ? 'Activo' : 'Oculto' }
          : m
      )
    );

    try {
      await mediaService.update(item.id, { is_active: newActive ? 1 : 0 });
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      window.dispatchEvent(new CustomEvent('visorDataUpdated'));
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setMediaItems((prev) =>
        prev.map((m) =>
          Number(m.id) === Number(item.id)
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
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
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
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      window.dispatchEvent(new CustomEvent('visorDataUpdated'));
    } catch (err) {
      console.error('Error al guardar orden:', err);
      refetchMedia();
      showMessage('Error al sincronizar el nuevo orden con el servidor', 'error');
    }
  };

  // Robust Single Delete (Firewall-safe POST fallback)
  const handleDeleteSingle = async () => {
    if (!deleteItem || isDeleting) return;
    setIsDeleting(true);
    const targetId = Number(deleteItem.id);

    try {
      const res = await mediaService.delete(targetId);
      if (res.data?.success || res.status === 200) {
        setMediaItems((prev) => prev.filter((m) => Number(m.id) !== targetId));
        setSelectedIds((prev) => prev.filter((id) => Number(id) !== targetId));
        setDeleteItem(null);
        showMessage('Archivo eliminado exitosamente', 'success');
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      } else {
        const errorText = res.data?.error || res.data?.message || 'No se pudo eliminar el archivo';
        showMessage(errorText, 'error');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error al eliminar el archivo en el servidor';
      showMessage(errMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Robust Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    if (!window.confirm(`¿Confirma que desea eliminar permanentemente los ${selectedIds.length} contenidos seleccionados?`)) return;

    setIsDeleting(true);
    const ids = selectedIds.map(Number);

    try {
      const res = await mediaService.bulkDelete(ids);
      if (res.data?.success || res.status === 200) {
        setMediaItems((prev) => prev.filter((m) => !ids.includes(Number(m.id))));
        setSelectedIds([]);
        showMessage(`${ids.length} archivos eliminados exitosamente`, 'success');
        window.dispatchEvent(new CustomEvent('visorDataUpdated'));
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      } else {
        const errorText = res.data?.error || res.data?.message || 'Error al eliminar los archivos';
        showMessage(errorText, 'error');
      }
    } catch (err) {
      console.error('Error al eliminar en lote:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error al procesar la eliminación múltiple';
      showMessage(errMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Image Optimization Trigger
  const handleOptimizeImages = async () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      const res = await mediaService.optimizeImages();
      if (res.data?.success) {
        showMessage(res.data.message || 'Optimización completada exitosamente', 'success');
        queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      } else {
        showMessage(res.data?.error || 'Error al optimizar imágenes', 'error');
      }
    } catch (err) {
      console.error('Error al optimizar imágenes:', err);
      showMessage('No se pudo ejecutar la optimización de imágenes', 'error');
    } finally {
      setIsOptimizing(false);
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

      {/* 2. Sede Tabs (Delivered Ready by Backend with 0ms Cache Switching) */}
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

      {/* 4. Upload Area with Client-Side Compression */}
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
              Formatos: Videos MP4 (H.264) e Imágenes JPG/PNG. Compresión automática WebWorker en cliente.
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
            accept=".mp4,.jpg,.jpeg,.png,video/mp4,image/jpeg,image/png"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0049EA] mb-1">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Arrastre sus videos MP4 o imágenes JPG/PNG aquí, o haga clic para examinar
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#0049EA] font-bold">
              Videos: .mp4
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
              Fotos: .jpg, .png
            </span>
            <span className="text-slate-400">
              • Formatos requeridos para Smart TVs
            </span>
          </div>
        </div>

        {/* Upload & Compression Progress */}
        {uploading && (
          <div className="space-y-2 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#0049EA] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {compressing ? 'Comprimiendo y optimizando imágenes en navegador...' : 'Subiendo archivos multimedia al servidor...'}
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

      {/* 5. Media Playlist Table */}
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
                disabled={isDeleting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar {selectedIds.length} seleccionados</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimizeImages}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              title="Comprimir imágenes pesadas y generar miniaturas ligeras en el servidor"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isOptimizing ? 'Optimizando...' : 'Comprimir Imágenes'}</span>
            </button>

            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {selectedIds.length === mediaItems.length && mediaItems.length > 0
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>

            <button
              onClick={() => refetchMedia()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Recargar desde servidor"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#0049EA]' : ''}`} />
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

                {/* Lightweight Thumbnail Box (Ultra-Fast Decoding & Error Fallback) */}
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
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}

                  <div className={`${item.thumbnail_url ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-indigo-300`}>
                    {item.type === 'video' ? <Film className="w-5 h-5 opacity-80" /> : <ImageIcon className="w-5 h-5 opacity-80" />}
                  </div>

                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-[#0049EA]/40 transition-colors">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                {/* Details */}
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
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
