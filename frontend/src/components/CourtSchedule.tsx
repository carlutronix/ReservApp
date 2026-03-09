import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader } from 'lucide-react';
import api from '../api/client';
import ReservationModal from './ReservationModal';

interface Court {
  id: string;
  name: string;
  type: string;
  surface: string;
  pricePerHour: number;
}

interface Reservation {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface CourtScheduleProps {
  onReservationCreated?: () => void;
  sport?: string;
  refreshTrigger?: number;
}

export default function CourtSchedule({ onReservationCreated, sport, refreshTrigger = 0 }: CourtScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ court: Court; time: Date } | null>(null);

  // Time slots: 08:00 to 22:00
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setHours(8 + i, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate, sport, refreshTrigger]);

  const [maintenances, setMaintenances] = useState<any[]>([]); // Add state for maintenances

  // ... (inside fetchData)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCourts, resReservations, resMaintenances] = await Promise.all([
        api.get('/courts', { params: { sport } }),
        api.get('/reservations', {
          params: { date: selectedDate.toISOString() }
        }),
        api.get('/maintenances', {
          params: { date: selectedDate.toISOString() }
        })
      ]);
      setCourts(resCourts.data);
      setReservations(resReservations.data);
      setMaintenances(resMaintenances.data);
    } catch (error) {
      console.error('Error al cargar horarios', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (court: Court, time: Date) => {
    // Check if slot is already passed (if today)
    if (isSameDay(selectedDate, new Date()) && time < new Date()) {
      alert("No se pueden reservar horas pasadas.");
      return;
    }

    // Check if already reserved
    if (isReserved(court.id, time)) return;

    setSelectedSlot({ court, time });
    setIsModalOpen(true);
  };

  const isReserved = (courtId: string, time: Date) => {
    // Check reservations
    const reserved = reservations.some(res => {
      if (res.courtId !== courtId || res.status === 'CANCELLED') return false;
      const start = parseISO(res.startTime);
      const end = parseISO(res.endTime);
      return (time >= start && time < end);
    });

    if (reserved) return true;

    // Check maintenances
    const maintained = maintenances.some(m => {
      if (m.courtId !== courtId) return false;
      const start = parseISO(m.startTime);
      const end = parseISO(m.endTime);
      return (time >= start && time < end);
    });

    return maintained;
  };

  const handleReservationSuccess = async () => {
    await fetchData();
    if (onReservationCreated) onReservationCreated();
  };

  const changeDate = (days: number) => {
    setSelectedDate(curr => addDays(curr, days));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      {/* Header with Date Picker */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" />
          Horario de Pistas
        </h2>

        <div className="flex items-center gap-4 relative">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors">
            <ChevronLeft />
          </button>

          <div className="relative group cursor-pointer">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="flex items-center gap-2 py-1 px-3 rounded hover:bg-gray-200 transition-colors">
              <span className="font-semibold text-lg w-40 text-center capitalize select-none text-gray-700">
                {format(selectedDate, 'EEE, d MMM', { locale: es })}
              </span>
              <CalendarIcon size={16} className="text-gray-400" />
            </div>
          </div>

          <button onClick={() => changeDate(1)} className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <div className="min-w-[800px]">
            {courts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-xl font-semibold">No hay pistas disponibles</p>
                <p>No se encontraron pistas para este deporte en este momento.</p>
              </div>
            ) : (
              <>
                {/* Header Row (Times) */}
                <div className="grid grid-cols-[150px_repeat(15,1fr)] gap-1 mb-2">
                  <div className="font-bold text-gray-500 p-2">Pista</div>
                  {timeSlots.map((time, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-gray-500">
                      {format(time, 'HH:mm')}
                    </div>
                  ))}
                </div>

                {/* Court Rows */}
                <div className="space-y-2">
                  {courts.map(court => (
                    <div key={court.id} className="grid grid-cols-[150px_repeat(15,1fr)] gap-1">
                      {/* Court Name Column */}
                      <div className="p-3 bg-gray-100 rounded-l flex flex-col justify-center">
                        <span className="font-bold text-sm text-gray-800">{court.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{court.type === 'Indoor' ? 'Interior' : 'Exterior'}</span>
                      </div>

                      {/* Time Slots */}
                      {timeSlots.map((time, i) => {
                        const reserved = isReserved(court.id, time);
                        const isPast = isSameDay(selectedDate, new Date()) && time < new Date();

                        return (
                          <button
                            key={i}
                            onClick={() => handleSlotClick(court, time)}
                            disabled={reserved || isPast}
                            className={`
                          h-16 rounded transition-all border
                          ${reserved
                                ? 'bg-red-100 border-red-200 cursor-not-allowed'
                                : isPast
                                  ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                  : 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer hover:shadow-sm'
                              }
                        `}
                            title={reserved ? 'Reservado' : isPast ? 'Pasado' : 'Disponible'}
                          >
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedSlot && (
        <ReservationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          court={selectedSlot.court}
          startTime={selectedSlot.time}
          onSuccess={handleReservationSuccess}
        />
      )}
    </div>
  );
}
