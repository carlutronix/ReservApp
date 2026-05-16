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

  const handleAddToGoogleCalendar = (res: Reservation) => {
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

      const title = encodeURIComponent(`Reserva pista - ${res.court.name}`);
      const details = encodeURIComponent(`Reserva creada en ReservApp.${res.notes ? '\\nNotas: ' + res.notes : ''}`);
      const location = encodeURIComponent(res.court.name);

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startString}/${endString}&details=${details}&location=${location}`;

      window.open(googleCalendarUrl, '_blank');
    } catch (error) {
      console.error('Error opening Google Calendar', error);
      alert('Error al abrir Google Calendar');
    }
  };

  const handleEditClick = (res: Reservation) => {
    setEditingReservation(res);
    setIsEditModalOpen(true);
  };

  const upcomingReservations = reservations.filter(
    res => isFuture(new Date(res.startTime)) && res.status !== 'CANCELLED'
  );

  const historyReservations = reservations.filter(
    res => !isFuture(new Date(res.startTime)) || res.status === 'CANCELLED'
  );

  const displayedReservations = activeTab === 'upcoming' ? upcomingReservations : historyReservations;

  if (loading) return <div className="text-center p-4">Cargando reservas...</div>;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Reservas</h2>
        <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'upcoming' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'history' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Historial
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {displayedReservations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto mb-2 opacity-50" size={40} />
            <p>No hay reservas {activeTab === 'upcoming' ? 'próximas' : 'en el historial'}.</p>
          </div>
        ) : (
          displayedReservations.map((res) => (
            <div key={res.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{res.court.name}</h4>
                  <div className="flex items-center text-gray-600 text-sm mt-1">
                    <Calendar size={14} className="mr-1" />
                    {format(new Date(res.startTime), 'PPP', { locale: es })}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm mt-1">
                    <Clock size={14} className="mr-1" />
                    {format(new Date(res.startTime), 'p', { locale: es })} - {format(new Date(res.endTime), 'p', { locale: es })}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  res.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  res.attendanceStatus === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {res.status === 'CANCELLED' ? 'CANCELADA' : 
                   res.attendanceStatus === 'CHECKED_IN' ? 'CONFIRMADA' : 
                   'RESERVADA'}
                </div>
              </div>

              {res.notes && (
                <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                  <span className="font-semibold">Nota:</span> {res.notes}
                </div>
              )}

              <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="flex items-center font-semibold text-gray-700">
                  {Number(res.totalPrice) > 0 && (
                    <>
                      <Euro size={16} />
                      {Number(res.totalPrice).toFixed(2)}
                    </>
                  )}
                </div>

                {activeTab === 'upcoming' && res.status !== 'CANCELLED' && !isDashboardMode && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditClick(res)}
                      className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                    >
                      <Edit size={16} className="mr-1" /> Editar
                    </button>
                    <button
                      onClick={() => handleAddToGoogleCalendar(res)}
                      className="flex items-center text-gray-600 hover:text-gray-800 border border-gray-300 px-2 py-1 rounded text-sm font-medium transition-colors bg-white hover:bg-gray-50"
                    >
                      <CalendarPlus size={16} className="mr-1" /> Google Calendar
                    </button>
                    <button
                      onClick={() => handleCancel(res.id)}
                      className="flex items-center text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                    >
                      <XCircle size={16} className="mr-1" /> Cancelar
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
