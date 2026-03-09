"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourt = exports.updateCourt = exports.createCourt = exports.getCourts = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const zod_1 = require("zod");
// Update schema validation
const courtSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    surface: zod_1.z.string(),
    pricePerHour: zod_1.z.number(),
    sport: zod_1.z.string().default('Padel'), // Add sport validation
    isActive: zod_1.z.boolean().optional(),
});
const getCourts = async (req, res) => {
    try {
        const { sport } = req.query;
        const where = sport ? { sport: String(sport) } : {};
        const courts = await prisma_1.default.court.findMany({
            where
        });
        res.json(courts);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getCourts = getCourts;
const createCourt = async (req, res) => {
    try {
        const data = courtSchema.parse(req.body);
        const court = await prisma_1.default.court.create({
            data: {
                ...data,
                pricePerHour: data.pricePerHour, // Decimal handling might need care if strictly typed, but Prisma handles number to Decimal
            },
        });
        res.status(201).json(court);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.createCourt = createCourt;
const updateCourt = async (req, res) => {
    try {
        const { id } = req.params;
        const data = courtSchema.partial().parse(req.body);
        const court = await prisma_1.default.court.update({
            where: { id: String(id) },
            data,
        });
        res.json(court);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.updateCourt = updateCourt;
const deleteCourt = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.court.delete({ where: { id: String(id) } });
        res.sendStatus(204);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.deleteCourt = deleteCourt;
