import { Request, Response } from 'express';
import { query } from '../config/db';
import path from 'path';
import fs from 'fs';

// Helper to sync statuses dynamically based on date logic
export const syncMemberStatuses = async (todayStr: string) => {
  try {
    const today = new Date(todayStr);
    
    // Calculate 14 days ago
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    // 1. Mark as Inactive if:
    // - Membership is expired for more than 14 days
    // - OR they have not been present in the last 14 days (and they joined more than 14 days ago)
    
    // First, identify members who should be Inactive
    // We get last present date for each member
    await query(`
      UPDATE members 
      SET status = 'Inactive'
      WHERE 
        membership_expiry < $1
        OR EXISTS (
          SELECT 1 FROM (
            SELECT member_id, MAX(date) as last_present 
            FROM attendance 
            WHERE status = 'Present' 
            GROUP BY member_id
          ) a 
          WHERE a.member_id = members.member_id AND a.last_present < $1
        )
        OR (
          joining_date < $1 
          AND NOT EXISTS (
            SELECT 1 FROM attendance WHERE member_id = members.member_id AND status = 'Present'
          )
        )
    `, [fourteenDaysAgoStr]);

    // 2. Mark as Expired if:
    // - Membership expiry is before today
    // - And status is not Inactive
    await query(`
      UPDATE members
      SET status = 'Expired'
      WHERE 
        status != 'Inactive'
        AND membership_expiry < $1
    `, [todayStr]);

    // 3. Mark as Active if:
    // - Membership expiry is today or in the future
    // - And status is not Inactive (still active attendance-wise)
    await query(`
      UPDATE members
      SET status = 'Active'
      WHERE 
        status != 'Inactive'
        AND membership_expiry >= $1
    `, [todayStr]);
  } catch (error) {
    console.error("Error syncing member statuses:", error);
  }
};

const getNextMemberId = async () => {
  const result = await query("SELECT member_id FROM members ORDER BY id DESC LIMIT 1");
  if (result.rows.length === 0) {
    return 'MEM-1001';
  }
  const lastId = result.rows[0].member_id;
  const matches = lastId.match(/MEM-(\d+)/);
  if (matches && matches[1]) {
    const nextNum = parseInt(matches[1]) + 1;
    return `MEM-${nextNum}`;
  }
  return 'MEM-1001';
};

