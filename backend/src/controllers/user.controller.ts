import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ... imports

// Add create user schema
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'STAFF', 'MEMBER']).default('MEMBER'),
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Remove plain password from data before spread to avoid conflicts
    const { password: _, ...userData } = data;

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (error: any) {
    console.error('DEBUG - Error creating user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos de validación incorrectos', details: (error as any).errors });
    }
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    return res.status(500).json({ error: error.message || 'Error al crear usuario' });
  }
};

// ... existing endpoints

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'MEMBER']).optional(),
  isBlocked: z.boolean().optional(),
  password: z.string().min(6).optional(),
  currentPassword: z.string().optional(),
  image: z.string().optional(),
});

export const updateUser = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);
    const bcrypt = require('bcryptjs');

    // Permissions check: only self-update or ADMIN can update
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este perfil' });
    }

    const updateData: any = { ...data };
    delete updateData.currentPassword; // Don't save currentPassword to DB

    if (data.password) {
      // If user is updating their own password, require current password
      if (req.user.role !== 'ADMIN' || req.user.id === id) {
        if (!data.currentPassword) {
          return res.status(400).json({ error: 'Debes proporcionar tu contraseña actual para cambiarla' });
        }

        const currentUser = await prisma.user.findUnique({ where: { id: String(id) } });
        if (!currentUser) return res.status(404).json({ error: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(data.currentPassword, currentUser.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }
      }

      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
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
  } catch (error) {
    console.error('DEBUG - Error updating user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos de validación incorrectos', details: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  // ... existing delete
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: String(id) } });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
