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
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-l-4 border-indigo-500 shadow-lg rounded-r-lg p-4 flex items-center gap-3 max-w-sm">
            <div className="bg-indigo-100 p-2 rounded-full">
              <CalendarIcon className="text-indigo-600" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">¡Bienvenido de nuevo!</p>
              <p className="text-xs text-gray-500">
                Última sesión: {format(new Date(lastLogin), "d/MM/yy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-gray-400 hover:text-gray-600 ml-2">
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Inicio</h2>

        {/* Sport Selector */}
        {availableSports.length > 0 && (
          <div className="flex bg-white p-1 rounded-lg shadow-sm border overflow-x-auto max-w-full">
            {availableSports.map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${selectedSport === sport
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
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
