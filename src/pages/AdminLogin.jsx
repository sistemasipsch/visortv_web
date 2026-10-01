import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  Lock,
  User,
  Tv,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.error || err.message || 'Credenciales inválidas. Verifique sus datos.'
      );
    } finally {
      setLoading(false);
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-[#BCD1CB]/70 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#0049EA] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Contraseña
              </label>
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

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Visor TV • Desarrollado por <strong className="text-slate-600 font-semibold">Ashly Nicole</strong> • v2.0
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
