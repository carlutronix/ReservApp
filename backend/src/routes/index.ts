import { Router } from 'express';
import authRoutes from './auth.routes';
import courtRoutes from './court.routes';
import reservationRoutes from './reservation.routes';
import userRoutes from './user.routes';
import statsRoutes from './stats.routes';
import maintenanceRoutes from './maintenance.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courts', courtRoutes);
router.use('/reservations', reservationRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);
router.use('/maintenances', maintenanceRoutes);

export default router;
