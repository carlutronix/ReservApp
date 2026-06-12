import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, isToday, startOfDay } from 'date-fns';
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

  // Custom Datepicker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const handleOpenDatePicker = () => {
    setViewDate(selectedDate);
    setIsDatePickerOpen(true);
  };

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
    if (getIntervalStatus(court.id, time, new Date(time.getTime() + 30 * 60000)) !== 'AVAILABLE') return;

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
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-xl shadow-slate-100/40 overflow-hidden flex flex-col h-full">
      {/* Header with Date Picker */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/40 gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarIcon size={18} />
          </div>
          Horario de Pistas
        </h2>

        <div className="flex items-center bg-slate-100 border border-slate-200/40 p-1 rounded-xl shadow-inner select-none self-end sm:self-auto relative">
          <button
            onClick={() => changeDate(-1)}
            disabled={isSameDay(selectedDate, new Date()) || selectedDate < new Date()}
            className={`p-2 rounded-lg transition-all duration-200 active:scale-90 ${isSameDay(selectedDate, new Date()) || selectedDate < new Date()
              ? 'text-slate-400 cursor-not-allowed'
              : 'hover:bg-white hover:text-indigo-600 hover:shadow-sm text-slate-600'
              }`}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative">
            <button
              onClick={handleOpenDatePicker}
              className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200"
            >
              <span className="font-bold text-sm w-36 text-center capitalize text-slate-700">
                {format(selectedDate, 'EEE, d MMM', { locale: es })}
              </span>
              <CalendarIcon size={14} className="text-slate-400" />
            </button>

            {isDatePickerOpen && (
              <>
                {/* Backdrop overlay */}
                <div 
                  className="fixed inset-0 z-20 cursor-default" 
                  onClick={() => setIsDatePickerOpen(false)}
                />
                
                {/* Custom Calendar Dropdown */}
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-200/40 p-4.5 z-30 w-[290px] select-none animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Calendar Header */}
                  <div className="flex justify-between items-center mb-3">
                    <button
                      type="button"
                      onClick={() => setViewDate(prev => subMonths(prev, 1))}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="font-extrabold text-sm text-slate-800 capitalize">
                      {format(viewDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewDate(prev => addMonths(prev, 1))}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Weekdays */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase mb-2">
                    <span>L</span>
                    <span>M</span>
                    <span>X</span>
                    <span>J</span>
                    <span>V</span>
                    <span>S</span>
                    <span>D</span>
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const startMonth = startOfMonth(viewDate);
                      const endMonth = endOfMonth(viewDate);
                      const startGrid = startOfWeek(startMonth, { weekStartsOn: 1 });
                      const endGrid = endOfWeek(endMonth, { weekStartsOn: 1 });
                      
                      const days = [];
                      let currentDay = startGrid;
                      while (currentDay <= endGrid) {
                        days.push(currentDay);
                        currentDay = addDays(currentDay, 1);
                      }

                      const todayStart = startOfDay(new Date());

                      return days.map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isSel = isSameDay(day, selectedDate);
                        const isTod = isToday(day);
                        const isPast = day < todayStart;

                        let btnClass = 'text-slate-700 hover:bg-slate-100';
                        if (!isCurrentMonth) {
                          btnClass = 'text-slate-400 hover:bg-slate-50';
                        }
                        if (isPast) {
                          btnClass = 'text-slate-200 cursor-not-allowed';
                        }
                        if (isTod && !isSel) {
                          btnClass = 'text-indigo-600 font-bold border border-indigo-200 bg-indigo-50/20';
                        }
                        if (isSel) {
                          btnClass = 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/15';
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isPast}
                            onClick={() => {
                              setSelectedDate(day);
                              setIsDatePickerOpen(false);
                            }}
                            className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all ${btnClass}`}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => changeDate(1)} 
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 hover:text-indigo-600 hover:shadow-sm active:scale-90 transition-all duration-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-5 pb-6 custom-scrollbar overflow-x-auto md:overflow-x-visible">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-indigo-600" size={36} />
          </div>
        ) : (
          <div>
            {courts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <CalendarIcon className="opacity-20 mb-3" size={48} />
                <p className="text-lg font-bold">No hay pistas disponibles</p>
                <p className="text-sm">No se encontraron pistas para este deporte en este momento.</p>
              </div>
            ) : (
              <>
                {/* Desktop Layout (hidden md:block) */}
                <div className="hidden md:block min-w-[850px]">
                  {/* Header Row (Times) */}
                  <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: `130px repeat(${timeSlots.length}, minmax(35px, 1fr))` }}>
                    <div className="font-extrabold text-[11px] tracking-wider uppercase text-slate-400 p-2 flex items-center">Pistas</div>
                    {timeSlots.map((time, i) => (
                      <div key={i} className="text-center text-xs font-bold text-slate-500 bg-slate-100/60 border border-slate-200/20 py-2 rounded-lg shadow-sm">
                        {format(time, 'HH:mm')}
                      </div>
                    ))}
                  </div>

                  {/* Court Rows */}
                  <div className="space-y-3">
                    {courts.map(court => (
                      <div key={court.id} className="grid gap-1.5" style={{ gridTemplateColumns: `130px repeat(${timeSlots.length}, minmax(35px, 1fr))` }}>
                        {/* Court Name Column */}
                        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col justify-center shadow-sm">
                          <span className="font-extrabold text-sm text-slate-800 truncate" title={court.name}>{court.name}</span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5 truncate capitalize">{court.surface || court.type}</span>
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
                            bgClass = 'bg-slate-200/70 border-slate-300 cursor-not-allowed opacity-80';
                            statusTitle = 'Bloqueada por mantenimiento';
                          } else if (isOob) {
                            bgClass = 'bg-slate-100/40 border-slate-200/10 cursor-not-allowed opacity-60 flex items-center justify-center';
                            statusTitle = 'Pista Cerrada';
                          } else if (isPast) {
                            bgClass = 'bg-slate-100/40 border-slate-200/20 cursor-not-allowed opacity-50';
                            statusTitle = 'Pasado';
                          } else {
                            if (firstStatus === 'MAINTENANCE' || secondStatus === 'MAINTENANCE') {
                              bgClass = 'bg-amber-50/50 border-amber-200/50 cursor-not-allowed text-amber-700';
                              statusTitle = 'Mantenimiento / Bloqueo';
                            } else if (firstStatus === 'RESERVED' && secondStatus === 'RESERVED') {
                              bgClass = 'bg-rose-50/50 border-rose-200/30 cursor-not-allowed text-rose-700';
                              statusTitle = 'Reservado';
                            } else if (firstStatus === 'RESERVED') {
                              bgClass = 'bg-gradient-to-r from-rose-50/50 from-50% to-emerald-50/45 to-50% border-emerald-100 hover:border-emerald-200 hover:shadow-sm cursor-pointer hover:scale-[1.02]';
                            } else if (secondStatus === 'RESERVED') {
                              bgClass = 'bg-gradient-to-r from-emerald-50/45 from-50% to-rose-50/50 to-50% border-emerald-100 hover:border-emerald-200 hover:shadow-sm cursor-pointer hover:scale-[1.02]';
                            } else {
                              bgClass = 'bg-emerald-50/40 border-emerald-100/70 hover:bg-emerald-50 text-emerald-800 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/30 cursor-pointer hover:scale-[1.02]';
                            }
                          }

                          const slotToBook = (firstStatus !== 'AVAILABLE' && secondStatus === 'AVAILABLE') ? secondHalfStart : firstHalfStart;
                          const isFullyBooked = firstStatus !== 'AVAILABLE' && secondStatus !== 'AVAILABLE';

                          return (
                            <button
                              key={i}
                              onClick={() => handleSlotClick(court, slotToBook)}
                              disabled={isFullyBooked || isPast || !court.isActive || isOob}
                              className={`w-full h-full min-h-[60px] rounded-xl transition-all duration-200 border flex flex-col items-center justify-center font-bold text-xs ${bgClass}`}
                              title={statusTitle}
                            >
                              {isOob && !(!court.isActive) && <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Cerrado</span>}
                              {!isOob && court.isActive && firstStatus === 'RESERVED' && secondStatus === 'RESERVED' && (
                                <span className="text-[9px] font-bold text-rose-500 tracking-wider uppercase">Ocupado</span>
                              )}
                              {!isOob && court.isActive && (firstStatus === 'MAINTENANCE' || secondStatus === 'MAINTENANCE') && (
                                <span className="text-[9px] font-bold text-amber-500 tracking-wider uppercase font-semibold">Bloqueo</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Layout (block md:hidden) - Vertical grid style */}
                <div className="block md:hidden space-y-6">
                  {courts.map(court => (
                    <div key={court.id} className="bg-slate-50/40 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                      {/* Court title */}
                      <div className="flex justify-between items-center pb-3.5 border-b border-slate-200/40">
                        <span className="font-extrabold text-sm text-slate-800">{court.name}</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/40 capitalize">
                          {court.surface || court.type}
                        </span>
                      </div>

                      {/* Hour grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
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
                            bgClass = 'bg-slate-200/70 border-slate-300 cursor-not-allowed opacity-80';
                            statusTitle = 'Bloqueada por mantenimiento';
                          } else if (isOob) {
                            bgClass = 'bg-slate-100/40 border-slate-200/10 cursor-not-allowed opacity-60 flex items-center justify-center';
                            statusTitle = 'Pista Cerrada';
                          } else if (isPast) {
                            bgClass = 'bg-slate-100/40 border-slate-200/20 cursor-not-allowed opacity-50';
                            statusTitle = 'Pasado';
                          } else {
                            if (firstStatus === 'MAINTENANCE' || secondStatus === 'MAINTENANCE') {
                              bgClass = 'bg-amber-50/50 border-amber-200/50 cursor-not-allowed text-amber-700';
                              statusTitle = 'Mantenimiento / Bloqueo';
                            } else if (firstStatus === 'RESERVED' && secondStatus === 'RESERVED') {
                              bgClass = 'bg-rose-50/50 border-rose-200/30 cursor-not-allowed text-rose-700';
                              statusTitle = 'Reservado';
                            } else if (firstStatus === 'RESERVED') {
                              bgClass = 'bg-gradient-to-r from-rose-50/50 from-50% to-emerald-50/45 to-50% border-emerald-100 hover:border-emerald-200 hover:shadow-sm cursor-pointer active:scale-95';
                            } else if (secondStatus === 'RESERVED') {
                              bgClass = 'bg-gradient-to-r from-emerald-50/45 from-50% to-rose-50/50 to-50% border-emerald-100 hover:border-emerald-200 hover:shadow-sm cursor-pointer active:scale-95';
                            } else {
                              bgClass = 'bg-emerald-50/40 border-emerald-100/70 hover:bg-emerald-50 text-emerald-800 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/30 cursor-pointer active:scale-95';
                            }
                          }

                          const slotToBook = (firstStatus !== 'AVAILABLE' && secondStatus === 'AVAILABLE') ? secondHalfStart : firstHalfStart;
                          const isFullyBooked = firstStatus !== 'AVAILABLE' && secondStatus !== 'AVAILABLE';

                          return (
                            <button
                              key={i}
                              onClick={() => handleSlotClick(court, slotToBook)}
                              disabled={isFullyBooked || isPast || !court.isActive || isOob}
                              className={`w-full py-2.5 rounded-xl transition-all duration-200 border flex flex-col items-center justify-center font-bold text-xs ${bgClass}`}
                              title={statusTitle}
                            >
                              <span className="text-xs font-extrabold">{format(time, 'HH:mm')}</span>
                              {isOob && !(!court.isActive) && (
                                <span className="text-[8px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">Cerrado</span>
                              )}
                              {!isOob && court.isActive && firstStatus === 'RESERVED' && secondStatus === 'RESERVED' && (
                                <span className="text-[8px] font-bold text-rose-500 tracking-wider uppercase mt-0.5">Ocupado</span>
                              )}
                              {!isOob && court.isActive && (firstStatus === 'MAINTENANCE' || secondStatus === 'MAINTENANCE') && (
                                <span className="text-[8px] font-bold text-amber-500 tracking-wider uppercase font-semibold mt-0.5">Bloqueo</span>
                              )}
                              {!isOob && court.isActive && firstStatus === 'AVAILABLE' && secondStatus === 'AVAILABLE' && !isPast && (
                                <span className="text-[8px] font-semibold text-emerald-600 tracking-wide uppercase mt-0.5">Libre</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
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
