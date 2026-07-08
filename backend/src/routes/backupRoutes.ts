import { Router } from 'express';
import { exportBackup, importRestore } from '../controllers/backupController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/export', authenticateToken, exportBackup);
router.post('/restore', authenticateToken, importRestore);

export default router;
