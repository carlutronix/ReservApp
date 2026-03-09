import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Home, User } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, logout, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">ReservApp</h1>
        <nav className="space-y-4">
          <Link to="/dashboard" className="flex items-center space-x-2 p-2 hover:bg-slate-700 rounded">
            <Home size={20} />
            <span>Inicio</span>
          </Link>
          <Link to="/reservations" className="flex items-center space-x-2 p-2 hover:bg-slate-700 rounded">
            <Calendar size={20} />
            <span>Mis Reservas</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="flex items-center space-x-2 p-2 hover:bg-slate-700 rounded text-yellow-400">
              <User size={20} />
              <span>Panel de Admin</span>
            </Link>
          )}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-4">
          <Link to="/profile" className="flex items-center space-x-2 hover:bg-slate-700 p-2 rounded transition-colors group cursor-pointer w-auto">
            <div className="bg-slate-700 p-2 rounded-full group-hover:bg-slate-600 transition-colors">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">Ver Perfil</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center space-x-2 p-2 px-4 hover:bg-red-600 rounded-lg bg-red-500 transition-colors text-sm shadow-md w-auto"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
