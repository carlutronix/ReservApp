"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelReservation = exports.createReservation = exports.getReservations = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const zod_1 = require("zod");
const reservationSchema = zod_1.z.object({
    courtId: zod_1.z.string(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
});
const getReservations = async (req, res) => {
    try {
        const { date, courtId } = req.query;
        const where = {};
        if (courtId)
            where.courtId = String(courtId);
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
        const reservations = await prisma_1.default.reservation.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
                court: { select: { name: true } },
            },
        });
        res.json(reservations);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getReservations = getReservations;
const createReservation = async (req, res) => {
    try {
        const { courtId, startTime, endTime } = reservationSchema.parse(req.body);
        const userId = req.user.id;
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }
        // Transaction to ensure no double booking
        const result = await prisma_1.default.$transaction(async (tx) => {
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
                throw new Error('Court is not available for the selected time');
            }
            // Calculate price
            const court = await tx.court.findUnique({ where: { id: courtId } });
            if (!court)
                throw new Error('Court not found');
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
                },
            });
            return reservation;
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        if (error.message === 'Court is not available for the selected time') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.createReservation = createReservation;
const cancelReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;
        const reservation = await prisma_1.default.reservation.findUnique({ where: { id: String(id) } });
        if (!reservation)
            return res.status(404).json({ error: 'Reservation not found' });
        if (role !== 'ADMIN' && role !== 'STAFF' && reservation.userId !== userId) {
            return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
        }
        const updated = await prisma_1.default.reservation.update({
            where: { id: String(id) },
            data: { status: 'CANCELLED' },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelReservation = cancelReservation;
