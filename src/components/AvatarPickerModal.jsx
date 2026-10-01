import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { PRESET_AVATARS, renderUserAvatar } from '../utils/avatarUtils';
import {
  Sparkles,
  Check,
  Image as ImageIcon,
  UploadCloud,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

const AvatarPickerModal = ({
  isOpen,
  onClose,
  currentAvatar,
  onSelectAvatar,
  onUploadFile,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(
    currentAvatar?.startsWith('avatar-') ? currentAvatar : 'avatar-code'
  );
  const [customUrl, setCustomUrl] = useState(
    currentAvatar && !currentAvatar.startsWith('avatar-') && !currentAvatar.startsWith('blob:')
      ? currentAvatar
      : ''
  );

  // Initial tab mode
  const [mode, setMode] = useState('file'); // Default to file upload!
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
  };

  const processSelectedFile = (file) => {
    setErrorMsg('');
    if (!file) return;

    // Validate image mime type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WebP o GIF).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen no debe superar los 5 MB de tamaño.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = async () => {
    setErrorMsg('');
    try {
      if (mode === 'file') {
        if (!selectedFile) {
          setErrorMsg('Selecciona una imagen desde tu dispositivo.');
          return;
        }
        if (onUploadFile) {
          setUploading(true);
          await onUploadFile(selectedFile);
          onClose();
        }
      } else if (mode === 'presets') {
        if (onSelectAvatar) {
          onSelectAvatar(selectedPreset);
          onClose();
        }
      } else if (mode === 'url') {
        if (!customUrl.trim()) {
          setErrorMsg('Ingresa una URL válida de imagen.');
          return;
        }
        if (onSelectAvatar) {
          onSelectAvatar(customUrl.trim());
          onClose();
        }
      }
    } catch (err) {
      console.error('Error confirming avatar:', err);
      const apiErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setErrorMsg(apiErr || 'Error al procesar y guardar la imagen de perfil.');
    } finally {
      setUploading(false);
    }
  };

  // Compute live preview string based on active tab
  const currentPreviewSource = () => {
    if (mode === 'file' && filePreview) return filePreview;
    if (mode === 'presets') return selectedPreset;
    return customUrl.trim() || currentAvatar;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personalizar Foto / Avatar de Perfil"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-slate-700">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              mode === 'file'
                ? 'bg-[#0049EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="truncate">Subir Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('presets')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              mode === 'presets'
                ? 'bg-[#0049EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">Avatares (5)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              mode === 'url'
                ? 'bg-[#0049EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">URL Web</span>
          </button>
        </div>

        {/* Live Preview Bar */}
        <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative shrink-0">
            {renderUserAvatar(
              currentPreviewSource(),
              'Previsualización',
              'w-16 h-16 sm:w-18 sm:h-18 shadow-md object-cover rounded-2xl'
            )}
            <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-white shadow">
              <Check className="w-3 h-3 text-white" />
            </span>
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Previsualización en Vivo
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {mode === 'file'
                ? selectedFile
                  ? selectedFile.name
                  : 'Sube tu foto personalizada'
                : mode === 'presets'
                ? PRESET_AVATARS.find((p) => p.id === selectedPreset)?.name || 'Avatar Seleccionado'
                : customUrl
                ? 'Imagen Web Personalizada'
                : 'Sin URL ingresada'}
            </h4>
            <p className="text-xs text-slate-500">
              Así se verá tu imagen en los registros de auditoría y en la barra lateral del sistema.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Upload File from Device */}
        {mode === 'file' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {!filePreview ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-[#0049EA] bg-blue-50/50'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0049EA] border border-blue-100 flex items-center justify-center mb-3.5 shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h5 className="text-sm font-semibold text-slate-800 mb-1">
                  Haz clic aquí o arrastra tu foto de perfil
                </h5>
                <p className="text-xs text-slate-500 mb-3">
                  Formatos compatibles: JPG, PNG o WebP (Hasta 5 MB)
                </p>
                <button
                  type="button"
                  className="px-5 py-2 bg-blue-50 hover:bg-blue-100 text-[#0049EA] border border-blue-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Explorar Archivos
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {selectedFile?.name || 'Foto Seleccionada'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Listo para aplicar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Quitar foto seleccionada"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Tech Presets Grid */}
        {mode === 'presets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Selecciona tu estilo favorito entre los 5 avatares:
              </label>
              <span className="text-xs text-slate-400 font-medium">5 disponibles</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4 py-1">
              {PRESET_AVATARS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col items-center gap-3 relative group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#0049EA] ring-2 ring-[#0049EA]/30 shadow-md scale-102'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${preset.bg} border ${preset.border}/40 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 text-center leading-tight truncate w-full">
                      {preset.name}
                    </span>

                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0049EA] text-white flex items-center justify-center text-[10px] shadow">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Image URL Mode */}
        {mode === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Dirección URL de la Imagen (HTTPS)
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-foto-perfil.jpg"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#0049EA]"
              />
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                Pega cualquier enlace público a una imagen PNG, JPG, WebP o SVG.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-slate-500 self-center">Ejemplos rápidos:</span>
              <button
                type="button"
                onClick={() =>
                  setCustomUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Retrato 1
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Retrato 2
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomUrl('https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150')
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Retrato 3
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading}
            className="px-5 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/25 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Subiendo Foto...</span>
              </>
            ) : (
              <span>Aplicar y Guardar</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarPickerModal;
