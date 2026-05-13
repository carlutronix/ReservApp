import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parse, addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Clock, Calendar, AlignLeft } from 'lucide-react';
import api from '../api/client';

interface Reservation {
    id: string;
    court: { id?: string; name: string; pricePerHour?: number };
    startTime: string;
    endTime: string;
    notes?: string;
    totalPrice?: string;
}

interface EditReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation;
    onSuccess: () => void;
    isAdmin?: boolean;
}

const editReservationSchema = z.object({
    date: z.string().min(1, 'La fecha es obligatoria'),
    time: z.string().min(1, 'La hora es obligatoria'),
    duration: z.string().min(1, 'La duración es obligatoria'),
    notes: z.string().optional(),
});

type EditReservationFormData = z.infer<typeof editReservationSchema>;

export default function EditReservationModal({ isOpen, onClose, reservation, onSuccess, isAdmin }: EditReservationModalProps) {
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookedReservations, setBookedReservations] = useState<any[]>([]);
    const [maintenances, setMaintenances] = useState<any[]>([]);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EditReservationFormData>({
        resolver: zodResolver(editReservationSchema),
    });

    useEffect(() => {
        if (reservation && isOpen) {
            const start = new Date(reservation.startTime);
            const end = new Date(reservation.endTime);

            const durationHours = differenceInMinutes(end, start) / 60;

            reset({
                date: format(start, 'yyyy-MM-dd'),
                time: format(start, 'HH:mm'),
                duration: durationHours.toString(),
                notes: reservation.notes || '',
            });
            setError('');
        }
    }, [reservation, isOpen, reset]);

    const durationStr = watch('duration');
    const selectedDate = watch('date');
    const selectedTime = watch('time');

    useEffect(() => {
        if (!selectedDate || !isOpen) return;

        const fetchAvailability = async () => {
            try {
                const searchDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
                const [resReservations, resMaintenances] = await Promise.all([
                    api.get('/reservations', {
                        params: { date: searchDate.toISOString() }
                    }),
                    api.get('/maintenances', {
                        params: { date: searchDate.toISOString() }
                    })
                ]);
                setBookedReservations(resReservations.data);
                setMaintenances(resMaintenances.data);
            } catch (err) {
                console.error("Error fetching availability", err);
            }
        };

        fetchAvailability();
    }, [selectedDate, isOpen]);

    const isReserved = (timeStr: string) => {
        if (!selectedDate) return false;

        // Use the current value of the form for the selected duration
        const duration = parseFloat(durationStr || "1");

        const start = parse(`${selectedDate} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());

        // This is the midpoint check or an interval check, but we are checking standard 1 hour slots here.
        // Actually the prompt wants the start time selector to block out times.
        // Let's check if the specific `start` time is inside any existing reservation or maintenance.
        const courtId = reservation.court.id || (reservation as any).courtId;

        // Use the backend's overlap approach: any existing res that overlaps with [start, start + duration]
        // But for simply disabling a start time option, let's just check if that 1-hour slot intersects.
        // Even simpler: just check if the explicit `start` time falls inside a reservation.
        const end = addMinutes(start, duration * 60);

        const reserved = bookedReservations.some((res: any) => {
            // Include only reservations on this court, exclude the current reservation we are editing
            if (res.courtId !== courtId || res.status === 'CANCELLED' || res.id === reservation.id) return false;

            const rStart = parseISO(res.startTime);
            const rEnd = parseISO(res.endTime);

            // Check overlapping logic: Is there any intersection between [start, end] and [rStart, rEnd]?
            // start < rEnd && end > rStart
            return (start < rEnd && end > rStart);
        });

        if (reserved) return true;

        const maintained = maintenances.some((m: any) => {
            if (m.courtId !== courtId) return false;
            const mStart = parseISO(m.startTime);
            const mEnd = parseISO(m.endTime);
            return (start < mEnd && end > mStart);
        });

        return maintained;
    };

    let price = 0;
    let newEndTimeStr = '';

    if (reservation.court.pricePerHour !== undefined && durationStr) {
        price = Number(durationStr) * reservation.court.pricePerHour;
    } else if (reservation.totalPrice) {
        // Fallback if pricePerHour is not available
        const originalDuration = differenceInMinutes(new Date(reservation.endTime), new Date(reservation.startTime)) / 60;
        const hourlyRate = Number(reservation.totalPrice) / originalDuration;
        price = Number(durationStr) * hourlyRate;
    }

    if (selectedDate && selectedTime && durationStr) {
        const start = parse(`${selectedDate} ${selectedTime}`, 'yyyy-MM-dd HH:mm', new Date());
        const end = addMinutes(start, Number(durationStr) * 60);
        newEndTimeStr = format(end, 'HH:mm', { locale: es });
    }

    const onSubmit = async (data: EditReservationFormData) => {
        setIsSubmitting(true);
        setError('');

        try {
            const startDateTime = parse(`${data.date} ${data.time}`, 'yyyy-MM-dd HH:mm', new Date());

            if (startDateTime < new Date() && !isAdmin) {
                setError('No puedes reprogramar la reserva para una fecha pasada.');
                setIsSubmitting(false);
                return;
            }

            const endDateTime = addMinutes(startDateTime, Number(data.duration) * 60);

            await api.put(`/reservations/${reservation.id}`, {
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                notes: data.notes
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al modificar la reserva');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Editar Reserva</h3>
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

                    <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
                        <p className="font-semibold text-blue-900">{reservation.court.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar size={16} /> Fecha
                            </label>
                            <input
                                type="date"
                                {...register('date')}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Clock size={16} /> Hora Inicio
                            </label>
                            <select
                                {...register('time')}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {Array.from({ length: 29 }, (_, i) => {
                                    const hour = 8 + Math.floor(i / 2);
                                    const minutes = (i % 2) === 0 ? '00' : '30';
                                    const timeString = `${hour.toString().padStart(2, '0')}:${minutes}`;

                                    const disabled = isReserved(timeString);

                                    return (
                                        <option
                                            key={timeString}
                                            value={timeString}
                                            disabled={disabled}
                                            className={disabled ? 'text-gray-400 bg-gray-100' : ''}
                                        >
                                            {timeString} {disabled ? '(Ocupado)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
                        </div>
                    </div>

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
                            Hora de fin estimada: {newEndTimeStr} • Total aprox: €{price.toFixed(2)}
                        </p>
                    </div>

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
                                'Guardar Cambios'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
