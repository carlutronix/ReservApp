import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { User, Lock, Mail, Save, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
    name: z.string().min(2, 'El nombre es muy corto'),
    email: z.string().email('Email inválido'),
    image: z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
    currentPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
}).refine((data) => {
    if (data.password && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Debes introducir tu contraseña actual para cambiarla",
    path: ["currentPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
    const { user, updateUser } = useAuth(); // Assuming login updates user state, or we need a reload/fetchUser
    const navigate = useNavigate();
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || '',
            email: user?.email || '',
            image: user?.image || '',
        }
    });

    const newPassword = watch('password');

    const onSubmit = async (data: ProfileFormData) => {
        try {
            setSuccess('');
            setError('');

            const updateData: any = { 
                name: data.name,
                email: data.email 
            };
            if (data.password) {
                updateData.password = data.password;
                updateData.currentPassword = data.currentPassword;
            }

            const response = await api.put(`/users/${user?.id}`, updateData);
            
            // Update the user in AuthContext
            if (response.data) {
                updateUser(response.data);
            }

            setSuccess('Perfil actualizado correctamente. Redirigiendo...');
            
            // Redirect after 1.5 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al actualizar el perfil');
            console.error(err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl shadow-slate-100/40 border border-slate-200/50">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <User size={26} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Mi Perfil</h2>
                    <p className="text-slate-500 text-xs mt-0.5 font-medium">Gestiona tu información personal</p>
                </div>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100/50 text-xs font-semibold animate-in fade-in duration-200">
                    {success}
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl border border-red-100/50 text-xs font-semibold animate-in fade-in duration-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Nombre Completo</label>
                        <div className="relative group">
                            <User className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                {...register('name')}
                                className="w-full pl-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/20"
                                placeholder="Tu nombre"
                            />
                        </div>
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                {...register('email')}
                                className="w-full pl-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/20"
                                placeholder="tu@email.com"
                            />
                        </div>
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-indigo-500 block font-bold">Nueva Contraseña (Opcional)</label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                {...register('password')}
                                className="w-full pl-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-11 text-sm font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/20"
                                placeholder="Nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Confirmar Nueva Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                {...register('confirmPassword')}
                                className="w-full pl-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-11 text-sm font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/20"
                                placeholder="Repetir nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>
                </div>

                {newPassword && (
                    <div className="space-y-2.5 p-4.5 bg-amber-50/50 rounded-xl border border-amber-200/40 animate-fade-in">
                        <label className="text-xs font-bold text-amber-800 block uppercase tracking-wider">Confirmación de Seguridad</label>
                        <p className="text-xs text-amber-700 font-medium mb-2">Para cambiar la contraseña, introduce tu contraseña ACTUAL:</p>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-3.5 text-amber-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                {...register('currentPassword')}
                                className="w-full pl-11 py-3 border border-amber-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 outline-none bg-white pr-11 text-sm font-medium text-amber-900 placeholder:text-amber-400"
                                placeholder="Tu contraseña actual"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3.5 top-3.5 text-amber-400 hover:text-amber-600 focus:outline-none"
                            >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {errors.currentPassword.message}
                            </p>
                        )}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isSubmitting ? 'Guardando...' : (
                            <>
                                <Save size={16} /> Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
