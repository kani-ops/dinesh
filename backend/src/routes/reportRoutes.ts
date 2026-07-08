import { Router } from 'express';
import { getDashboardStats, getAttendanceReport, getFeeReport } from '../controllers/reportController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/attendance', authenticateToken, getAttendanceReport);
router.get('/fees', authenticateToken, getFeeReport);

export default router;
