import { Router } from 'express';
import { login, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);

export default router;
