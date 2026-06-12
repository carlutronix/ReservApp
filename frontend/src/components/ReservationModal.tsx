import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Confirmar Reserva</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100/60">
              {error}
            </div>
          )}

          {/* Court Info */}
          <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-4 rounded-xl border border-indigo-100/55 mb-4 shadow-sm">
            <p className="font-extrabold text-indigo-900 text-base">{court.name}</p>
            <p className="text-xs font-semibold text-indigo-700 mt-0.5 capitalize">Pista {court.type}</p>
            <p className="text-xs font-medium text-slate-600 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              {format(startTime, 'PPPP', { locale: es })} a las {format(startTime, 'p', { locale: es })}
            </p>
            {court.pricePerHour > 0 && (
              <div className="inline-flex bg-indigo-50 text-indigo-600 border border-indigo-100/80 text-[10px] font-bold px-2.5 py-0.5 rounded-lg mt-3">
                €{court.pricePerHour}/hora
              </div>
            )}
          </div>

          {/* User Info (Read only) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <User size={14} className="text-slate-400" /> Usuario
            </label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full bg-slate-100/60 border border-slate-200/50 rounded-xl px-3.5 py-2.5 text-slate-500 text-sm font-medium focus:outline-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Clock size={14} className="text-slate-400" /> Duración
            </label>
            <select
              {...register('duration')}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="0.5">30 Minutos</option>
              <option value="1">1 Hora</option>
              <option value="1.5">1.5 Horas</option>
              <option value="2">2 Horas</option>
            </select>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Inicio: <span className="text-slate-700 font-bold">{format(startTime, 'p', { locale: es })}</span> • Fin: <span className="text-slate-700 font-bold">{format(endTime, 'p', { locale: es })}</span> {court.pricePerHour > 0 && <span> • <strong className="text-indigo-600 font-extrabold bg-indigo-50/50 px-1.5 py-0.5 rounded">Total: €{price.toFixed(2)}</strong></span>}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <AlignLeft size={14} className="text-slate-400" /> Notas (Opcional)
            </label>
            <textarea
              {...register('notes')}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              rows={2}
              placeholder="¿Alguna petición especial?"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 hover:border-slate-350 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 flex justify-center items-center text-sm font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
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
    </div>,
    document.body
  );
}
