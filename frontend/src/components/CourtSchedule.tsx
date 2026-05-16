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
  isActive: boolean;
  openTime?: string;
  closeTime?: string;
  activeDays?: number[];
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

  // Dynamic Time slots calculation based on existing visible courts
  let START_HOUR = 8;
  let END_HOUR = 22;

  if (courts.length > 0) {
    START_HOUR = Math.min(...courts.map(c => parseInt(c.openTime?.split(':')[0] || '8')));
    END_HOUR = Math.max(...courts.map(c => parseInt(c.closeTime?.split(':')[0] || '22')));
    if (START_HOUR > END_HOUR) {
      START_HOUR = 8;
      END_HOUR = 22;
    }
  }

  const totalSlots = Math.max(1, END_HOUR - START_HOUR);
  const timeSlots = Array.from({ length: totalSlots }, (_, i) => {
    const d = new Date(selectedDate);
    d.setHours(START_HOUR + i, 0, 0, 0);
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

    // Check if already reserved for the requested start time (30 min window minimum)
    if (checkIntervalStatus(court.id, time, new Date(time.getTime() + 30 * 60000))) return;

    setSelectedSlot({ court, time });
    setIsModalOpen(true);
  };

  const getIntervalStatus = (courtId: string, start: Date, end: Date): 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' => {
    // 1. Check maintenances first (admin blocks take priority)
    const maintained = maintenances.some(m => {
      if (m.courtId !== courtId) return false;
      const mStart = parseISO(m.startTime);
      const mEnd = parseISO(m.endTime);
      return (start < mEnd && end > mStart);
    });

    if (maintained) return 'MAINTENANCE';

    // 2. Check reservations
    const reserved = reservations.some(res => {
      if (res.courtId !== courtId || res.status === 'CANCELLED') return false;
      const resStart = parseISO(res.startTime);
      const resEnd = parseISO(res.endTime);
      return (start < resEnd && end > resStart); // Intersection check
    });

    if (reserved) return 'RESERVED';

    return 'AVAILABLE';
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
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" />
          Horario de Pistas
        </h2>

        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => changeDate(-1)}
            disabled={isSameDay(selectedDate, new Date()) || selectedDate < new Date()}
            className={`p-1 rounded transition-colors ${isSameDay(selectedDate, new Date()) || selectedDate < new Date()
              ? 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-gray-200 text-gray-600'
              }`}
          >
            <ChevronLeft />
          </button>

          <div className="relative group cursor-pointer">
            <input
              type="date"
              min={format(new Date(), 'yyyy-MM-dd')}
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
      <div className="overflow-x-auto flex-1 p-4 pb-6 custom-scrollbar">
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
                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `120px repeat(${timeSlots.length}, minmax(35px, 1fr))` }}>
                  <div className="font-bold text-gray-500 p-2">Pista</div>
                  {timeSlots.map((time, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-gray-500 whitespace-nowrap overflow-hidden">
                      {format(time, 'HH:mm')}
                    </div>
                  ))}
                </div>

                {/* Court Rows */}
                <div className="space-y-2">
                  {courts.map(court => (
                    <div key={court.id} className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${timeSlots.length}, minmax(35px, 1fr))` }}>
                      {/* Court Name Column */}
                      <div className="p-3 bg-gray-100 rounded-l flex flex-col justify-center">
                        <span className="font-bold text-sm text-gray-800">{court.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{court.type}</span>
                      </div>

                      {/* Time Slots */}
                      {timeSlots.map((time, i) => {
                        const firstHalfStart = time;
                        const firstHalfEnd = new Date(time.getTime() + 30 * 60000);
                        const secondHalfStart = firstHalfEnd;
                        const secondHalfEnd = new Date(time.getTime() + 60 * 60000);

                        const firstStatus = getIntervalStatus(court.id, firstHalfStart, firstHalfEnd);
                        const secondStatus = getIntervalStatus(court.id, secondHalfStart, secondHalfEnd);

                        const isPast = time < new Date();
                        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                        const dayOfWeek = selectedDate.getDay();
                        const isActiveDay = court.activeDays?.includes(dayOfWeek) ?? true;
                        const isWithinHours = timeStr >= (court.openTime || '08:00') && timeStr < (court.closeTime || '22:00');
                        const isOob = !isActiveDay || !isWithinHours;

                        let bgClass = '';
                        let statusTitle = 'Disponible';

                        if (!court.isActive) {
                          bgClass = 'bg-gray-300 border-gray-400 cursor-not-allowed opacity-80';
                          statusTitle = 'Pista Bloqueada';
                        } else if (isOob) {
                          bgClass = 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60 flex items-center justify-center';
                          statusTitle = 'Pista Cerrada';
                        } else if (isPast) {
                          bgClass = 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50';
                          statusTitle = 'Pasado';
                        } else {
                          // Complex status based on both halves
                          if (firstStatus === 'MAINTENANCE' || secondStatus === 'MAINTENANCE') {
                            bgClass = 'bg-yellow-100 border-yellow-200 cursor-not-allowed';
                            statusTitle = 'Mantenimiento / Bloqueo';
                          } else if (firstStatus === 'RESERVED' && secondStatus === 'RESERVED') {
                            bgClass = 'bg-red-100 border-red-200 cursor-not-allowed';
                            statusTitle = 'Reservado';
                          } else if (firstStatus === 'RESERVED') {
                            bgClass = 'bg-gradient-to-r from-red-100 from-50% to-green-50 to-50% border-green-200 cursor-pointer hover:shadow-sm';
                          } else if (secondStatus === 'RESERVED') {
                            bgClass = 'bg-gradient-to-r from-green-50 from-50% to-red-100 to-50% border-green-200 cursor-pointer hover:shadow-sm';
                          } else {
                            bgClass = 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer hover:shadow-sm';
                          }
                        }

                        const slotToBook = (firstStatus !== 'AVAILABLE' && secondStatus === 'AVAILABLE') ? secondHalfStart : firstHalfStart;
                        const isFullyBooked = firstStatus !== 'AVAILABLE' && secondStatus !== 'AVAILABLE';

                        return (
                          <button
                            key={i}
                            onClick={() => handleSlotClick(court, slotToBook)}
                            disabled={isFullyBooked || isPast || !court.isActive || isOob}
                            className={`w-full h-full min-h-[64px] rounded transition-all border ${bgClass}`}
                            title={statusTitle}
                          >
                            {isOob && !(!court.isActive) && <span className="text-[10px] text-gray-400 font-medium">Cerrado</span>}
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
