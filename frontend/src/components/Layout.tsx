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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative selection:bg-indigo-500 selection:text-white">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -ml-2 hover:bg-slate-800 rounded-xl transition-colors">
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-xl font-bold tracking-tight text-white select-none">
              Reserv<span className="text-indigo-400">App</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar background overlay on mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-40 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-slate-900 text-white p-6 border-r border-slate-850 shadow-2xl md:shadow-none flex flex-col h-full md:h-screen
      `}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60 md:border-b-0 md:pb-0 md:mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-2xl font-bold tracking-tight text-white select-none">
              Reserv<span className="text-indigo-400">App</span>
            </span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -mr-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <Link 
            to="/dashboard" 
            onClick={handleLinkClick} 
            className={`flex items-center space-x-3.5 px-5 py-3.5 rounded-xl transition-colors font-semibold text-base group ${
              location.pathname === '/dashboard' 
                ? 'bg-slate-800 text-indigo-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Home size={20} />
            <span>Inicio</span>
          </Link>
          <Link 
            to="/reservations" 
            onClick={handleLinkClick} 
            className={`flex items-center space-x-3.5 px-5 py-3.5 rounded-xl transition-colors font-semibold text-base group ${
              location.pathname === '/reservations' 
                ? 'bg-slate-800 text-indigo-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Calendar size={20} />
            <span>Mis Reservas</span>
          </Link>
          {user?.role === 'ADMIN' && (
            <Link 
              to="/admin" 
              onClick={handleLinkClick} 
              className={`flex items-center space-x-3.5 px-5 py-3.5 rounded-xl transition-colors font-semibold text-base group ${
                location.pathname === '/admin' 
                  ? 'bg-slate-800 text-amber-500' 
                  : 'text-amber-500/80 hover:text-amber-400 hover:bg-slate-800/40'
              }`}
            >
              <User size={20} />
              <span>Panel de Admin</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-4">
          <Link 
            to="/profile" 
            onClick={handleLinkClick} 
            className="flex items-center space-x-3 bg-slate-950/20 hover:bg-slate-800/50 border border-slate-800 p-3 rounded-xl transition-colors group cursor-pointer"
          >
            <div className="bg-slate-800 text-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold truncate w-full text-slate-200" title={user?.name}>{user?.name}</p>
              <p className="text-xs text-slate-400">Mi Perfil</p>
            </div>
          </Link>

          <button
            onClick={() => {
              handleLinkClick();
              logout();
            }}
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 active:scale-[0.98] transition-all text-sm font-bold shadow-sm w-full cursor-pointer"
          >
            <LogOut size={16} />
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
