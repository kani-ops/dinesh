import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { JWT_SECRET } from '../middleware/authMiddleware';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const adminId = (req as any).adminId;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old and new passwords are required' });
  }

  try {
    const result = await query('SELECT * FROM admins WHERE id = $1', [adminId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE admins SET password = $1 WHERE id = $2', [hashedNewPassword, adminId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
