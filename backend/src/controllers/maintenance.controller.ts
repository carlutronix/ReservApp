import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

const maintenanceSchema = z.object({
    courtId: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    reason: z.string().min(1, 'Reason is required'),
});

export const createMaintenance = async (req: Request, res: Response) => {
    try {
        const data = maintenanceSchema.parse(req.body);
        const maintenance = await prisma.maintenance.create({
            data: {
                courtId: data.courtId,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                reason: data.reason,
            },
        });
        res.status(201).json(maintenance);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getMaintenances = async (req: Request, res: Response) => {
    try {
        const { courtId, date } = req.query;
        const where: any = {};

        if (courtId) where.courtId = String(courtId);

        if (date) {
            const startOfDay = new Date(String(date));
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(String(date));
            endOfDay.setHours(23, 59, 59, 999);

            where.AND = [
                { startTime: { lte: endOfDay } },
                { endTime: { gte: startOfDay } }
            ];
        }

        const maintenances = await prisma.maintenance.findMany({
            where,
            include: {
                court: { select: { name: true } },
            },
        });
        res.json(maintenances);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const deleteFutureMaintenances = async (req: Request, res: Response) => {
    try {
        const { courtId } = req.params;
        await prisma.maintenance.deleteMany({
            where: {
                courtId: String(courtId),
                endTime: { gt: new Date() }
            }
        });
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
