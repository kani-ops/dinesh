import { Router } from 'express';
import { getAttendanceByDate, markAttendance, deleteAttendance, getMemberAttendanceStats } from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAttendanceByDate);
router.post('/', authenticateToken, markAttendance);
router.delete('/', authenticateToken, deleteAttendance);
router.get('/:memberId/stats', authenticateToken, getMemberAttendanceStats);

export default router;
