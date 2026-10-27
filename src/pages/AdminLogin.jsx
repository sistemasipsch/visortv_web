import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { authService } from '../services/api';
import Modal from '../components/Modal';
import {
  Lock,
  User,
  Tv,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Mail,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');

  // Password Recovery Modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: reset password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [devCode, setDevCode] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);
    setError('');
    setLoginSuccessMsg('');

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Credenciales inválidas. Verifique sus datos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotIdentifier(username.trim());
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep(1);
    setForgotError('');
    setForgotSuccessMsg('');
    setEmailHint('');
    setDevCode('');
    setIsForgotModalOpen(true);
  };

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotLoading(false);
    setForgotError('');
  };

  // Step 1: Send reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    const identifier = forgotIdentifier.trim();
    if (!identifier) {
      setForgotError('Por favor ingrese su usuario o correo electrónico.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccessMsg('');

    try {
      const response = await authService.forgotPassword(identifier);
      const data = response.data;
      if (data.username) {
        setForgotIdentifier(data.username);
      }
      setEmailHint(data.email_hint || '');
      setDevCode(data.dev_code || '');
      setForgotSuccessMsg(data.message || 'Código generado correctamente.');
      setForgotStep(2);
    } catch (err) {
      console.error('Forgot password error:', err);
      const validationMsg =
        err.response?.data?.errors?.username?.[0] ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        'No se pudo procesar la solicitud de recuperación.';
      setForgotError(validationMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Submit code & reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const code = forgotCode.trim();
    if (!code || code.length !== 6) {
      setForgotError('El código de verificación debe contener exactamente 6 dígitos.');
      return;
    }
    if (!forgotNewPassword) {
      setForgotError('Por favor ingrese su nueva contraseña.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Las contraseñas no coinciden.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const response = await authService.resetPassword({
        username: forgotIdentifier,
        code,
        new_password: forgotNewPassword,
        new_password_confirmation: forgotConfirmPassword,
      });

      // Reset successful: update login form and close modal
      const successMsg = response.data?.message || 'Contraseña restablecida exitosamente.';
      setUsername(forgotIdentifier);
      setPassword('');
      setLoginSuccessMsg(successMsg);
      setError('');
      handleCloseForgotModal();
    } catch (err) {
      console.error('Reset password error:', err);
      const validationMsg =
        err.response?.data?.errors?.code?.[0] ||
        err.response?.data?.errors?.new_password?.[0] ||
        err.response?.data?.errors?.username?.[0] ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al restablecer la contraseña. Verifique el código ingresado.';
      setForgotError(validationMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 text-slate-800 relative selection:bg-[#0049EA] selection:text-white"
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, #f4f8f7 35%, #edf6fe 70%, #ffffff 100%)',
      }}
    >
      {/* Back to Sedes portal link */}
      <Link
        to="/"
        className="absolute top-6 left-6 text-xs font-bold text-slate-600 hover:text-[#0049EA] flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 hover:bg-white border border-[#BCD1CB]/60 shadow-xs backdrop-blur-md transition-all"
      >
        <Tv className="w-4 h-4 text-[#0049EA]" />
        <span>Ir al Visor de Sedes</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-[#BCD1CB]/60 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,73,234,0.12)] relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0049EA] via-[#4CCAFA] to-[#0049EA]" />

          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0049EA] to-[#4CCAFA] p-3 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30">
              <Tv className="w-8 h-8 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0049EA] text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#4CCAFA]" />
              <span>Sistema de Pantallas</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Panel de Administración
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Ingrese con sus credenciales de acceso institucional
            </p>
          </div>

          {/* Login Success Notification (e.g. after password reset) */}
          {loginSuccessMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{loginSuccessMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario o usuario@ejemplo.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-[#BCD1CB]/70 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-[11px] font-bold text-[#0049EA] hover:text-[#003bbd] hover:underline cursor-pointer transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50/70 border border-[#BCD1CB]/70 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02]"
            >
              {loading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Password Recovery Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={handleCloseForgotModal}
        title={forgotStep === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
        maxWidth="max-w-md"
      >
        {forgotStep === 1 ? (
          /* STEP 1: Enter Username or Email */
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-700 text-xs">
              <KeyRound className="w-5 h-5 text-[#0049EA] shrink-0" />
              <p className="leading-relaxed">
                Ingresa tu <strong>nombre de usuario</strong> o <strong>correo electrónico</strong> registrado para generar tu código de recuperación de 6 dígitos.
              </p>
            </div>

            {forgotError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{forgotError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Usuario o Correo Institucional
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Ej: admin o usuario@correo.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={handleCloseForgotModal}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {forgotLoading ? (
                  <span>Generando código...</span>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Enter Code & New Password */
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-700 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#0049EA]" />
                <span>Restableciendo usuario: @{forgotIdentifier}</span>
              </div>
              {emailHint ? (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>Código enviado a: <strong className="text-slate-800">{emailHint}</strong></span>
                </p>
              ) : (
                <p className="text-slate-500">
                  Validez del código: 15 minutos.
                </p>
              )}
              {devCode && (
                <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
                  <span>Código de verificación generado:</span>
                  <span className="font-mono font-black text-sm tracking-widest text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                    {devCode}
                  </span>
                </div>
              )}
            </div>

            {forgotError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{forgotError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Código de Verificación (6 dígitos)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono tracking-widest font-black text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showForgotConfirmPassword ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => {
                  setForgotStep(1);
                  setForgotError('');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Reenviar o cambiar</span>
              </button>

              <button
                type="submit"
                disabled={forgotLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {forgotLoading ? (
                  <span>Actualizando clave...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Nueva Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminLogin;
