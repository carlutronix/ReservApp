import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Clock, User, AlignLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface Court {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  court: Court;
  startTime: Date;
  onSuccess: () => void;
}

const reservationSchema = z.object({
  duration: z.string(),
  notes: z.string().optional(),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

export default function ReservationModal({ isOpen, onClose, court, startTime, onSuccess }: ReservationModalProps) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      duration: '1',
      notes: ''
    }
  });

  const duration = watch('duration');
  const endTime = addMinutes(startTime, Number(duration) * 60);
  const price = Number(duration) * court.pricePerHour;

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/reservations', {
        courtId: court.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: data.notes
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Confirmar Reserva</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Court Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
            <p className="font-semibold text-blue-900">{court.name}</p>
            <p className="text-sm text-blue-700">Pista {court.type}</p>
            <p className="text-sm text-blue-700">
              {format(startTime, 'PPPP', { locale: es })} a las {format(startTime, 'p', { locale: es })}
            </p>
            {court.pricePerHour > 0 && (
              <p className="text-xs font-bold text-blue-800 mt-1">Precio: €{court.pricePerHour}/hora</p>
            )}
          </div>

          {/* User Info (Read only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User size={16} /> Usuario
            </label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-600"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Clock size={16} /> Duración
            </label>
            <select
              {...register('duration')}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="0.5">30 Minutos</option>
              <option value="1">1 Hora</option>
              <option value="1.5">1.5 Horas</option>
              <option value="2">2 Horas</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Hora de inicio: {format(startTime, 'p', { locale: es })} • Hora de fin: {format(endTime, 'p', { locale: es })} {court.pricePerHour > 0 && <span> • <strong>Total: €{price.toFixed(2)}</strong></span>}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <AlignLeft size={16} /> Notas (Opcional)
            </label>
            <textarea
              {...register('notes')}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="¿Alguna petición especial?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Confirmar Reserva'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
