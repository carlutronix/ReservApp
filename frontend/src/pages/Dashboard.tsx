import { useState, useEffect } from 'react';
import CourtSchedule from '../components/CourtSchedule';
import MyReservationsList from '../components/MyReservationsList';
import api from '../api/client';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, XCircle } from 'lucide-react';

export default function Dashboard() {
  const location = useLocation();
  const lastLogin = location.state?.lastLogin;
  const [showWelcome, setShowWelcome] = useState(!!lastLogin);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);
  const [selectedSport, setSelectedSport] = useState('Pádel');
  const [availableSports, setAvailableSports] = useState<string[]>([]);

  useEffect(() => {
    // Fetch unique sports based on created courts
    const fetchSports = async () => {
      try {
        const res = await api.get('/courts');
        const sports = Array.from(new Set(res.data.map((c: any) => c.sport))) as string[];
        if (sports.length > 0) {
          // Sort sports: 'Pádel' first, 'Tenis' second, then the rest alphabetically
          sports.sort((a, b) => {
            if (a === 'Pádel') return -1;
            if (b === 'Pádel') return 1;
            if (a === 'Tenis') return -1;
            if (b === 'Tenis') return 1;
            return a.localeCompare(b);
          });
          setAvailableSports(sports);
          if (!sports.includes(selectedSport)) {
            setSelectedSport(sports[0]); // fallback to first available sport if Pádel is removed
          }
        }
      } catch (err) {
        console.error('Error fetching courts for sports', err);
      }
    };
    fetchSports();
  }, [refreshTrigger]); // Keep updated if admin adds a new court with a new sport

  const handleReservationUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full lg:h-full relative">
      {showWelcome && lastLogin && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-white/95 backdrop-blur-md border border-indigo-100 shadow-[0_10px_30px_rgba(99,102,241,0.12)] rounded-2xl p-4 flex items-center gap-4 max-w-sm">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-md text-white shrink-0">
              <CalendarIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">¡Bienvenido de nuevo!</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Última sesión: {format(new Date(lastLogin), "d/MM/yy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors ml-1">
              <XCircle size={18} />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inicio</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Gestiona y planifica tus reservas de pistas</p>
        </div>

        {/* Sport Selector */}
        {availableSports.length > 0 && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full shadow-inner">
            {availableSports.map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap active:scale-[0.98] ${selectedSport === sport
                  ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100 border border-slate-200/30'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                  }`}
              >
                {sport}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:overflow-hidden overflow-y-auto pb-4">
        {/* Main Schedule - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2 overflow-hidden h-full">
          <CourtSchedule
            onReservationCreated={handleReservationUpdated}
            sport={selectedSport}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* My Reservations - Takes 1/3 width on large screens */}
        <div className="lg:overflow-hidden h-full">
          <MyReservationsList
            refreshTrigger={refreshTrigger}
            onReservationCancelled={handleReservationUpdated}
            isDashboardMode={true}
          />
        </div>
      </div>
    </div>
  );
}
