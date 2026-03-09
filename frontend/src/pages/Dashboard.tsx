import { useState } from 'react';
import CourtSchedule from '../components/CourtSchedule';
import MyReservationsList from '../components/MyReservationsList';

// Simple icons mapping or just text for now
const SPORTS = [
  { id: 'Padel', label: 'Pádel' },
  { id: 'Tennis', label: 'Tenis' },
  { id: 'Basketball', label: 'Baloncesto' },
  { id: 'Football', label: 'Fútbol' },
  { id: 'Volleyball', label: 'Voleibol' },
];

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSport, setSelectedSport] = useState('Padel');

  const handleReservationUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Inicio</h2>

        {/* Sport Selector */}
        <div className="flex bg-white p-1 rounded-lg shadow-sm border overflow-x-auto max-w-full">
          {SPORTS.map(sport => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${selectedSport === sport.id
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Main Schedule - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2 overflow-hidden h-full">
          <CourtSchedule
            onReservationCreated={handleReservationUpdated}
            sport={selectedSport}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* My Reservations - Takes 1/3 width on large screens */}
        <div className="overflow-hidden h-full">
          <MyReservationsList
            refreshTrigger={refreshTrigger}
            onReservationCancelled={handleReservationUpdated}
          />
        </div>
      </div>
    </div>
  );
}
