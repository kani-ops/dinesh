import { Request, Response } from 'express';
import { query } from '../config/db';

export const getAttendanceByDate = async (req: Request, res: Response) => {
  const dateStr = req.query.date as string;

  if (!dateStr) {
    return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD)' });
  }

  try {
    // Get all members and join with attendance for this specific date
    // We show all active/expired members, plus any inactive member who has an attendance record on this day
    const result = await query(`
      SELECT 
        m.member_id, m.name, m.phone, m.status as membership_status,
        a.status as attendance_status, a.time as attendance_time
      FROM members m
      LEFT JOIN attendance a ON m.member_id = a.member_id AND a.date = $1
      WHERE m.status != 'Inactive' OR a.id IS NOT NULL
      ORDER BY m.id DESC
    `, [dateStr]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  const { member_id, date, status, time } = req.body;

  if (!member_id || !date || !status || !time) {
    return res.status(400).json({ message: 'member_id, date, status, and time are required' });
  }

  try {
    // Check if attendance already exists for this member on this date
    const checkResult = await query(
      'SELECT id FROM attendance WHERE member_id = $1 AND date = $2',
      [member_id, date]
    );

    let result;
    if (checkResult.rows.length > 0) {
      // Update existing record
      result = await query(
        'UPDATE attendance SET status = $1, time = $2 WHERE member_id = $3 AND date = $4 RETURNING *',
        [status, time, member_id, date]
      );
    } else {
      // Insert new record
      result = await query(
        'INSERT INTO attendance (member_id, date, time, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [member_id, date, time, status]
      );
    }

    // After marking attendance, if the status is Present, check if the member is Inactive
    // and automatically reactivate them.
    if (status === 'Present') {
      const memberCheck = await query('SELECT status, membership_expiry FROM members WHERE member_id = $1', [member_id]);
      if (memberCheck.rows.length > 0) {
        const member = memberCheck.rows[0];
        if (member.status === 'Inactive') {
          const isExpired = new Date(member.membership_expiry) < new Date(date);
          const newStatus = isExpired ? 'Expired' : 'Active';
          await query('UPDATE members SET status = $1 WHERE member_id = $2', [newStatus, member_id]);
        }
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const getMemberAttendanceStats = async (req: Request, res: Response) => {
  const { memberId } = req.params;

  try {
    const statsResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days
      FROM attendance
      WHERE member_id = $1
    `, [memberId]);

    res.json(statsResult.rows[0]);
  } catch (error) {
    console.error('Error fetching member attendance stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const deleteAttendance = async (req: Request, res: Response) => {
  const { member_id, date } = req.body;

  if (!member_id || !date) {
    return res.status(400).json({ message: 'member_id and date are required' });
  }

  try {
    await query('DELETE FROM attendance WHERE member_id = $1 AND date = $2', [member_id, date]);
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
