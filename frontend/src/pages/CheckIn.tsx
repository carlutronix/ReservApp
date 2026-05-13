import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, MapPin, Clock } from 'lucide-react';

export default function CheckIn() {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [court, setCourt] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // If not authenticated, save the current URL and go to login
    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    const loadCourtInfo = async () => {
      try {
        const res = await api.get(`/courts/${courtId}`);
        setCourt(res.data);
      } catch (error) {
        setStatus('ERROR');
        setMessage('No se pudo encontrar la pista escaneada.');
      } finally {
        setLoading(false);
      }
    };

    loadCourtInfo();
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold">Check-in Pista</h1>
          <p className="opacity-90 mt-1">Escaneada desde QR</p>
        </div>

        <div className="p-6">
          {court ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">{court.name}</h2>
              <div className="flex justify-center items-center gap-2 text-sm text-gray-500 mb-6">
                <span className="px-3 py-1 bg-gray-100 rounded-full">{court.sport}</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">{court.surface}</span>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Clock className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Bienvenido, {user?.name?.split(' ')[0]}</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Por favor, confirma tu acceso pulsando el botón a continuación. Recuerda que debes tener una reserva válida que comience ahora o haya comenzado recientemente.
                    </p>
                  </div>
                </div>
              </div>

              {status === 'SUCCESS' && (
                <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-3 mb-6 border border-green-200">
                  <CheckCircle className="shrink-0 text-green-600" />
                  <p className="font-medium">{message}</p>
                </div>
              )}

              {status === 'ERROR' && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3 mb-6 border border-red-200">
                  <XCircle className="shrink-0 text-red-600" />
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}

              {status !== 'SUCCESS' ? (
                <button
                  onClick={handleConfirmAccess}
                  disabled={processing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  ) : (
                    <CheckCircle size={20} />
                  )}
                  <span>{processing ? 'Verificando...' : 'Confirmar Acceso'}</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Ir al Inicio
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="text-red-500 mx-auto w-12 h-12 mb-3" />
              <p className="text-red-600 font-medium">{message || 'Pista no encontrada'}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
