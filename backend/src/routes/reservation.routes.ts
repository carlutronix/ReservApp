import { Router } from 'express';
import { getReservations, createReservation, updateReservation, cancelReservation, exportReservationsCSV } from '../controllers/reservation.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/export', authorizeRole(['ADMIN']), exportReservationsCSV);
router.get('/', getReservations);
router.post('/', createReservation);
router.put('/:id', updateReservation);
router.put('/:id/cancel', cancelReservation);

export default router;
