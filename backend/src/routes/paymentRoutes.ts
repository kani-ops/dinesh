import { Router } from 'express';
import { createPayment, getPayments, deletePayment } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createPayment);
router.get('/', authenticateToken, getPayments);
router.delete('/:id', authenticateToken, deletePayment);

export default router;
