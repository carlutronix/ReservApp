import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'react-router-dom';
import { Users, LayoutGrid, BarChart3, Plus, Ban, Trash2, CheckCircle, XCircle, Pencil, Calendar as CalendarIcon, Edit, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import EditReservationModal from '../components/EditReservationModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
interface Stats {
  totalUsers: number;
  totalReservations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeCourts: number;
  recentReservations: any[];
  extendedStats?: {
    mostBookedCourt: { name: string, count: number };
    mostBookedSport: { name: string, count: number };
    peakHour: { hour: string, count: number };
    cancelledCount: number;
    monthlyEvolution: { month: string, reservations: number, revenue?: number }[];
    usersDetail: {
      roles: { ADMIN: number; STAFF: number; MEMBER: number };
      blocked: number;
      newUsers: number;
    };
    reservationsDetail: {
      status: { CONFIRMED: number; CANCELLED: number };
      bySport: { name: string; count: number }[];
      cancellationRate: string;
    };
    courtsDetail: { id: string; name: string; count: number; revenue: number }[];
    hourlyDistribution: { hour: string; count: number }[];
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  _count: { reservations: number };
}

interface Court {
  id: string;
  name: string;
  type: string;
  sport: string;
  surface: string;
  pricePerHour: number;
  isActive: boolean;
  openTime?: string;
  closeTime?: string;
  activeDays?: number[];
}

// Schema for New Court
const courtSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: z.enum(['Interior', 'Exterior']),
  sport: z.enum(['Pádel', 'Tenis', 'Baloncesto', 'Fútbol', 'Voleibol', 'Bádminton', 'Frontón', 'Squash', 'Tenis de Mesa', 'Hockey']),
  surface: z.string().min(2, 'La superficie es requerida'),
  pricePerHour: z.number().min(1, 'El precio debe ser mayor a 0'),
  isActive: z.boolean().optional(),
  openTime: z.string().optional().default("08:00"),
  closeTime: z.string().optional().default("22:00"),
  activeDays: z.array(z.coerce.number()).optional().default([1, 2, 3, 4, 5, 6, 0])
});

type CourtFormData = z.infer<typeof courtSchema>;

