import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Home, User, Menu, X } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-slate-800 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <h1 className="text-xl font-bold">ReservApp</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 hover:bg-slate-700 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar background overlay on mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-40 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-slate-800 text-white p-6 shadow-2xl md:shadow-none flex flex-col h-full md:h-screen
      `}>
        <h1 className="text-2xl font-bold mb-8 hidden md:block">ReservApp</h1>

        <nav className="space-y-4 flex-1">
          <Link to="/dashboard" onClick={handleLinkClick} className={`flex items-center space-x-2 p-2 rounded transition-colors font-medium ${location.pathname === '/dashboard' ? 'bg-slate-700' : 'hover:bg-slate-700'}`}>
            <Home size={20} />
            <span>Inicio</span>
          </Link>
          <Link to="/reservations" onClick={handleLinkClick} className={`flex items-center space-x-2 p-2 rounded transition-colors font-medium ${location.pathname === '/reservations' ? 'bg-slate-700' : 'hover:bg-slate-700'}`}>
            <Calendar size={20} />
            <span>Mis Reservas</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" onClick={handleLinkClick} className={`flex items-center space-x-2 p-2 rounded transition-colors font-medium text-yellow-500 ${location.pathname === '/admin' ? 'bg-slate-700' : 'hover:bg-slate-700'}`}>
              <User size={20} />
              <span>Panel de Admin</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-700 flex flex-col gap-4">
          <Link to="/profile" onClick={handleLinkClick} className="flex items-center space-x-3 hover:bg-slate-700 p-2 rounded transition-colors group cursor-pointer">
            <div className="bg-slate-700 p-2 rounded-full group-hover:bg-slate-600 transition-colors shrink-0">
              <User size={20} className="text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate w-full" title={user?.name}>{user?.name}</p>
              <p className="text-xs text-slate-400">Ver Perfil</p>
            </div>
          </Link>

          <button
            onClick={() => {
              handleLinkClick();
              logout();
            }}
            className="flex items-center justify-center space-x-2 p-3 mt-2 hover:bg-red-600 rounded-lg bg-red-500 transition-colors text-sm font-bold shadow-md w-full"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden flex flex-col min-h-[calc(100vh-60px)] md:min-h-screen relative">
        <Outlet />
      </main>
    </div>
  );
}
