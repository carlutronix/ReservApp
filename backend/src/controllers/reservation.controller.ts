import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

const reservationSchema = z.object({
  courtId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
});

const updateReservationSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
});

interface AuthRequest extends Request {
  user?: any;
}

export const getReservations = async (req: AuthRequest, res: Response) => {
  try {
    const { date, courtId, mine } = req.query;

    const where: any = {};
    if (courtId) where.courtId = String(courtId);

    if (req.user?.role === 'ADMIN' && req.query.userId) {
      where.userId = String(req.query.userId);
    } else if (mine === 'true' && req.user) {
      where.userId = req.user.id;
    }

    if (date) {
      const startOfDay = new Date(String(date));
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(String(date));
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        court: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { courtId, startTime, endTime, notes } = reservationSchema.parse(req.body);
    const userId = req.user.id;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin' });
    }

    // Transaction to ensure no double booking
    const result = await prisma.$transaction(async (tx) => {
      // Check for overlaps
      const existing = await tx.reservation.findFirst({
        where: {
          courtId,
          status: { not: 'CANCELLED' },
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (existing) {
        throw new Error('La pista no está disponible para el horario seleccionado');
      }

      // Check for maintenance overlaps
      const maintenance = await tx.maintenance.findFirst({
        where: {
          courtId,
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (maintenance) {
        throw new Error('La pista está en mantenimiento en el horario seleccionado');
      }

      // Calculate price
      const court = await tx.court.findUnique({ where: { id: courtId } });
      if (!court) throw new Error('Pista no encontrada');

      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const totalPrice = Number(court.pricePerHour) * durationHours;

      const reservation = await tx.reservation.create({
        data: {
          userId,
          courtId,
          startTime: start,
          endTime: end,
          totalPrice,
          status: 'CONFIRMED',
          notes,
        },
      });

      return reservation;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    if (error.message === 'La pista no está disponible para el horario seleccionado' || error.message === 'La pista está en mantenimiento en el horario seleccionado') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

export const cancelReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const reservation = await prisma.reservation.findUnique({ where: { id: String(id) } });
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (role !== 'ADMIN' && role !== 'STAFF' && reservation.userId !== userId) {
      return res.status(403).json({ error: 'No autorizado para cancelar esta reserva' });
    }

    const updated = await prisma.reservation.update({
      where: { id: String(id) },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, notes } = updateReservationSchema.parse(req.body);
    const userId = req.user.id;
    const role = req.user.role;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin' });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: 'No se pueden crear ni modificar reservas en el pasado' });
    }

    const reservation = await prisma.reservation.findUnique({ where: { id: String(id) }, include: { court: true } });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({ error: 'No se puede editar una reserva cancelada' });
    }

    if (reservation.startTime < new Date() && role !== 'ADMIN') {
      return res.status(400).json({ error: 'No se puede editar una reserva pasada' });
    }

    if (role !== 'ADMIN' && role !== 'STAFF' && reservation.userId !== userId) {
      return res.status(403).json({ error: 'No autorizado para editar esta reserva' });
    }

    const courtId = reservation.courtId;

    const result = await prisma.$transaction(async (tx) => {
      // Check for overlaps excluding the current reservation
      const existing = await tx.reservation.findFirst({
        where: {
          courtId,
          id: { not: String(id) },
          status: { not: 'CANCELLED' },
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (existing) {
        throw new Error('La pista no está disponible para el nuevo horario seleccionado');
      }

      // Check for maintenance overlaps
      const maintenance = await tx.maintenance.findFirst({
        where: {
          courtId,
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (maintenance) {
        throw new Error('La pista está en mantenimiento en el horario seleccionado');
      }

      // Calculate new price based on the selected duration
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const totalPrice = Number(reservation.court.pricePerHour) * durationHours;

      const updated = await tx.reservation.update({
        where: { id: String(id) },
        data: {
          startTime: start,
          endTime: end,
          totalPrice,
          notes,
        },
      });

      return updated;
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    if (error.message === 'La pista no está disponible para el nuevo horario seleccionado' || error.message === 'La pista está en mantenimiento en el horario seleccionado') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
export const exportReservationsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status, courtId, userId } = req.query;

    const where: any = {};
    if (courtId) where.courtId = String(courtId);
    if (userId) where.userId = String(userId);
    if (status) where.status = String(status);

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        const start = new Date(String(startDate));
        start.setHours(0, 0, 0, 0);
        where.startTime.gte = start;
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.startTime.lte = end;
      }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        court: { select: { name: true, sport: true } },
      },
      orderBy: { startTime: 'desc' }
    });

    const headers = ['ID', 'Usuario', 'Email', 'Pista', 'Deporte', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Estado', 'Precio Total', 'Notas', 'Fecha de Creacion'];

    const rows = reservations.map(r => {
      const escape = (str: string) => `"${String(str || '').replace(/"/g, '""')}"`;

      const date = r.startTime.toISOString().split('T')[0];
      const timeStart = r.startTime.toISOString().split('T')[1].substring(0, 5);
      const timeEnd = r.endTime.toISOString().split('T')[1].substring(0, 5);
      const created = r.createdAt.toISOString().split('T')[0];

      return [
        r.id,
        escape(r.user.name),
        escape(r.user.email),
        escape(r.court.name),
        escape(r.court.sport),
        date,
        timeStart,
        timeEnd,
        r.status,
        Number(r.totalPrice).toFixed(2),
        escape(r.notes || ''),
        created
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservaciones.csv"');

    // Add BOM for Excel compatibility with UTF-8
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al exportar CSV' });
  }
};
