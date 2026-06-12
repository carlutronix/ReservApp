import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#020617';
    document.documentElement.style.backgroundColor = '#020617';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const res = await api.post('/auth/register', data);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registro fallido');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Left Side - Visual Banner (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-center items-center p-12">
        {/* Decorative gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 opacity-90 z-0" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none z-0" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none z-0" />
        
        {/* Interactive Grid/Pattern lines in background */}
        <div className="absolute inset-0 opacity-[0.02] z-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Large Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]" />
          <span className="text-6xl font-extrabold tracking-tight text-white select-none">
            Reserv<span className="text-indigo-400">App</span>
          </span>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-900 lg:bg-slate-950 relative overflow-hidden">
        {/* Decorative radial gradients on mobile/all */}
        <div className="absolute inset-0 bg-slate-950 opacity-100 lg:bg-transparent -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          {/* Small branding logo for mobile only */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500" />
            <span className="text-2xl font-extrabold text-white tracking-tight">
              Reserv<span className="text-indigo-400">App</span>
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Crear Cuenta</h2>
            <p className="text-slate-400 text-sm">Regístrate para empezar a organizar tus partidas.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Nombre Completo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  {...register('name')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full" />
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  {...register('password')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all text-sm mt-2 cursor-pointer"
            >
              Registrarse
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
