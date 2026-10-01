import React, { useState, useEffect } from 'react';
import { settingsService, authService, userService } from '../services/api';
import { useAuth } from '../context/useAuth';
import AvatarPickerModal from '../components/AvatarPickerModal';
import { renderUserAvatar, getCleanAvatarId } from '../utils/avatarUtils';
import {
  Settings,
  Lock,
  Tv,
  Check,
  AlertTriangle,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Camera,
  UserCheck,
} from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    app_name: 'Visor TV Sistemas',
    default_image_duration: '10',
    tv_show_clock: '1',
    tv_show_sede_title: '1',
    tv_show_progress_bar: '1',
    tv_auto_refresh_seconds: '30',
  });

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' });

  // Auth & Avatar state
  const { user, updateUser } = useAuth();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState({ text: '', type: '' });

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  const handleSelectAvatar = async (newAvatar) => {
    if (!user) return;
    const cleanAvatar = getCleanAvatarId(newAvatar);
    setSavingAvatar(true);
    setAvatarMessage({ text: '', type: '' });
    try {
      const res = await authService.updateAvatar({ avatar: cleanAvatar });
      const savedAvatar = getCleanAvatarId(res.data?.avatar || cleanAvatar);
      updateUser({ avatar: savedAvatar });
      setAvatarMessage({ text: 'Avatar de perfil actualizado exitosamente', type: 'success' });
      setShowAvatarPicker(false);
      setTimeout(() => setAvatarMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      console.warn('Initial updateAvatar warning, trying updateProfile fallback:', err);
      try {
        const res2 = await authService.updateProfile({ avatar: cleanAvatar });
        const savedAvatar = getCleanAvatarId(res2.data?.user?.avatar || cleanAvatar);
        updateUser({ avatar: savedAvatar });
        setAvatarMessage({ text: 'Avatar de perfil actualizado exitosamente', type: 'success' });
        setShowAvatarPicker(false);
        setTimeout(() => setAvatarMessage({ text: '', type: '' }), 4000);
      } catch (err2) {
        console.error('Error updating avatar:', err2);
        setAvatarMessage({ text: 'Error al actualizar el avatar', type: 'error' });
      }
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleUploadAvatarFile = async (file) => {
    setSavingAvatar(true);
    setAvatarMessage({ text: '', type: '' });
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await authService.updateAvatar(formData);
      const newAvatar = res.data?.avatar || res.data?.user?.avatar || res.data?.data?.avatar;
      if (res.data?.success && newAvatar) {
        updateUser({ avatar: newAvatar });
        setAvatarMessage({ text: 'Foto de perfil subida y actualizada exitosamente', type: 'success' });
        setTimeout(() => setAvatarMessage({ text: '', type: '' }), 4000);
        return newAvatar;
      } else {
        throw new Error(res.data?.message || 'No se pudo obtener la imagen subida');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      const apiErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setAvatarMessage({ text: apiErr || 'Error al subir la foto de perfil', type: 'error' });
      throw err;
    } finally {
      setSavingAvatar(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await settingsService.getSettings();
        if (res.data.success && res.data.settings && isMounted) {
          setSettings((prev) => ({ ...prev, ...res.data.settings }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage({ text: '', type: '' });

    try {
      const res = await settingsService.updateSettings(settings);
      if (res.data.success) {
        setSettingsMessage({ text: 'Configuración guardada exitosamente', type: 'success' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSettingsMessage({ text: 'Error al guardar la configuración', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMessage({ text: 'Las nuevas contraseñas no coinciden', type: 'error' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres', type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword(
        passwordData.current_password,
        passwordData.new_password
      );
      if (res.data.success) {
        setPasswordMessage({ text: 'Contraseña cambiada exitosamente', type: 'success' });
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      console.error('Error changing password:', err);
      const apiErr =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.errors?.current_password?.[0] ||
        err.response?.data?.errors?.new_password?.[0] ||
        'Error al cambiar la contraseña';
      setPasswordMessage({
        text: typeof apiErr === 'string' ? apiErr : 'Error al cambiar la contraseña',
        type: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-rose-600" />
          <span>Cargando configuración del sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl w-full mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#0049EA]" />
          <span>Configuración del Sistema</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ajustes globales de reproducción de pantallas y seguridad de acceso
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TV Display Configuration */}
        <div className={`bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-5 ${
          user?.role === 'superadmin' ? '' : 'lg:col-span-2'
        }`}>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#0049EA] flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Parámetros de Reproducción TV</h2>
              <p className="text-xs text-slate-500">Comportamiento del reproductor de pantallas</p>
            </div>
          </div>

          {settingsMessage.text && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                settingsMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {settingsMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              <span>{settingsMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre del Sistema
              </label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Duración Predeterminada de Fotos (Segundos)
              </label>
              <input
                type="number"
                min="3"
                max="120"
                value={settings.default_image_duration}
                onChange={(e) => setSettings({ ...settings, default_image_duration: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Intervalo de Sincronización Automática (Segundos)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.tv_auto_refresh_seconds}
                onChange={(e) => setSettings({ ...settings, tv_auto_refresh_seconds: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 transition-colors"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Frecuencia con la que las TVs verifican si se subió nuevo contenido.
              </span>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tv_show_clock === '1'}
                  onChange={(e) => setSettings({ ...settings, tv_show_clock: e.target.checked ? '1' : '0' })}
                  className="w-4 h-4 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Mostrar reloj digital en el Visor TV
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tv_show_sede_title === '1'}
                  onChange={(e) => setSettings({ ...settings, tv_show_sede_title: e.target.checked ? '1' : '0' })}
                  className="w-4 h-4 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Mostrar información y título de sede en pantalla
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tv_show_progress_bar === '1'}
                  onChange={(e) => setSettings({ ...settings, tv_show_progress_bar: e.target.checked ? '1' : '0' })}
                  className="w-4 h-4 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Mostrar barra de progreso en controles de TV
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Guardando...' : 'Guardar Parámetros'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Admin Password (Superadmin Only) */}
        {user?.role === 'superadmin' && (
          <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#0049EA] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Seguridad de Administrador</h2>
                <p className="text-xs text-slate-500">Actualizar clave de acceso al panel</p>
              </div>
            </div>

            {passwordMessage.text && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                  passwordMessage.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                {passwordMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0049EA] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0049EA] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0049EA] transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{savingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Profile & Avatar Card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 rounded-[1.75rem] p-6 shadow-xl shadow-blue-500/5 space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#0049EA] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Mi Foto de Perfil & Avatar</h2>
                <p className="text-xs text-slate-500">Personaliza la imagen que se muestra en auditoría, panel y barra lateral</p>
              </div>
            </div>
            {savingAvatar && (
              <span className="text-xs text-[#0049EA] flex items-center gap-1.5 animate-pulse font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
              </span>
            )}
          </div>

          {avatarMessage.text && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                avatarMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {avatarMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              <span>{avatarMessage.text}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50/80 border border-slate-200/70 rounded-2xl">
            <div className="relative group">
              {renderUserAvatar(user?.avatar, user?.name || 'Usuario', 'w-24 h-24 shadow-md')}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl transition flex flex-col items-center justify-center gap-1 text-white text-xs font-medium cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Cambiar</span>
              </button>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div>
                <h3 className="text-base font-bold text-slate-900">{user?.name || 'Administrador'}</h3>
                <p className="text-xs text-slate-500">@{user?.username} • Rol: <span className="text-indigo-600 font-semibold capitalize">{user?.role}</span></p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                Elige entre 5 avatares prediseñados vibrantes o sube tu propia fotografía para personalizar tu cuenta.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="px-4 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Elegir Nuevo Avatar o Imagen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        currentAvatar={user?.avatar}
        onSelectAvatar={handleSelectAvatar}
        onUploadFile={handleUploadAvatarFile}
      />
    </div>
  );
};

export default AdminSettings;
