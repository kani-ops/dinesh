import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, deleteMember, reactivateMember, getInactiveMembers } from '../controllers/memberController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/', authenticateToken, getMembers);
router.get('/inactive', authenticateToken, getInactiveMembers);
router.get('/:memberId', authenticateToken, getMemberById);
router.post('/', authenticateToken, upload.single('photo'), createMember);
router.put('/:memberId', authenticateToken, upload.single('photo'), updateMember);
router.delete('/:memberId', authenticateToken, deleteMember);
router.post('/:memberId/reactivate', authenticateToken, reactivateMember);

export default router;
