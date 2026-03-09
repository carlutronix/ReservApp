import { Router } from 'express';
import { createMaintenance, getMaintenances, deleteFutureMaintenances } from '../controllers/maintenance.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getMaintenances);
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'STAFF']), createMaintenance);
router.delete('/:courtId', authenticateToken, authorizeRole(['ADMIN', 'STAFF']), deleteFutureMaintenances);

export default router;
