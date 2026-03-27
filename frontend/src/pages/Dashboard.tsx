import { useState, useEffect } from 'react';
import CourtSchedule from '../components/CourtSchedule';
import MyReservationsList from '../components/MyReservationsList';
import api from '../api/client';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSport, setSelectedSport] = useState('Pádel');
  const [availableSports, setAvailableSports] = useState<string[]>([]);

  useEffect(() => {
    // Fetch unique sports based on created courts
    const fetchSports = async () => {
      try {
        const res = await api.get('/courts');
        const sports = Array.from(new Set(res.data.map((c: any) => c.sport))) as string[];
        if (sports.length > 0) {
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
    <div className="flex flex-col h-full lg:h-full">
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
