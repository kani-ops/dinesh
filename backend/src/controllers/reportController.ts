import { Request, Response } from 'express';
import { query } from '../config/db';
import { syncMemberStatuses } from './memberController';

const getMonthLabel = (date: Date) => {
  return date.toLocaleString('default', { month: 'short' });
};

const calculateNewMembersMonthly = (members: any[], today: Date) => {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    const count = members.filter(m => {
      if (!m.joining_date) return false;
      const jd = new Date(m.joining_date);
      return jd.getFullYear() === year && jd.getMonth() === month;
    }).length;

    result.push({
      month: `${getMonthLabel(d)} ${year.toString().slice(-2)}`,
      count
    });
  }
  return result;
};

const calculateAttendanceMonthly = (attendance: any[], today: Date) => {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    const monthlyRecords = attendance.filter(a => {
      if (!a.date) return false;
      const ad = new Date(a.date);
      return ad.getFullYear() === year && ad.getMonth() === month;
    });

    const total = monthlyRecords.length;
    const present = monthlyRecords.filter(a => a.status === 'Present').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    result.push({
      month: `${getMonthLabel(d)} ${year.toString().slice(-2)}`,
      rate
    });
  }
  return result;
};

export const getDashboardStats = async (req: Request, res: Response) => {
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];

  // Sync statuses first
  await syncMemberStatuses(todayStr);

  try {
    const today = new Date(todayStr);
    
    // Total, Active, Inactive, Expired counts
    const countsResult = await query(`
      SELECT 
        COUNT(id) as total,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'Expired' THEN 1 END) as expired
      FROM members
    `);
    const counts = countsResult.rows[0];

    // Present / Absent Today (or on todayStr)
    const attendanceResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent
      FROM attendance
      WHERE date = $1
    `, [todayStr]);
    const attendanceCounts = attendanceResult.rows[0];
    
    const presentToday = parseInt(attendanceCounts.present) || 0;
    const markedAbsentToday = parseInt(attendanceCounts.absent) || 0;
    
    // If no attendance marked today, all active + expired members are technically "Absent" or unrecorded.
    const activeAndExpiredCount = (parseInt(counts.active) || 0) + (parseInt(counts.expired) || 0);
    const unmarkedCount = Math.max(0, activeAndExpiredCount - (presentToday + markedAbsentToday));
    const absentToday = markedAbsentToday + unmarkedCount;

    // Fees statistics
    // Fees Due Today (expiring today)
    const dueTodayResult = await query('SELECT COUNT(id) as count FROM members WHERE membership_expiry = $1', [todayStr]);
    
    // Fees Expiring in Next 7 Days (expiring between tomorrow and today+7)
    const next7DaysDate = new Date(today);
    next7DaysDate.setDate(today.getDate() + 7);
    const next7DaysStr = next7DaysDate.toISOString().split('T')[0];
    const expiring7DaysResult = await query(
      'SELECT COUNT(id) as count FROM members WHERE membership_expiry > $1 AND membership_expiry <= $2',
      [todayStr, next7DaysStr]
    );

    // Overdue (expired)
    const overdueResult = await query('SELECT COUNT(id) as count FROM members WHERE status = \'Expired\'');

    // Graph 1: Membership Type Distribution
    const distributionResult = await query(`
      SELECT membership_type, COUNT(id) as count
      FROM members
      GROUP BY membership_type
    `);
    
    // Graph 2: Monthly New Members (Last 6 Months)
    const membersResult = await query('SELECT joining_date FROM members');
    const newMembersMonthly = calculateNewMembersMonthly(membersResult.rows, today);

    // Graph 3: Monthly Attendance % (Last 6 Months)
    const attendanceHistoryResult = await query('SELECT date, status FROM attendance');
    const attendanceMonthly = calculateAttendanceMonthly(attendanceHistoryResult.rows, today);

    // Notifications:
    // 1. Membership expires within 7 days
    const expiringSoonAlerts = await query(`
      SELECT member_id, name, phone, membership_expiry 
      FROM members 
      WHERE membership_expiry > $1 AND membership_expiry <= $2 AND status != 'Inactive'
    `, [todayStr, next7DaysStr]);

    // 2. Membership expired
    const expiredAlerts = await query(`
      SELECT member_id, name, phone, membership_expiry 
      FROM members 
      WHERE status = 'Expired'
    `);

    // 3. Absent for more than 14 days (inactive attendance)
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];
    
    const absent14DaysAlerts = await query(`
      SELECT m.member_id, m.name, m.phone,
        (SELECT MAX(date) FROM attendance WHERE member_id = m.member_id AND status = 'Present') as last_present_date
      FROM members m
      WHERE 
        m.status = 'Inactive'
        AND (
          (SELECT MAX(date) FROM attendance WHERE member_id = m.member_id AND status = 'Present') < $1
          OR NOT EXISTS (SELECT 1 FROM attendance WHERE member_id = m.member_id AND status = 'Present')
        )
    `, [fourteenDaysAgoStr]);

    res.json({
      summary: {
        totalMembers: parseInt(counts.total) || 0,
        activeMembers: parseInt(counts.active) || 0,
        inactiveMembers: parseInt(counts.inactive) || 0,
        expiredMembers: parseInt(counts.expired) || 0,
        presentToday,
        absentToday,
        feesDueToday: parseInt(dueTodayResult.rows[0].count) || 0,
        feesExpiring7Days: parseInt(expiring7DaysResult.rows[0].count) || 0,
        feesOverdue: parseInt(overdueResult.rows[0].count) || 0
      },
      charts: {
        typeDistribution: distributionResult.rows,
        newMembers: newMembersMonthly,
        attendanceRate: attendanceMonthly
      },
      alerts: {
        expiringSoon: expiringSoonAlerts.rows,
        expired: expiredAlerts.rows,
        absent14Days: absent14DaysAlerts.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAttendanceReport = async (req: Request, res: Response) => {
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];

  try {
    // 1. Detailed Member Attendance %
    const memberPercentageResult = await query(`
      SELECT 
        m.member_id, m.name, m.phone, m.status,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_days,
        COUNT(a.id) as total_days
      FROM members m
      LEFT JOIN attendance a ON m.member_id = a.member_id
      GROUP BY m.member_id, m.name, m.phone, m.status, m.id
      ORDER BY m.id DESC
    `);

    const membersWithPercentage = memberPercentageResult.rows.map(row => {
      const present = parseInt(row.present_days) || 0;
      const total = parseInt(row.total_days) || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        member_id: row.member_id,
        name: row.name,
        phone: row.phone,
        status: row.status,
        present_days: present,
        absent_days: parseInt(row.absent_days) || 0,
        total_days: total,
        attendance_percentage: rate
      };
    });

    // 2. Most Regular Members (Top 10, minimum 1 day recorded)
    const regularMembers = [...membersWithPercentage]
      .filter(m => m.total_days > 0)
      .sort((a, b) => b.attendance_percentage - a.attendance_percentage)
      .slice(0, 10);

    // 3. Least Active Members (Bottom 10, or absent > 14 days)
    const leastActiveMembers = [...membersWithPercentage]
      .filter(m => m.total_days > 0 || m.status === 'Inactive')
      .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
      .slice(0, 10);

    res.json({
      membersPercentage: membersWithPercentage,
      regularMembers,
      leastActiveMembers
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFeeReport = async (req: Request, res: Response) => {
  const todayStr = (req.query.today as string) || new Date().toISOString().split('T')[0];

  try {
    const today = new Date(todayStr);
    
    // 1. Collected This Month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    // End of month: we can just get all payments where payment_date is >= startOfMonth and <= todayStr
    const collectedResult = await query(`
      SELECT p.*, m.name as member_name, m.phone
      FROM payments p
      JOIN members m ON p.member_id = m.member_id
      WHERE p.payment_date >= $1 AND p.payment_date <= $2
      ORDER BY p.payment_date DESC
    `, [startOfMonth, todayStr]);

    const totalCollected = collectedResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // 2. Expired Memberships
    const expiredResult = await query(`
      SELECT member_id, name, phone, membership_expiry, status
      FROM members
      WHERE status = 'Expired'
      ORDER BY membership_expiry ASC
    `);

    // 3. Upcoming Renewals (next 30 days)
    const next30DaysDate = new Date(today);
    next30DaysDate.setDate(today.getDate() + 30);
    const next30DaysStr = next30DaysDate.toISOString().split('T')[0];
    const renewalsResult = await query(`
      SELECT member_id, name, phone, membership_type, membership_expiry, status
      FROM members
      WHERE membership_expiry > $1 AND membership_expiry <= $2 AND status != 'Inactive'
      ORDER BY membership_expiry ASC
    `, [todayStr, next30DaysStr]);

    // 4. Pending Fees (Members who are expired or expiring soon, let's show them here)
    const pendingResult = await query(`
      SELECT member_id, name, phone, status, membership_type, membership_expiry
      FROM members
      WHERE status = 'Expired' OR (membership_expiry >= $1 AND membership_expiry <= $2 AND status = 'Active')
      ORDER BY status DESC, membership_expiry ASC
    `, [todayStr, next30DaysStr]);

    res.json({
      collected: {
        payments: collectedResult.rows,
        total: totalCollected
      },
      expiredMemberships: expiredResult.rows,
      upcomingRenewals: renewalsResult.rows,
      pendingFees: pendingResult.rows
    });
  } catch (error) {
    console.error('Error fetching fee report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
