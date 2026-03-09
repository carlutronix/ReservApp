"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string(),
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'MEMBER']).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const register = async (req, res) => {
    try {
        console.log('Registering user:', req.body.email);
        const { email, password, name, role } = registerSchema.parse(req.body);
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'MEMBER',
            },
        });
        console.log('User registered successfully:', user.id);
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    }
    catch (error) {
        console.error('Register error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        console.log('Login attempt:', req.body.email);
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        if (user.isBlocked) {
            console.log('User blocked:', email);
            return res.status(403).json({ error: 'Su cuenta ha sido bloqueada. Por favor contacte a administración.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch:', email);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        console.log('Login successful:', user.id);
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.login = login;