// Maintenance Schema
const maintenanceSchema = z.object({
  startTime: z.string().min(1, 'Fecha inicio requerida'),
  endTime: z.string().min(1, 'Fecha fin requerida'),
  reason: z.string().min(1, 'Razón requerida'),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export default function AdminDashboard() {
  const location = useLocation();
  const lastLogin = location.state?.lastLogin;
  const [showWelcome, setShowWelcome] = useState(!!lastLogin);
  const [activeTab, setActiveTab] = useState<'stats' | 'courts' | 'users' | 'reservations'>('stats');

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [resFilterSport, setResFilterSport] = useState<string>('');
  const [resFilterDate, setResFilterDate] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourt, setShowAddCourt] = useState(false);

  // Stats Interactive States
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '12m' | 'all'>('30d');
  const [timeGroup, setTimeGroup] = useState<'day' | 'week' | 'month'>('day');
  const [selectedCard, setSelectedCard] = useState<string>('revenue');

  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [blockingCourt, setBlockingCourt] = useState<Court | null>(null);
  const [blockType, setBlockType] = useState<'indefinite' | 'time'>('indefinite');
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [qrCourt, setQrCourt] = useState<Court | null>(null);

  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingReservationsUser, setViewingReservationsUser] = useState<User | null>(null);
  const [userReservations, setUserReservations] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any | null>(null);

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reservations/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Reservas.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar CSV', error);
      alert('Error al descargar el archivo CSV');
    }
  };

  const handleExportPDF = async () => {
    if (!stats) return;
    try {
      const res = await api.get('/reservations');
      const allRes = res.data;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Reporte de Reservas - ReservApp', 14, 22);

      doc.setFontSize(11);
      doc.text(`Total Ingresos: €${stats.totalRevenue.toFixed(2)}`, 14, 32);
      doc.text(`Total Reservas: ${stats.totalReservations}`, 14, 38);

      const tableData = allRes.map((r: any) => [
        format(new Date(r.startTime), 'dd/MM/yyyy'),
        `${format(new Date(r.startTime), 'HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}`,
        r.court.name,
        r.user.name,
        `€${Number(r.totalPrice).toFixed(2)}`,
        r.status === 'CONFIRMED' ? 'Confirmada' : r.status === 'CANCELLED' ? 'Cancelada' : r.status
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Fecha', 'Hora', 'Pista', 'Usuario', 'Precio', 'Estado']],
        body: tableData,
      });

      doc.save('Reservas.pdf');
    } catch (error) {
      console.error('Error al exportar PDF', error);
      alert('Error al generar el PDF');
    }
  };

  const fetchUserReservations = async (userId: string) => {
    try {
      const res = await api.get('/reservations', { params: { userId } });
      setUserReservations(res.data);
    } catch (error) {
      console.error("Error fetching user reservations", error);
    }
  };

  const handleCancelReservation = async (id: string, userId: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    try {
      await api.put(`/reservations/${id}/cancel`);

      // Update All Reservations State
      setAllReservations(prev => prev.map(res =>
        res.id === id ? { ...res, status: 'CANCELLED' } : res
      ));

      // Update User Reservations State
      if (viewingReservationsUser && viewingReservationsUser.id === userId) {
        setUserReservations(prev => prev.map(res =>
          res.id === id ? { ...res, status: 'CANCELLED' } : res
        ));
      }

      // Update Recent Activity State if visible
      if (stats && stats.recentReservations) {
        setStats(prev => prev ? {
          ...prev,
          recentReservations: prev.recentReservations.map((res: any) =>
            res.id === id ? { ...res, status: 'CANCELLED' } : res
          )
        } : null);
      }

    } catch (error) {
      console.error(error);
      alert("Error al cancelar reserva");
    }
  };

  const isCourtBlockedByMaintenance = (courtId: string) => {
    const now = new Date();
    return maintenances.some((m: any) =>
      m.courtId === courtId && new Date(m.startTime) <= now && new Date(m.endTime) > now
    );
  };

  const hasFutureMaintenance = (courtId: string) => {
    const now = new Date();
    return maintenances.some((m: any) =>
      m.courtId === courtId && new Date(m.endTime) > now
    );
  };

  // User Schema
  const userFormSchema = z.object({
    name: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Contraseña mín. 6 caracteres').optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'STAFF', 'MEMBER']),
    isBlocked: z.boolean().optional(),
  });

  type UserFormData = z.infer<typeof userFormSchema>;

  const { register: registerUser, handleSubmit: handleSubmitUser, reset: resetUser, setValue: setValueUser, formState: { errors: errorsUser } } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema)
  });

  useEffect(() => {
    if (editingUser) {
      setValueUser('name', editingUser.name);
      setValueUser('email', editingUser.email);
      setValueUser('role', editingUser.role as any);
      setValueUser('isBlocked', editingUser.isBlocked);
      setShowAddUser(true);
    } else {
      resetUser();
    }
  }, [editingUser, setValueUser, resetUser]);

  const handleCreateOrUpdateUser = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, data);
      } else {
        if (!data.password) {
          alert("La contraseña es obligatoria para nuevos usuarios");
          return;
        }
        await api.post('/users', data);
      }
      setShowAddUser(false);
      setEditingUser(null);
      resetUser();
      fetchData();
    } catch (error: any) {
      console.error("Error saving user", error);
      alert(error.response?.data?.error || "Error al guardar usuario");
    }
  };

  const cancelUserEdit = () => {
    setShowAddUser(false);
    setEditingUser(null);
    resetUser();
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CourtFormData>({
    resolver: zodResolver(courtSchema) as any,
    defaultValues: {
      openTime: "08:00",
      closeTime: "22:00",
      activeDays: [1, 2, 3, 4, 5, 6, 0]
    }
  });

  const { register: registerMaintenance, handleSubmit: handleSubmitMaintenance, reset: resetMaintenance } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema)
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, timeRange, timeGroup]);

  useEffect(() => {
    if (editingCourt) {
      setValue('name', editingCourt.name);
      setValue('type', editingCourt.type as any);
      setValue('sport', editingCourt.sport as any);
      setValue('surface', editingCourt.surface);
      setValue('pricePerHour', editingCourt.pricePerHour);
      setValue('isActive', editingCourt.isActive);
      setValue('openTime', editingCourt.openTime || "08:00");
      setValue('closeTime', editingCourt.closeTime || "22:00");
      setValue('activeDays', editingCourt.activeDays || [1, 2, 3, 4, 5, 6, 0]);
      setShowAddCourt(true);
    } else {
      reset();
    }
  }, [editingCourt, setValue, reset]);

  const fetchData = async () => {
    // ... same as before
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await api.get(`/stats?range=${timeRange}&groupBy=${timeGroup}`);
        setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/users');
        setUsers(res.data);
      } else if (activeTab === 'courts') {
        const [courtsRes, maintRes] = await Promise.all([
          api.get('/courts'),
          api.get('/maintenances')
        ]);
        setCourts(courtsRes.data);
        setMaintenances(maintRes.data);
      } else if (activeTab === 'reservations') {
        const res = await api.get('/reservations');
        setAllReservations(res.data);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateCourt = async (data: CourtFormData) => {
    try {
      if (editingCourt) {
        await api.put(`/courts/${editingCourt.id}`, data);
      } else {
        await api.post('/courts', data);
      }
      reset();
      setShowAddCourt(false);
      setEditingCourt(null);
      fetchData();
    } catch (error) {
      console.error('Error al guardar pista:', error);
      alert('Error al guardar la pista');
    }
  };

  const handleDeleteCourt = async (id: string) => {
    if (!confirm('¿Estás seguro de ELIMINAR esta pista?')) return;
    try {
      await api.delete(`/courts/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error al eliminar pista:', error);
    }
  };

  const handleBlockCourt = async (data: MaintenanceFormData) => {
    if (!blockingCourt) return;

    try {
      if (blockType === 'indefinite') {
        await api.put(`/courts/${blockingCourt.id}`, { isActive: !blockingCourt.isActive });
      } else {
        await api.post('/maintenances', {
          courtId: blockingCourt.id,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
          reason: data.reason
        });
      }
      setBlockingCourt(null);
      resetMaintenance();
      fetchData();
    } catch (error) {
      console.error('Error blocking court', error);
      alert('Error al bloquear pista');
    }
  };

  const toggleUserBlock = async (user: User) => {
    if (!confirm(`¿Estás seguro de que quieres ${user.isBlocked ? 'desbloquear' : 'bloquear'} a este usuario?`)) return;
    try {
      await api.put(`/users/${user.id}`, { isBlocked: !user.isBlocked });
      fetchData();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres ELIMINAR a este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6 relative">
      {showWelcome && lastLogin && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-white border-l-4 border-indigo-500 shadow-lg rounded-r-lg p-4 flex items-center gap-3 max-w-sm">
            <div className="bg-indigo-100 p-2 rounded-full">
              <CalendarIcon className="text-indigo-600" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">¡Bienvenido Administrador!</p>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Administración</h2>
        <div className="flex w-full md:w-auto overflow-x-auto space-x-2 bg-white p-1 rounded-lg shadow-sm border shrink-0">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'stats' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart3 size={18} /> Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('courts')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'courts' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={18} /> Pistas
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users size={18} /> Usuarios
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTab === 'reservations' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarIcon size={18} /> Reservas
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500">Cargando...</div>
        ) : (
          <>
            {activeTab === 'stats' && stats && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <h3 className="text-xl font-bold text-gray-800">Panel Interactivo (Filtrado)</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as any)}
                      className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white"
                    >
                      <option value="7d">Últimos 7 días</option>
                      <option value="30d">Últimos 30 días</option>
                      <option value="12m">Últimos 12 meses</option>
                      <option value="all">Todo el histórico</option>
                    </select>

                    <select
                      value={timeGroup}
                      onChange={(e) => setTimeGroup(e.target.value as any)}
                      className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white"
                    >
                      <option value="day">Diario</option>
                      <option value="week">Semanal</option>
                      <option value="month">Mensual</option>
                    </select>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
                      >
                        <Download size={16} /> CSV
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors shadow-sm font-medium text-sm"
                      >
                        <Download size={16} /> PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Revenue */}
                  <div
                    onClick={() => setSelectedCard('revenue')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'revenue' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'revenue' ? 'text-indigo-700' : 'text-gray-500'}`}>Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gray-800">€{Number(stats.totalRevenue).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1 cursor-help" title="Beneficios absolutos generados en el periodo">Del periodo seleccionado</p>
                  </div>
                  {/* Users */}
                  <div
                    onClick={() => setSelectedCard('users')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'users' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'users' ? 'text-blue-700' : 'text-gray-500'}`}>Nuevos Usuarios</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                    <p className="text-xs text-blue-400 mt-1">{stats.extendedStats?.usersDetail.newUsers} en este periodo</p>
                  </div>
                  {/* Reservations */}
                  <div
                    onClick={() => setSelectedCard('reservations')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'reservations' ? 'bg-green-50 border-green-500 ring-2 ring-green-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'reservations' ? 'text-green-700' : 'text-gray-500'}`}>Reservas (Volumen)</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalReservations}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">{stats.extendedStats?.reservationsDetail.status.CONFIRMED} confirmadas</p>
                  </div>
                  {/* Courts */}
                  <div
                    onClick={() => setSelectedCard('courts')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'courts' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'courts' ? 'text-orange-700' : 'text-gray-500'}`}>Pistas Activas</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.activeCourts}</p>
                    <p className="text-xs text-orange-500 mt-1">Habilitadas en sistema</p>
                  </div>

                  {/* Top Court */}
                  <div
                    onClick={() => setSelectedCard('topCourt')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'topCourt' ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'topCourt' ? 'text-purple-700' : 'text-gray-500'}`}>Pista Top</p>
                    <p className="text-xl font-bold text-gray-800 truncate">{stats.extendedStats?.mostBookedCourt.name}</p>
                    <p className="text-xs text-purple-500 mt-1">{stats.extendedStats?.mostBookedCourt.count} uso(s)</p>
                  </div>
                  {/* Top Sport */}
                  <div
                    onClick={() => setSelectedCard('topSport')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'topSport' ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'topSport' ? 'text-teal-700' : 'text-gray-500'}`}>Deporte Top</p>
                    <p className="text-xl font-bold text-gray-800">{stats.extendedStats?.mostBookedSport.name}</p>
                    <p className="text-xs text-teal-500 mt-1">{stats.extendedStats?.mostBookedSport.count} reservas</p>
                  </div>
                  {/* Peak Hour */}
                  <div
                    onClick={() => setSelectedCard('peakHour')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'peakHour' ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'peakHour' ? 'text-yellow-700' : 'text-gray-500'}`}>Hora Punta</p>
                    <p className="text-xl font-bold text-gray-800">{stats.extendedStats?.peakHour.hour}</p>
                    <p className="text-xs text-yellow-600 mt-1">{stats.extendedStats?.peakHour.count} reservas concurentes</p>
                  </div>
                  {/* Cancellations */}
                  <div
                    onClick={() => setSelectedCard('cancelled')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedCard === 'cancelled' ? 'bg-red-50 border-red-500 ring-2 ring-red-200 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <p className={`text-sm font-medium ${selectedCard === 'cancelled' ? 'text-red-700' : 'text-gray-500'}`}>Cancelaciones</p>
                    <p className="text-xl font-bold text-gray-800">{stats.extendedStats?.cancelledCount}</p>
                    <p className="text-xs text-red-500 mt-1">Tasa: {stats.extendedStats?.reservationsDetail.cancellationRate}%</p>
                  </div>
                </div>

                {/* --- DETAILED PANELS --- */}
                {stats.extendedStats && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-6 shadow-inner min-h-[300px]">

                    {/* Panel: Revenue & Evolution (Default) */}
                    {(selectedCard === 'revenue' || selectedCard === 'reservations') && (
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-lg font-bold text-gray-800">
                            {selectedCard === 'revenue' ? 'Evolución de Ingresos' : 'Evolución de Reservas Confirmadas'}
                            <span className="text-gray-400 text-sm font-normal ml-2">(Agrupado por {timeGroup === 'day' ? 'Día' : timeGroup === 'week' ? 'Semana' : 'Mes'})</span>
                          </h4>
                        </div>

                        {stats.extendedStats.monthlyEvolution.length === 0 ? (
                          <p className="text-gray-500 text-center py-10">No hay datos en el periodo seleccionado.</p>
                        ) : (
                          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex gap-6 overflow-x-auto items-end h-64">
                            {stats.extendedStats.monthlyEvolution.map((m, idx) => {
                              const val = selectedCard === 'revenue' ? (m.revenue || 0) : m.reservations;
                              const isRev = selectedCard === 'revenue';
                              const maxVal = Math.max(...stats.extendedStats!.monthlyEvolution.map(e => isRev ? (e.revenue || 0) : e.reservations), 1);
                              const heightPercent = Math.max(5, (val / maxVal) * 100);

                              return (
                                <div key={idx} className="flex flex-col items-center flex-1 min-w-[60px] group">
                                  <div className="w-full relative flex justify-center h-40 items-end">
                                    <div
                                      className={`w-12 rounded-t transition-all duration-500 cursor-default ${isRev ? 'bg-indigo-400 hover:bg-indigo-600' : 'bg-green-400 hover:bg-green-600'}`}
                                      style={{ height: `${heightPercent}%` }}
                                    ></div>
                                    <span className="absolute -top-8 text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white border px-2 py-1 rounded shadow-sm whitespace-nowrap z-10">
                                      {isRev ? `€${val.toFixed(2)}` : val}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-gray-500 mt-3 truncate w-full text-center" title={m.month}>{m.month}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Panel: Users */}
                    {selectedCard === 'users' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4">Desglose por Roles (Nuevos Registros)</h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                              <span className="font-medium text-gray-600">Miembros (Clientes)</span>
                              <span className="font-bold text-xl text-blue-600">{stats.extendedStats.usersDetail.roles.MEMBER}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                              <span className="font-medium text-gray-600">Personal (Staff)</span>
                              <span className="font-bold text-xl text-blue-600">{stats.extendedStats.usersDetail.roles.STAFF}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                              <span className="font-medium text-gray-600">Administradores</span>
                              <span className="font-bold text-xl text-blue-600">{stats.extendedStats.usersDetail.roles.ADMIN}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4">Estado de Cuentas (Nuevos Registros)</h4>
                          <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center h-full max-h-[170px] shadow-sm">
                            <Ban className="text-red-400 mb-2" size={32} />
                            <p className="text-3xl font-bold text-red-600">{stats.extendedStats.usersDetail.blocked}</p>
                            <p className="text-red-800 font-medium mt-1">Usuarios Restringidos</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Panel: Courts */}
                    {selectedCard === 'courts' && (
                      <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4 text-orange-700">Ingresos Consumados por Pista (en el periodo)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {stats.extendedStats.courtsDetail.map(court => (
                            <div key={court.id} className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-800">{court.name}</p>
                                <p className="text-xs text-gray-500">{court.count} reserva(s)</p>
                              </div>
                              <p className="text-xl font-bold text-orange-600">€{court.revenue.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Panel: Rankings */}
                    {(selectedCard === 'topCourt' || selectedCard === 'topSport') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 text-purple-700">Ranking de Pistas</h4>
                          <div className="space-y-2">
                            {stats.extendedStats.courtsDetail.slice(0, 5).map((court, i) => (
                              <div key={court.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`w-8 h-8 flex justify-center items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-purple-500 text-white ring-2 ring-purple-200' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                  <span className="font-medium text-gray-800 text-lg">{court.name}</span>
                                </div>
                                <span className="font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{court.count} reservas</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 text-teal-700">Ranking de Deportes</h4>
                          <div className="space-y-2">
                            {stats.extendedStats.reservationsDetail.bySport.map((sport, i) => (
                              <div key={sport.name} className="flex justify-between items-center bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`w-8 h-8 flex justify-center items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-teal-500 text-white ring-2 ring-teal-200' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                  <span className="font-medium text-gray-800 text-lg">{sport.name}</span>
                                </div>
                                <span className="font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{sport.count} reservas</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Panel: Peak Hour & Cancellations */}
                    {(selectedCard === 'peakHour' || selectedCard === 'cancelled') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 text-yellow-700">Distribución Horaria (Top 5 del periodo)</h4>
                          <div className="space-y-3 bg-white p-4 rounded-lg border border-yellow-100 shadow-sm">
                            {stats.extendedStats.hourlyDistribution.sort((a, b) => b.count - a.count).slice(0, 5).map((hour) => (
                              <div key={hour.hour}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-bold text-gray-800 text-base">{hour.hour}</span>
                                  <span className="text-gray-500 font-medium">{hour.count} concurrencias</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                  <div className="bg-yellow-400 h-3 rounded-full" style={{ width: `${Math.max(5, (hour.count / stats.extendedStats!.hourlyDistribution.sort((a, b) => b.count - a.count)[0].count) * 100)}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 text-red-700">Estado de Cancelaciones</h4>
                          <div className="bg-white p-6 rounded-lg border border-red-100 shadow-sm h-full flex flex-col justify-center items-center text-center max-h-[220px]">
                            <XCircle className="text-red-400 mb-3" size={48} />
                            <p className="text-5xl font-black text-red-600 mb-2">{stats.extendedStats.reservationsDetail.cancellationRate}%</p>
                            <p className="text-gray-800 font-medium">Tasa media de cancelación</p>
                            <p className="text-sm text-gray-500 mt-2">Calculado sobre {stats.totalReservations + stats.extendedStats.cancelledCount} intenciones de reserva en el rango seleccionado.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t mt-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-700">Actividad Reciente</h3>
                  <div className="space-y-3">
                    {stats.recentReservations.map((res: any) => (
                      <div key={res.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-800">{res.user.name}</p>
                          <p className="text-sm text-gray-500">Reservó {res.court.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{format(new Date(res.createdAt), 'PP p', { locale: es })}</p>
                          <p className="text-xs font-bold text-green-600">€{res.totalPrice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'courts' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-700">Gestión de Pistas</h3>
                  <button
                    onClick={() => setShowAddCourt(!showAddCourt)}
                    className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={18} /> Añadir Pista
                  </button>
                </div>

                {showAddCourt && (
                  <form onSubmit={handleSubmit(handleCreateOrUpdateCourt)} className="mb-6 p-4 border rounded bg-gray-50">
                    <h4 className="font-bold mb-3 text-gray-700">{editingCourt ? 'Editar Pista' : 'Nueva Pista'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input {...register('name')} placeholder="Nombre de la Pista" className="w-full border p-2 rounded" />
                        {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select {...register('type')} className="w-full border p-2 rounded">
                          <option value="Interior">Interior</option>
                          <option value="Exterior">Exterior</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deporte</label>
                        <select {...register('sport')} className="w-full border p-2 rounded">
                          <option value="Pádel">Pádel</option>
                          <option value="Tenis">Tenis</option>
                          <option value="Baloncesto">Baloncesto</option>
                          <option value="Fútbol">Fútbol</option>
                          <option value="Voleibol">Voleibol</option>
                          <option value="Bádminton">Bádminton</option>
                          <option value="Frontón">Frontón</option>
                          <option value="Squash">Squash</option>
                          <option value="Tenis de Mesa">Tenis de Mesa</option>
                          <option value="Hockey">Hockey</option>
                        </select>
                        {errors.sport && <span className="text-red-500 text-xs">{errors.sport.message}</span>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Superficie</label>
                        <input {...register('surface')} placeholder="Superficie" className="w-full border p-2 rounded" />
                        {errors.surface && <span className="text-red-500 text-xs">{errors.surface.message}</span>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio/Hora</label>
                        <input {...register('pricePerHour', { valueAsNumber: true })} type="number" placeholder="Precio/h" className="w-full border p-2 rounded" />
                        {errors.pricePerHour && <span className="text-red-500 text-xs">{errors.pricePerHour.message}</span>}
                      </div>
                    </div>

                    {/* SCHEDULE ROW */}
                    <div className="mt-4 border-t pt-4">
                      <h5 className="font-bold text-sm text-gray-700 mb-2">Horario de Disponibilidad</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Apertura</label>
                            <input {...register('openTime')} type="time" className="border p-2 rounded text-sm w-32" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cierre</label>
                            <input {...register('closeTime')} type="time" className="border p-2 rounded text-sm w-32" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Días Activos</label>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {[{ v: 1, l: 'L' }, { v: 2, l: 'M' }, { v: 3, l: 'X' }, { v: 4, l: 'J' }, { v: 5, l: 'V' }, { v: 6, l: 'S' }, { v: 0, l: 'D' }].map(day => (
                              <label key={day.v} className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 flex-1 justify-center min-w-[32px]">
                                <input
                                  type="checkbox"
                                  value={day.v}
                                  {...register('activeDays')}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                                {day.l}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddCourt(false)} className="text-gray-500 hover:text-gray-700">Cancelar</button>
                      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Guardar Pista</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Deporte</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Superficie</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courts.map(court => {
                        const isMaintenance = isCourtBlockedByMaintenance(court.id);
                        const hasFuture = hasFutureMaintenance(court.id);
                        const isBlocked = !court.isActive || isMaintenance;

                        return (
                          <tr key={court.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{court.name}</td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {court.sport || 'Pádel'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600">{court.type}</td>
                            <td className="p-3 text-gray-600">{court.surface}</td>
                            <td className="p-3 font-bold">€{court.pricePerHour}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${!court.isActive ? 'bg-red-100 text-red-700' :
                                isMaintenance ? 'bg-orange-100 text-orange-700' :
                                  hasFuture ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {!court.isActive ? 'Bloq. Indefinido' :
                                  isMaintenance ? 'Mantenimiento' :
                                    hasFuture ? 'Reservado Mantenimiento' :
                                      'Activa'}
                              </span>
                            </td>
                            <td className="p-3 text-right flex justify-end gap-2">
                              <button
                                onClick={() => setQrCourt(court)}
                                className="p-2 rounded hover:bg-gray-200 text-gray-500"
                                title="Ver QR Check-in"
                              >
                                <QrCode size={18} />
                              </button>
                              <button
                                onClick={() => setEditingCourt(court)}
                                className="p-2 rounded hover:bg-indigo-50 text-indigo-500"
                                title="Editar Pista"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  if (isBlocked || hasFuture) {
                                    // Logic to unblock
                                    if (confirm("¿Desbloquear esta pista y eliminar mantenimientos futuros?")) {
                                      if (!court.isActive) {
                                        api.put(`/courts/${court.id}`, { isActive: true }).then(fetchData);
                                      }
                                      if (hasFuture || isMaintenance) {
                                        api.delete(`/maintenances/${court.id}`).then(fetchData);
                                      }
                                    }
                                  } else {
                                    setBlockingCourt(court);
                                  }
                                }}
                                className={`p-2 rounded hover:bg-gray-200 ${isBlocked || hasFuture ? 'text-green-500' : 'text-orange-500'}`}
                                title={isBlocked || hasFuture ? 'Desbloquear' : 'Bloquear'}
                              >
                                {isBlocked || hasFuture ? <CheckCircle size={18} /> : <Ban size={18} />}
                              </button>
                              <button
                                onClick={() => handleDeleteCourt(court.id)}
                                className="p-2 rounded hover:bg-red-50 text-red-500"
                                title="Eliminar Pista"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-700">Gestión de Usuarios</h3>
                  <button
                    onClick={() => { setEditingUser(null); setShowAddUser(true); }}
                    className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={18} /> Añadir Usuario
                  </button>
                </div>

                {showAddUser && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                      <h3 className="text-xl font-bold mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                      <form onSubmit={handleSubmitUser(handleCreateOrUpdateUser)} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nombre</label>
                          <input {...registerUser('name')} className="w-full border p-2 rounded" />
                          {errorsUser.name && <p className="text-red-500 text-xs">{errorsUser.name.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input {...registerUser('email')} disabled={!!editingUser} className="w-full border p-2 rounded disabled:bg-gray-100" />
                          {errorsUser.email && <p className="text-red-500 text-xs">{errorsUser.email.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Contraseña {editingUser && '(Dejar en blanco para mantener)'}</label>
                          <input type="password" {...registerUser('password')} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Rol</label>
                          <select {...registerUser('role')} className="w-full border p-2 rounded">
                            <option value="MEMBER">Miembro</option>
                            <option value="STAFF">Personal</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={cancelUserEdit} className="px-4 py-2 text-gray-500">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Correo</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Unido</th>
                        <th className="p-3">Reservas</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{user.name}</td>
                          <td className="p-3 text-gray-600">{user.email}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded bg-gray-100 border`}>
                              {user.role === 'ADMIN' ? 'Administrador' : user.role === 'STAFF' ? 'Personal' : 'Miembro'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 text-sm">{format(new Date(user.createdAt), 'd MMM yyyy', { locale: es })}</td>
                          <td className="p-3 text-center">{user._count.reservations}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${!user.isBlocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isBlocked ? 'Bloqueado' : 'Activo'}
                            </span>
                          </td>
                          <td className="p-3 text-right flex justify-end gap-2">
                            {user.role !== 'ADMIN' && (
                              <>
                                <button
                                  onClick={() => {
                                    setViewingReservationsUser(user);
                                    fetchUserReservations(user.id);
                                  }}
                                  className="p-2 rounded hover:bg-blue-50 text-blue-500"
                                  title="Ver Reservas"
                                >
                                  <CalendarIcon size={18} />
                                </button>
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="p-2 rounded hover:bg-indigo-50 text-indigo-500"
                                  title="Editar Usuario"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button
                                  onClick={() => toggleUserBlock(user)}
                                  className={`p-2 rounded hover:bg-gray-200 ${!user.isBlocked ? 'text-orange-500' : 'text-green-500'}`}
                                  title={user.isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario'}
                                >
                                  {user.isBlocked ? <CheckCircle size={18} /> : <Ban size={18} />}
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  className="p-2 rounded hover:bg-red-50 text-red-500"
                                  title="Eliminar Usuario"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {viewingReservationsUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Reservas de {viewingReservationsUser.name}</h3>
                    <button onClick={() => setViewingReservationsUser(null)} className="text-gray-500 hover:text-gray-700">
                      <XCircle size={24} />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {userReservations.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No tiene reservas.</p>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-50 text-sm text-gray-600 border-b">
                              <th className="p-3">Fecha</th>
                              <th className="p-3">Hora</th>
                              <th className="p-3">Pista</th>
                              <th className="p-3">Precio</th>
                              <th className="p-3">Estado</th>
                              <th className="p-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userReservations.map((res: any) => (
                              <tr key={res.id} className="border-b">
                                <td className="p-3">{format(new Date(res.startTime), 'dd/MM/yyyy')}</td>
                                <td className="p-3">{format(new Date(res.startTime), 'HH:mm')} - {format(new Date(res.endTime), 'HH:mm')}</td>
                                <td className="p-3">{res.court.name}</td>
                                <td className="p-3 font-bold">€{Number(res.totalPrice).toFixed(2)}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {res.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {res.status === 'CONFIRMED' && new Date(res.startTime) > new Date() && (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingReservation(res);
                                          setIsEditModalOpen(true);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1"
                                      >
                                        <Edit size={12} /> Editar
                                      </button>
                                      <button
                                        onClick={() => handleCancelReservation(res.id, viewingReservationsUser.id)}
                                        className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reservations' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="text-xl font-bold text-gray-800">Todas las Reservas</h3>
                  <div className="flex gap-4 w-full md:w-auto">
                    <input
                      type="date"
                      value={resFilterDate}
                      onChange={e => setResFilterDate(e.target.value)}
                      className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                    />
                    <select
                      value={resFilterSport}
                      onChange={e => setResFilterSport(e.target.value)}
                      className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                    >
                      <option value="">Todos los deportes</option>
                      <option value="Pádel">Pádel</option>
                      <option value="Tenis">Tenis</option>
                      <option value="Baloncesto">Baloncesto</option>
                      <option value="Fútbol">Fútbol</option>
                      <option value="Voleibol">Voleibol</option>
                      <option value="Bádminton">Bádminton</option>
                      <option value="Frontón">Frontón</option>
                      <option value="Squash">Squash</option>
                      <option value="Tenis de Mesa">Tenis de Mesa</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 text-sm text-gray-600 border-b">
                        <th className="p-3">ID</th>
                        <th className="p-3">Fecha y Hora</th>
                        <th className="p-3">Pista</th>
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Notas</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReservations
                        .filter(r => !resFilterSport || r.court.sport === resFilterSport)
                        .filter(r => !resFilterDate || r.startTime.startsWith(resFilterDate))
                        .map((res: any) => (
                          <tr key={res.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-xs text-gray-500">{res.id.slice(-6)}</td>
                            <td className="p-3">
                              <div className="font-semibold">{format(new Date(res.startTime), 'dd/MM/yyyy')}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(res.startTime), 'HH:mm')} - {format(new Date(res.endTime), 'HH:mm')}
                              </div>
                            </td>
                            <td className="p-3">{res.court.name}</td>
                            <td className="p-3">{res.user.name}</td>
                            <td className="p-3 font-bold">€{Number(res.totalPrice).toFixed(2)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {res.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-gray-600 italic max-w-[150px] truncate" title={res.notes || ''}>
                              {res.notes || '-'}
                            </td>
                            <td className="p-3 text-right">
                              {res.status === 'CONFIRMED' && new Date(res.startTime) > new Date() && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingReservation(res);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1"
                                  >
                                    <Edit size={12} /> Editar
                                  </button>
                                  <button
                                    onClick={() => handleCancelReservation(res.id, res.userId)}
                                    className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {allReservations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No hay reservas en el sistema.</div>
                  )}
                </div>
              </div>
            )}

            {editingReservation && (
              <EditReservationModal
                isOpen={isEditModalOpen}
                onClose={() => {
                  setIsEditModalOpen(false);
                  setEditingReservation(null);
                }}
                reservation={editingReservation}
                isAdmin={true}
                onSuccess={() => {
                  if (activeTab === 'reservations') fetchData();
                  if (viewingReservationsUser) fetchUserReservations(viewingReservationsUser.id);
                }}
              />
            )}

            {blockingCourt && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Gestionar Bloqueo de Pista</h3>
                  <p className="mb-4 text-gray-600">Pista: <span className="font-semibold">{blockingCourt.name}</span></p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Bloqueo</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={blockType === 'indefinite'}
                          onChange={() => setBlockType('indefinite')}
                          className="text-indigo-600"
                        />
                        <span>Indefinido (ON/OFF)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={blockType === 'time'}
                          onChange={() => setBlockType('time')}
                          className="text-indigo-600"
                        />
                        <span>Por Horario</span>
                      </label>
                    </div>
                  </div>

                  {blockType === 'indefinite' ? (
                    <div className="mb-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
                      {blockingCourt.isActive
                        ? 'La pista se marcará como INACTIVA y no aparecerá en las búsquedas.'
                        : 'La pista se marcará como ACTIVA.'}
                    </div>
                  ) : (
                    <form id="maintenance-form" onSubmit={handleSubmitMaintenance(handleBlockCourt)} className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-700">Inicio</label>
                        <input type="datetime-local" {...registerMaintenance('startTime')} className="w-full border p-2 rounded" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">Fin</label>
                        <input type="datetime-local" {...registerMaintenance('endTime')} className="w-full border p-2 rounded" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">Razón</label>
                        <input {...registerMaintenance('reason')} className="w-full border p-2 rounded" placeholder="Mantenimiento, Lluvia..." />
                      </div>
                    </form>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setBlockingCourt(null)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancelar</button>
                    {blockType === 'indefinite' ? (
                      <button onClick={() => handleBlockCourt({} as any)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        Confirmar
                      </button>
                    ) : (
                      <button form="maintenance-form" type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        Guardar Bloqueo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {qrCourt && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-sm flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-2">QR de Check-in</h3>
                  <p className="text-gray-600 mb-6 font-medium text-center">{qrCourt.name}</p>
                  
                  <div className="bg-white p-4 border-2 border-gray-100 rounded-xl shadow-sm mb-6" id={`qr-court-${qrCourt.id}`}>
                    <QRCodeSVG 
                      value={`${window.location.origin}/check-in/court/${qrCourt.id}`}
                      size={200}
                      level={"H"}
                      includeMargin={true}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 text-center mb-6 px-4">
                    Imprime este código y colócalo en la entrada de la pista para que los usuarios puedan confirmar su asistencia.
                  </p>
                  
                  <button 
                    onClick={() => setQrCourt(null)} 
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
