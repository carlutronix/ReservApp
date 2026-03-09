"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const zod_1 = require("zod");
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
                createdAt: true,
                _count: {
                    select: { reservations: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getUsers = getUsers;
// ... imports
// Add create user schema
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'MEMBER']).default('MEMBER'),
});
const createUser = async (req, res) => {
    try {
        const data = createUserSchema.parse(req.body);
        // Hash password (need bcrypt)
        const bcrypt = require('bcryptjs'); // quick import or use top level
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                ...data,
                password: hashedPassword
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        res.status(201).json(user);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'El email ya está registrado' });
        }
        return res.status(400).json({ error: 'Error al crear usuario' });
    }
};
exports.createUser = createUser;
// ... existing endpoints
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().optional(), // Add name
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'MEMBER']).optional(),
    isBlocked: zod_1.z.boolean().optional(),
    password: zod_1.z.string().min(6).optional(), // Add password
    image: zod_1.z.string().optional(),
});
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateUserSchema.parse(req.body);
        const updateData = { ...data };
        if (data.password) {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        const user = await prisma_1.default.user.update({
            where: { id: String(id) },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
            }
        });
        res.json(user);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    // ... existing delete
    try {
        const { id } = req.params;
        await prisma_1.default.user.delete({ where: { id: String(id) } });
        res.sendStatus(204);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.deleteUser = deleteUser;
