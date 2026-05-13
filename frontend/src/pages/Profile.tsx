import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { User, Lock, Mail, Save } from 'lucide-react';

const profileSchema = z.object({
    name: z.string().min(2, 'El nombre es muy corto'),
    email: z.string().email('Email inválido'),
    image: z.string().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
    const { user } = useAuth(); // Assuming login updates user state, or we need a reload/fetchUser
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || '',
            email: user?.email || '',
            image: user?.image || '',
        }
    });

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
            }

            await api.put(`/users/${user?.id}`, updateData);

            // Update local storage or context if possible, or just alert
            // Ideally AuthContext exposes a refreshUser method. For now, we rely on backend update.
            setSuccess('Perfil actualizado correctamente. Si has cambiado el email, es posible que debas volver a iniciar sesión.');

            // If we could update context: login(res.data.token) or setUser(res.data)
            // Assuming naive implementation for now
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
                        <label className="text-sm font-medium text-gray-700 block">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                {...register('password')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Dejar en blanco para mantener"
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">Confirmar Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                {...register('confirmPassword')}
                                className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Confirmar nueva contraseña"
                            />
                        </div>
                        {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
                    </div>
                </div>

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
