import { Router } from 'express';
import { getCourts, getCourtById, createCourt, updateCourt, deleteCourt } from '../controllers/court.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getCourts);
router.get('/:id', getCourtById);
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'STAFF']), createCourt);
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'STAFF']), updateCourt);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN', 'STAFF']), deleteCourt);

export default router;
