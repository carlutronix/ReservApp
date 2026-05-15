import { Router } from 'express';
import { getReservations, createReservation, updateReservation, cancelReservation, exportReservationsCSV, exportReservationIcs, checkInReservation, getPendingCheckIn } from '../controllers/reservation.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/pending-checkin/:courtId', getPendingCheckIn);

router.get('/export', authorizeRole(['ADMIN']), exportReservationsCSV);
router.get('/:id/ics', exportReservationIcs);
router.get('/', getReservations);
router.post('/', createReservation);
router.put('/:id', updateReservation);
router.put('/:id/cancel', cancelReservation);
router.post('/checkin/:courtId', checkInReservation);

export default router;
