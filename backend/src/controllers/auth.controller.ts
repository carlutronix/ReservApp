import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  role: z.enum(['ADMIN', 'STAFF', 'MEMBER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    console.log('Registering user:', req.body.email);
    const { email, password, name, role } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'MEMBER',
      },
    });

    console.log('User registered successfully:', user.id);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
  } catch (error: any) {
    console.error('Register error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', req.body.email);
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.isBlocked) {
      console.log('User blocked:', email);
      return res.status(403).json({ error: 'Su cuenta ha sido bloqueada. Por favor contacte a administración.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('Login successful:', user.id);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crypto = require('crypto');
import { sendEmail } from '../utils/sendEmail';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return a generic response to prevent email scanning
      return res.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken,
        resetPasswordExpires,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    const message = `Has solicitado restablecer tu contraseña. \n\nPor favor, ingresa al siguiente enlace para poder cambiarla: \n\n ${resetUrl} \n\n Si no lo has solicitado, ignora este mensaje. El enlace es válido por 1 hora.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Recuperación de contraseña en ReservApp',
        message,
      });

      res.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
    } catch (error: any) {
      console.error('CRITICAL: Email could not be sent. Check your SMTP configuration.', error);
      // Revert token if email fails
      await prisma.user.update({
        where: { email },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      return res.status(500).json({ 
        error: 'El correo no pudo ser enviado. Error técnico: ' + (error.message || 'Error desconocido')
      });
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'El token es inválido o ha expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