export const getMembers = async (req: Request, res: Response) => {
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];
  
  // Sync statuses first
  await syncMemberStatuses(todayStr);

  try {
    const result = await query('SELECT * FROM members ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];
  
  await syncMemberStatuses(todayStr);

  try {
    const memberResult = await query('SELECT * FROM members WHERE member_id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Get attendance stats
    const attendanceStats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days,
        COUNT(id) as total_days
      FROM attendance
      WHERE member_id = $1
    `, [memberId]);

    // Get payment history
    const paymentsResult = await query('SELECT * FROM payments WHERE member_id = $1 ORDER BY payment_date DESC', [memberId]);
    
    // Get full attendance history
    const attendanceResult = await query('SELECT * FROM attendance WHERE member_id = $1 ORDER BY date DESC', [memberId]);

    const member = memberResult.rows[0];
    const stats = attendanceStats.rows[0];
    
    const presentDays = parseInt(stats.present_days) || 0;
    const absentDays = parseInt(stats.absent_days) || 0;
    const totalDays = parseInt(stats.total_days) || 0;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    res.json({
      member,
      stats: {
        presentDays,
        absentDays,
        attendancePercentage
      },
      payments: paymentsResult.rows,
      attendance: attendanceResult.rows
    });
  } catch (error) {
    console.error('Error fetching member details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createMember = async (req: Request, res: Response) => {
  const { name, phone, email, address, dob, joining_date, membership_type, membership_start } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!name || !phone || !joining_date || !membership_type || !membership_start) {
    return res.status(400).json({ message: 'Name, phone, joining date, membership type, and start date are required' });
  }

  try {
    const member_id = await getNextMemberId();
    
    // Calculate expiry based on start date
    const start = new Date(membership_start);
    const expiry = new Date(start);
    if (membership_type === 'Monthly') expiry.setMonth(start.getMonth() + 1);
    else if (membership_type === '3 Months') expiry.setMonth(start.getMonth() + 3);
    else if (membership_type === '6 Months') expiry.setMonth(start.getMonth() + 6);
    else if (membership_type === 'Yearly') expiry.setFullYear(start.getFullYear() + 1);
    
    const expiryStr = expiry.toISOString().split('T')[0];
    
    // Initial status set to Active (or will be synced on fetch)
    const status = 'Active';

    const result = await query(`
      INSERT INTO members (member_id, name, phone, email, address, dob, joining_date, membership_type, membership_start, membership_expiry, status, photo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [member_id, name, phone, email || null, address || null, dob || null, joining_date, membership_type, membership_start, expiryStr, status, photo]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { name, phone, email, address, dob, joining_date, membership_type, membership_start, membership_expiry, status } = req.body;
  
  try {
    // Check if member exists
    const currentMemberResult = await query('SELECT photo FROM members WHERE member_id = $1', [memberId]);
    if (currentMemberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    let photo = currentMemberResult.rows[0].photo;
    if (req.file) {
      // Delete old photo if exists
      if (photo) {
        const oldPhotoPath = path.resolve(__dirname, '../../../uploads', photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      photo = req.file.filename;
    }

    const result = await query(`
      UPDATE members 
      SET name = $1, phone = $2, email = $3, address = $4, dob = $5, joining_date = $6, membership_type = $7, membership_start = $8, membership_expiry = $9, status = $10, photo = $11
      WHERE member_id = $12
      RETURNING *
    `, [name, phone, email || null, address || null, dob || null, joining_date, membership_type, membership_start, membership_expiry, status, photo, memberId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  const { memberId } = req.params;

  try {
    const memberResult = await query('SELECT photo FROM members WHERE member_id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const photo = memberResult.rows[0].photo;
    if (photo) {
      const photoPath = path.resolve(__dirname, '../../../uploads', photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await query('DELETE FROM members WHERE member_id = $1', [memberId]);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const reactivateMember = async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const todayStr = (req.body.today as string) || new Date().toISOString().split('T')[0];

  try {
    const memberResult = await query('SELECT * FROM members WHERE member_id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = memberResult.rows[0];

    // Calculate new expiry date based on their membership type starting today
    const start = new Date(todayStr);
    const expiry = new Date(start);
    if (member.membership_type === 'Monthly') expiry.setMonth(start.getMonth() + 1);
    else if (member.membership_type === '3 Months') expiry.setMonth(start.getMonth() + 3);
    else if (member.membership_type === '6 Months') expiry.setMonth(start.getMonth() + 6);
    else if (member.membership_type === 'Yearly') expiry.setFullYear(start.getFullYear() + 1);

    const expiryStr = expiry.toISOString().split('T')[0];

    const result = await query(`
      UPDATE members 
      SET status = 'Active', membership_start = $1, membership_expiry = $2
      WHERE member_id = $3
      RETURNING *
    `, [todayStr, expiryStr, memberId]);

    // Also add a log/mock payment record for reactivation or just let them record a payment separately.
    // We just update the member profile here.
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error reactivating member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInactiveMembers = async (req: Request, res: Response) => {
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];
  
  await syncMemberStatuses(todayStr);

  try {
    // A member is inactive if:
    // - Status is 'Inactive'
    // Let's retrieve them and calculate their details:
    // - Member Name, Phone Number, Last Attendance Date, Days Since Last Present, Membership Status, Reason
    
    // We can query members and perform subqueries for last attendance
    const result = await query(`
      SELECT 
        m.member_id, m.name, m.phone, m.status as membership_status, m.membership_expiry, m.joining_date,
        (SELECT MAX(date) FROM attendance WHERE member_id = m.member_id AND status = 'Present') as last_present_date
      FROM members m
      WHERE m.status = 'Inactive'
      ORDER BY m.id DESC
    `);

    const inactiveList = result.rows.map(row => {
      const today = new Date(todayStr);
      let lastPresent = row.last_present_date ? new Date(row.last_present_date) : null;
      
      let daysSinceLastPresent = 999; // Default high number if never present
      if (lastPresent) {
        const diffTime = Math.abs(today.getTime() - lastPresent.getTime());
        daysSinceLastPresent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // If they never attended, count days since joining
        const joining = new Date(row.joining_date);
        const diffTime = Math.abs(today.getTime() - joining.getTime());
        daysSinceLastPresent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Reason:
      // - Absent X Days
      // - Membership Expired
      // - Both
      const isExpired = new Date(row.membership_expiry) < today;
      const isAbsent14Days = daysSinceLastPresent > 14;

      let reason = '';
      if (isExpired && isAbsent14Days) {
        reason = `Both (Expired & Absent ${daysSinceLastPresent} Days)`;
      } else if (isExpired) {
        reason = 'Membership Expired';
      } else if (isAbsent14Days) {
        reason = `Absent ${daysSinceLastPresent} Days`;
      } else {
        reason = 'Manually Set / Expired';
      }

      return {
        member_id: row.member_id,
        name: row.name,
        phone: row.phone,
        last_present_date: row.last_present_date || 'Never',
        daysSinceLastPresent,
        membership_status: row.membership_status,
        reason
      };
    });

    res.json(inactiveList);
  } catch (error) {
    console.error('Error fetching inactive members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
