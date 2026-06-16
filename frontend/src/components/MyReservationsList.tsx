import { useState, useEffect } from 'react';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Euro, XCircle, Edit, CalendarPlus } from 'lucide-react';
import api from '../api/client';
import EditReservationModal from './EditReservationModal';

interface Reservation {
  id: string;
  court: { name: string };
  startTime: string;
  endTime: string;
  status: string;
  attendanceStatus: string;
  totalPrice: string;
  notes?: string;
}

interface MyReservationsListProps {
  refreshTrigger?: number;
  onReservationCancelled?: () => void;
  isDashboardMode?: boolean;
}

export default function MyReservationsList({ refreshTrigger = 0, onReservationCancelled, isDashboardMode = false }: MyReservationsListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [refreshTrigger]);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/reservations', { params: { mine: true } });
      setReservations(res.data);
    } catch (error) {
      console.error('Error fetching reservations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return;
    try {
      await api.put(`/reservations/${id}/cancel`);

      // Update local state to reflect cancellation immediately
      setReservations(prev => prev.map(res =>
        res.id === id ? { ...res, status: 'CANCELLED' } : res
      ));

      if (onReservationCancelled) onReservationCancelled();

      if (onReservationCancelled) onReservationCancelled();

    } catch (error) {
      console.error('Error cancelling reservation', error);
    }
  };

  const handleAddToCalendar = (res: Reservation) => {
    try {
      const startDate = new Date(res.startTime);
      const endDate = new Date(res.endTime);
      
      const formatToUTCString = (date: Date) => {
        return date.getUTCFullYear() +
          String(date.getUTCMonth() + 1).padStart(2, '0') +
          String(date.getUTCDate()).padStart(2, '0') + 'T' +
          String(date.getUTCHours()).padStart(2, '0') +
          String(date.getUTCMinutes()).padStart(2, '0') +
          String(date.getUTCSeconds()).padStart(2, '0') + 'Z';
      };

      const startString = formatToUTCString(startDate);
      const endString = formatToUTCString(endDate);

      const title = `Reserva pista - ${res.court.name}`;
      const details = `Reserva creada en ReservApp.${res.notes ? '\\nNotas: ' + res.notes : ''}`;
      const location = res.court.name;

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ReservApp//ES',
        'BEGIN:VEVENT',
        `DTSTART:${startString}`,
        `DTEND:${endString}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${details}`,
        `LOCATION:${location}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `reserva-${res.court.name.replace(/\s+/g, '-')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error creating calendar file', error);
      alert('Error al crear el archivo del calendario');
    }
  };

  const handleEditClick = (res: Reservation) => {
    setEditingReservation(res);
    setIsEditModalOpen(true);
  };

  const upcomingReservations = reservations
    .filter(res => isFuture(new Date(res.startTime)) && res.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const historyReservations = reservations.filter(
    res => !isFuture(new Date(res.startTime)) || res.status === 'CANCELLED'
  );

  const displayedReservations = activeTab === 'upcoming' ? upcomingReservations : historyReservations;

  if (loading) return <div className="text-center p-4">Cargando reservas...</div>;

  return (    <div className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-xl shadow-slate-100/45 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/45 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Mis Reservas</h2>
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/30">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === 'upcoming' ? 'bg-white shadow text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === 'history' ? 'bg-white shadow text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Historial
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
        {displayedReservations.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Calendar className="mx-auto mb-3 opacity-20" size={44} />
            <p className="font-semibold text-sm">No hay reservas {activeTab === 'upcoming' ? 'próximas' : 'en el historial'}.</p>
          </div>
        ) : (
          displayedReservations.map((res) => (
            <div key={res.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-slate-100/50 hover:border-slate-350 transition-all duration-200 bg-white">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-extrabold text-[15px] text-slate-800">{res.court.name}</h4>
                  <div className="flex flex-col gap-1.5 mt-2.5">
                    <div className="flex items-center text-slate-500 text-xs font-semibold">
                      <Calendar size={13} className="mr-1.5 text-slate-400" />
                      {format(new Date(res.startTime), 'PPP', { locale: es })}
                    </div>
                    <div className="flex items-center text-slate-500 text-xs font-semibold">
                      <Clock size={13} className="mr-1.5 text-slate-400" />
                      {format(new Date(res.startTime), 'p', { locale: es })} - {format(new Date(res.endTime), 'p', { locale: es })}
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider shrink-0 ${res.status === 'CANCELLED'
                  ? 'bg-red-50 text-red-600 border border-red-100/50'
                  : res.attendanceStatus === 'CHECKED_IN'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                  }`}>
                  {res.status === 'CANCELLED' ? 'CANCELADA' :
                    res.attendanceStatus === 'CHECKED_IN' ? 'CONFIRMADA' :
                      'RESERVADA'}
                </div>
              </div>

              {res.notes && (
                <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/40">
                  <span className="font-bold text-slate-500 mr-1">Nota:</span> {res.notes}
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3.5 border-t border-slate-100">
                <div className="flex items-center font-extrabold text-[15px] text-slate-750">
                  {Number(res.totalPrice) > 0 ? (
                    <div className="flex items-center gap-0.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 border border-slate-200/30 text-xs">
                      <Euro size={12} className="text-slate-500" />
                      <span>{Number(res.totalPrice).toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-100/50 rounded-lg uppercase tracking-wide">Gratis</span>
                  )}
                </div>

                {activeTab === 'upcoming' && res.status !== 'CANCELLED' && !isDashboardMode && (
                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                    <button
                      onClick={() => handleEditClick(res)}
                      className="flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <Edit size={13} className="mr-1 text-slate-400" /> Editar
                    </button>
                    <button
                      onClick={() => handleAddToCalendar(res)}
                      className="flex items-center justify-center text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-white hover:bg-slate-50 cursor-pointer active:scale-95"
                    >
                      <CalendarPlus size={13} className="mr-1 text-slate-400" /> Calendar
                    </button>
                    <button
                      onClick={() => handleCancel(res.id)}
                      className="flex items-center justify-center text-red-600 hover:text-white hover:bg-red-500 border border-red-200/40 hover:border-red-500 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      <XCircle size={13} className="mr-1" /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editingReservation && (
        <EditReservationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingReservation(null);
          }}
          reservation={editingReservation}
          onSuccess={fetchReservations}
        />
      )}
    </div>
  );
}
