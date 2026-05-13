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
  email: z.string().email().optional(), // Add email
  role: z.enum(['ADMIN', 'STAFF', 'MEMBER']).optional(),
  isBlocked: z.boolean().optional(),
  password: z.string().min(6).optional(),
  image: z.string().optional(),
});

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const updateData: any = { ...data };
    if (data.password) {
      const bcrypt = require('bcryptjs');
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
