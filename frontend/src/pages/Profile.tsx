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
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <User size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mi Perfil</h2>
                    <p className="text-gray-500">Gestiona tu información personal</p>
                </div>
            </div>

            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{success}</div>}
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                {...register('name')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Tu nombre"
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                {...register('email')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block text-indigo-600 font-bold">Nueva Contraseña (Opcional)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                {...register('password')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
                                placeholder="Nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Confirmar Nueva Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                {...register('confirmPassword')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
                                placeholder="Repetir nueva contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
                    </div>
                </div>

                {newPassword && (
                    <div className="space-y-2 p-4 bg-yellow-50 rounded-lg border border-yellow-100 animate-fade-in">
                        <label className="text-sm font-bold text-yellow-800 block">Confirmación de Seguridad</label>
                        <p className="text-xs text-yellow-700 mb-2">Para cambiar la contraseña, introduce tu contraseña ACTUAL:</p>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-yellow-400" size={18} />
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                {...register('currentPassword')}
                                className="w-full pl-10 p-2.5 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white pr-10"
                                placeholder="Tu contraseña actual"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-3 text-yellow-400 hover:text-yellow-600"
                            >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
                    </div>
                )}

                <div className="pt-4 border-t flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all flex items-center gap-2 font-medium"
                    >
                        {isSubmitting ? 'Guardando...' : (
                            <>
                                <Save size={18} /> Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
