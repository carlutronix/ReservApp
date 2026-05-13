import prisma from '../config/prisma';
import { z } from 'zod';

// Update schema validation
const courtSchema = z.object({
  name: z.string(),
  type: z.string(),
  surface: z.string(),
  pricePerHour: z.number(),
  sport: z.string().default('Pádel'), // Add sport validation
  isActive: z.boolean().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  activeDays: z.array(z.number()).optional(),
});

export const getCourts = async (req: Request, res: Response) => {
  try {
    const { sport } = req.query;
    const where = sport ? { sport: String(sport) } : {};

    const courts = await prisma.court.findMany({
      where
    });
    res.json(courts);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getCourtById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const court = await prisma.court.findUnique({
      where: { id: String(id) }
    });
    
    if (!court) {
      return res.status(404).json({ error: 'Pista no encontrada' });
    }
    
    res.json(court);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createCourt = async (req: Request, res: Response) => {
  try {
    const data = courtSchema.parse(req.body);
    const court = await prisma.court.create({
      data: {
        ...data,
        pricePerHour: data.pricePerHour, // Decimal handling might need care if strictly typed, but Prisma handles number to Decimal
      },
    });
    res.status(201).json(court);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateCourt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = courtSchema.partial().parse(req.body);
    const court = await prisma.court.update({
      where: { id: String(id) },
      data,
    });
    res.json(court);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteCourt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.court.delete({ where: { id: String(id) } });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
