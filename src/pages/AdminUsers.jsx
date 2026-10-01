import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api';
import { useAuth } from '../context/useAuth';
import Modal from '../components/Modal';
import AvatarPickerModal from '../components/AvatarPickerModal';
import { renderUserAvatar, getCleanAvatarId } from '../utils/avatarUtils';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Sparkles,
  KeyRound,
  Camera,
} from 'lucide-react';

const AdminUsers = () => {
  const { user: currentUser, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'operator',
    is_active: true,
    avatar: '',
  });

  const showNotification = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  }, []);

  const loadUsers = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await userService.getAll(search);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showNotification('Error al cargar la lista de usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showNotification]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setPendingAvatarFile(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'operator',
      is_active: true,
      avatar: 'avatar-code',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setPendingAvatarFile(null);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      password: '', // blank unless changing
      role: user.role,
      is_active: user.is_active,
      avatar: getCleanAvatarId(user.avatar) || '',
    });
    setShowModal(true);
  };

  const handleUploadAvatarFile = async (file) => {
    if (editingUser?.id) {
      const fileFormData = new FormData();
      fileFormData.append('avatar', file);
      const res = await userService.uploadAvatar(editingUser.id, fileFormData);
      const avatarUrl = res.data?.avatar || res.data?.data?.avatar || res.data?.user?.avatar;
      if (res.data?.success && avatarUrl) {
        setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
        if (
          currentUser &&
          (Number(editingUser.id) === Number(currentUser.id) ||
            editingUser.username === currentUser.username)
        ) {
          updateUser({ avatar: avatarUrl });
        }
        showNotification('Foto de perfil subida exitosamente');
        loadUsers();
        return avatarUrl;
      } else {
        throw new Error(res.data?.message || 'Error al procesar la imagen');
      }
    } else {
      setPendingAvatarFile(file);
      const localUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, avatar: localUrl }));
      return localUrl;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          email: formData.email?.trim() ? formData.email.trim() : null,
          role: formData.role,
          is_active: formData.is_active,
          avatar: formData.avatar && !formData.avatar.startsWith('blob:') ? getCleanAvatarId(formData.avatar) : null,
        };
        if (formData.password.trim()) {
          if (formData.password.trim().length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            setSubmitting(false);
            return;
          }
          payload.password = formData.password.trim();
        }
        await userService.update(editingUser.id, payload);
        let finalAvatar = payload.avatar;
        if (pendingAvatarFile) {
          try {
            const fileFormData = new FormData();
            fileFormData.append('avatar', pendingAvatarFile);
            const uploadRes = await userService.uploadAvatar(editingUser.id, fileFormData);
            const uploadedUrl =
              uploadRes.data?.avatar || uploadRes.data?.data?.avatar || uploadRes.data?.user?.avatar;
            if (uploadedUrl) {
              finalAvatar = uploadedUrl;
            }
          } catch (uploadErr) {
            console.warn('Error uploading edited user avatar:', uploadErr);
          }
        }
        if (
          currentUser &&
          (Number(editingUser.id) === Number(currentUser.id) ||
            editingUser.username === currentUser.username)
        ) {
          updateUser({
            name: payload.name,
            username: payload.username,
            role: payload.role,
            ...(finalAvatar ? { avatar: finalAvatar } : {}),
          });
        }
        showNotification('Usuario actualizado exitosamente');
      } else {
        if (!formData.password.trim() || formData.password.trim().length < 6) {
          showNotification('La contraseña inicial es obligatoria y debe tener al menos 6 caracteres', 'error');
          setSubmitting(false);
          return;
        }
        const createPayload = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          email: formData.email?.trim() ? formData.email.trim() : null,
          password: formData.password.trim(),
          role: formData.role,
          is_active: formData.is_active,
          avatar: formData.avatar && !formData.avatar.startsWith('blob:') ? getCleanAvatarId(formData.avatar) : 'avatar-code',
        };
        const createRes = await userService.create(createPayload);
        const newUserId = createRes.data?.data?.id || createRes.data?.user?.id || createRes.data?.id;
        if (pendingAvatarFile && newUserId) {
          try {
            const fileFormData = new FormData();
            fileFormData.append('avatar', pendingAvatarFile);
            await userService.uploadAvatar(newUserId, fileFormData);
          } catch (uploadErr) {
            console.warn('Could not upload initial avatar for user:', uploadErr);
          }
        }
        showNotification('Usuario creado exitosamente');
      }
      setShowModal(false);
      setPendingAvatarFile(null);
      loadUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      let errorMsg = 'Error al guardar usuario';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        if (errorList.length > 0) {
          errorMsg = errorList.join('. ');
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      showNotification(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!resetPasswordValue.trim() || resetPasswordValue.trim().length < 6) {
      showNotification('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await userService.update(resetPasswordUser.id, { password: resetPasswordValue.trim() });
      showNotification(`Contraseña de '${resetPasswordUser.name}' actualizada correctamente`);
      setResetPasswordUser(null);
      setResetPasswordValue('');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.password?.[0] ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al actualizar contraseña';
      showNotification(typeof msg === 'string' ? msg : 'Error al actualizar contraseña', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.toggleStatus(user.id);
      showNotification(
        `Estado de '${user.name}' cambiado a ${!user.is_active ? 'Activo' : 'Inactivo'}`
      );
      loadUsers();
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification(err.response?.data?.message || 'Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmUser) return;
    try {
      await userService.delete(deleteConfirmUser.id);
      showNotification(`Usuario '${deleteConfirmUser.name}' eliminado correctamente`);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification(err.response?.data?.message || 'Error al eliminar usuario', 'error');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'superadmin') {
      return {
        label: 'Superadmin',
        color: 'bg-blue-50 text-[#0049EA] border-blue-200/80',
        icon: Sparkles,
      };
    }
    if (role === 'admin') {
      return {
        label: 'Administrador',
        color: 'bg-sky-50 text-[#0284c7] border-sky-200/80',
        icon: ShieldCheck,
      };
    }
    return {
      label: 'Operador',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Shield,
    };
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Notification Toast */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="opacity-70 hover:opacity-100 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-[1.75rem] border border-[#BCD1CB]/50 shadow-xl shadow-blue-500/5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#0049EA] flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Gestión de Usuarios
              <span className="text-xs bg-blue-50 text-[#0049EA] px-2.5 py-0.5 rounded-full font-bold border border-blue-200/70">
                {users.length} Registrados
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Administración de operadores, permisos y cuentas del sistema Visor TV
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:scale-105"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-[#BCD1CB]/50 shadow-xl shadow-blue-500/5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario o correo..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:border-[#0049EA] transition"
          />
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0049EA]" />
          <p className="text-sm font-medium">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((user) => {
            const roleInfo = getRoleBadge(user.role);
            const RoleIcon = roleInfo.icon;
            return (
              <div
                key={user.id}
                className="bg-white/95 backdrop-blur-md border border-[#BCD1CB]/40 hover:border-[#4CCAFA] rounded-[1.75rem] p-5 space-y-4 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {renderUserAvatar(user.avatar, user.name, 'w-12 h-12 shrink-0 shadow-xs')}
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{user.name}</h3>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(user)}
                      title={user.is_active ? 'Cuenta Activa (Clic para desactivar)' : 'Cuenta Inactiva (Clic para activar)'}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1 transition cursor-pointer ${
                        user.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                      }`}
                    >
                      {user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{user.is_active ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </div>

                  <div className="pt-3 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 mt-3">
                    <div className="flex justify-between items-center">
                      <span>Rol:</span>
                      <span className={`px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${roleInfo.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
                    </div>
                    {user.email && (
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="text-slate-800 font-medium">{user.email}</span>
                      </div>
                    )}
                    {user.last_login_at && (
                      <div className="flex justify-between">
                        <span>Último acceso:</span>
                        <span className="text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(user.last_login_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setResetPasswordUser(user);
                      setResetPasswordValue('');
                    }}
                    title="Cambiar contraseña de este usuario"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Clave</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmUser(user)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 border border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
            {/* Avatar Selector Row */}
            <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              {renderUserAvatar(formData.avatar, formData.name || 'Usuario', 'w-14 h-14 shrink-0 shadow-xs')}
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-800">Foto / Avatar de Perfil</span>
                <p className="text-[11px] text-slate-500">Personaliza la imagen con avatares o una URL propia</p>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Elegir Avatar o Imagen</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Ashly Nicole"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario de Acceso *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="ej. ashly"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rol de Permisos *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                >
                  <option value="operator">Operador (Solo Pantallas y Medios)</option>
                  <option value="admin">Administrador (Gestión Completa)</option>
                  <option value="superadmin">Superadmin (Acceso Total & Auditoría)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingUser ? 'Nueva Contraseña (Dejar en blanco para no cambiar)' : 'Contraseña de Acceso *'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <label htmlFor="is_active" className="text-xs font-medium text-slate-700">
                Usuario activo (puede iniciar sesión en el sistema)
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/25 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {deleteConfirmUser && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmUser(null)}
          title="¿Eliminar Usuario?"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <p>
              ¿Estás seguro de que deseas eliminar la cuenta de{' '}
              <strong className="text-slate-900 font-bold">'{deleteConfirmUser.name}'</strong> (@{deleteConfirmUser.username})? Esta
              acción no se puede deshacer.
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Cambiar Contraseña Rápido */}
      {resetPasswordUser && (
        <Modal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          title="Cambiar Contraseña"
        >
          <form onSubmit={handleQuickPasswordReset} className="space-y-4 text-xs text-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                required
                autoFocus
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ingrese una nueva contraseña segura para este usuario.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/25 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        currentAvatar={formData.avatar}
        onSelectAvatar={(avatarId) => {
          setPendingAvatarFile(null);
          setFormData((prev) => ({ ...prev, avatar: avatarId }));
        }}
        onUploadFile={handleUploadAvatarFile}
      />
    </div>
  );
};

export default AdminUsers;
