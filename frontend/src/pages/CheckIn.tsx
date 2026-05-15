import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, MapPin, Clock, Calendar, User as UserIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CheckIn() {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [court, setCourt] = useState<any>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // If not authenticated, save the current URL and go to login
    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    const loadInfo = async () => {
      try {
        const courtRes = await api.get(`/courts/${courtId}`);
        setCourt(courtRes.data);
        
        const resRes = await api.get(`/reservations/pending-checkin/${courtId}`);
        setReservation(resRes.data);
      } catch (error: any) {
        setStatus('ERROR');
        setMessage(error.response?.data?.error || 'No se pudo encontrar la información del check-in.');
      } finally {
        setLoading(false);
      }
    };

    loadInfo();
  }, [isAuthenticated, courtId, navigate, location.pathname]);

  const handleConfirmAccess = async () => {
    setProcessing(true);
    setStatus('IDLE');
    
    try {
      const res = await api.post(`/reservations/checkin/${courtId}`);
      setStatus('SUCCESS');
      setMessage(res.data.message || 'Acceso confirmado correctamente.');
    } catch (error: any) {
      setStatus('ERROR');
      setMessage(error.response?.data?.error || 'Error al confirmar el acceso. Comprueba que tienes una reserva activa en este momento.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col items-center p-0 md:p-4">
      <div className="bg-white md:rounded-xl md:shadow-xl w-full max-w-md min-h-screen md:min-h-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="text-gray-800" size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Check-in</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <div className="flex-1 px-6 pb-10 flex flex-col">
          {court && reservation ? (
            <div className="flex flex-col flex-1">
              {/* Image Illustration */}
              <div className="mb-8 flex justify-center">
                <img 
                  src="/assets/court_checkin.png" 
                  alt="Court Illustration" 
                  className="w-64 h-auto object-contain"
                />
              </div>

              {/* Court Name */}
              <h2 className="text-3xl font-extrabold text-[#1e293b] text-center mb-8">
                {court.name}
              </h2>

              {/* Reservation Info Grid */}
              <div className="space-y-6 mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="text-gray-600" size={20} />
                  </div>
                  <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-end">
                    <span className="text-gray-500 font-medium">Fecha</span>
                    <span className="text-gray-800 font-bold text-lg">
                      {format(new Date(reservation.startTime), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="text-gray-600" size={20} />
                  </div>
                  <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-end">
                    <span className="text-gray-500 font-medium">Hora</span>
                    <span className="text-gray-800 font-bold text-lg">
                      {format(new Date(reservation.startTime), 'HH:mm', { timeZone: 'UTC' })} - {format(new Date(reservation.endTime), 'HH:mm', { timeZone: 'UTC' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <UserIcon className="text-gray-600" size={20} />
                  </div>
                  <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-end">
                    <span className="text-gray-500 font-medium">Usuario</span>
                    <span className="text-gray-800 font-bold text-lg">
                      {reservation.user?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {status === 'SUCCESS' && (
                <div className="bg-green-50 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 border border-green-200 animate-in fade-in zoom-in duration-300">
                  <CheckCircle className="shrink-0 text-green-600" />
                  <p className="font-semibold">{message}</p>
                </div>
              )}

              {status === 'ERROR' && (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 border border-red-200 animate-in fade-in zoom-in duration-300">
                  <XCircle className="shrink-0 text-red-600" />
                  <p className="text-sm font-semibold">{message}</p>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-auto pt-6">
                {status !== 'SUCCESS' ? (
                  <button
                    onClick={handleConfirmAccess}
                    disabled={processing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex justify-center items-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                  >
                    {processing ? (
                      <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                    ) : null}
                    <span className="text-lg">{processing ? 'Verificando...' : 'Confirmar acceso'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={20} />
                    <span className="text-lg">Volver al inicio</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="bg-red-50 p-6 rounded-full mb-6">
                <AlertCircle className="text-red-500 w-16 h-16" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Error de Check-in</h3>
              <p className="text-gray-600 mb-10 max-w-xs">{message || 'No se ha encontrado ninguna reserva pendiente para esta pista.'}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 px-6 rounded-2xl transition-colors"
              >
                Volver al panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
