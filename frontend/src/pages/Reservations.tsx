import MyReservationsList from '../components/MyReservationsList';

export default function Reservations() {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Mis Reservas</h2>
      <div className="flex-1 overflow-hidden">
        <MyReservationsList />
      </div>
    </div>
  );
}
