import { Router } from 'express';
import { getStats } from '../controllers/stats.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, authorizeRole(['ADMIN']), getStats);

export default router;
