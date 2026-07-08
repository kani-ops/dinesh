import { Request, Response } from 'express';
import { query } from '../config/db';

export const createPayment = async (req: Request, res: Response) => {
  const { member_id, payment_date, amount, membership_type, membership_start, remarks } = req.body;

  if (!member_id || !payment_date || !amount || !membership_type || !membership_start) {
    return res.status(400).json({ message: 'member_id, payment_date, amount, membership_type, and membership_start are required' });
  }

  try {
    // Check if member exists
    const memberCheck = await query('SELECT * FROM members WHERE member_id = $1', [member_id]);
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Auto-calculate expiry date
    const start = new Date(membership_start);
    const expiry = new Date(start);
    if (membership_type === 'Monthly') expiry.setMonth(start.getMonth() + 1);
    else if (membership_type === '3 Months') expiry.setMonth(start.getMonth() + 3);
    else if (membership_type === '6 Months') expiry.setMonth(start.getMonth() + 6);
    else if (membership_type === 'Yearly') expiry.setFullYear(start.getFullYear() + 1);

    const expiryStr = expiry.toISOString().split('T')[0];

    // Insert payment record
    const paymentResult = await query(`
      INSERT INTO payments (member_id, payment_date, amount, membership_type, membership_start, membership_expiry, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [member_id, payment_date, amount, membership_type, membership_start, expiryStr, remarks || null]);

    // Update member's membership details and set status to Active
    await query(`
      UPDATE members
      SET membership_type = $1, membership_start = $2, membership_expiry = $3, status = 'Active'
      WHERE member_id = $4
    `, [membership_type, membership_start, expiryStr, member_id]);

    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    // Get all payments, ordered by payment date desc
    const result = await query(`
      SELECT p.*, m.name as member_name
      FROM payments p
      JOIN members m ON p.member_id = m.member_id
      ORDER BY p.payment_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM payments WHERE id = $1', [id]);
    res.json({ message: 'Payment record deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
