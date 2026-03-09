"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFutureMaintenances = exports.getMaintenances = exports.createMaintenance = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const zod_1 = require("zod");
const maintenanceSchema = zod_1.z.object({
    courtId: zod_1.z.string(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    reason: zod_1.z.string().min(1, 'Reason is required'),
});
const createMaintenance = async (req, res) => {
    try {
        const data = maintenanceSchema.parse(req.body);
        const maintenance = await prisma_1.default.maintenance.create({
            data: {
                courtId: data.courtId,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                reason: data.reason,
            },
        });
        res.status(201).json(maintenance);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.createMaintenance = createMaintenance;
const getMaintenances = async (req, res) => {
    try {
        const { courtId, date } = req.query;
        const where = {};
        if (courtId)
            where.courtId = String(courtId);
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
        const maintenances = await prisma_1.default.maintenance.findMany({
            where,
            include: {
                court: { select: { name: true } },
            },
        });
        res.json(maintenances);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getMaintenances = getMaintenances;
const deleteFutureMaintenances = async (req, res) => {
    try {
        const { courtId } = req.params;
        await prisma_1.default.maintenance.deleteMany({
            where: {
                courtId: String(courtId),
                endTime: { gt: new Date() }
            }
        });
        res.sendStatus(204);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.deleteFutureMaintenances = deleteFutureMaintenances;
