import { Request, Response } from 'express';
import { query, getDbType } from '../config/db';

export const exportBackup = async (req: Request, res: Response) => {
  try {
    const members = await query('SELECT * FROM members');
    const attendance = await query('SELECT * FROM attendance');
    const payments = await query('SELECT * FROM payments');

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        members: members.rows,
        attendance: attendance.rows,
        payments: payments.rows
      }
    };

    res.setHeader('Content-disposition', `attachment; filename=club-backup-${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2));
    res.end();
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Internal server error during backup generation' });
  }
};

export const importRestore = async (req: Request, res: Response) => {
  const { backupData } = req.body;

  if (!backupData || !backupData.data) {
    return res.status(400).json({ message: 'Invalid backup file payload' });
  }

  const { members, attendance, payments } = backupData.data;

  if (!Array.isArray(members) || !Array.isArray(attendance) || !Array.isArray(payments)) {
    return res.status(400).json({ message: 'Backup file data is missing table arrays' });
  }

  const dbType = getDbType();
  console.log(`Starting database restore on ${dbType}...`);

  try {
    if (dbType === 'postgres') {
      // 1. Truncate tables
      await query('TRUNCATE TABLE attendance, payments, members RESTART IDENTITY CASCADE');

      // 2. Insert members
      for (const m of members) {
        await query(`
          INSERT INTO members (id, member_id, name, phone, email, address, dob, joining_date, membership_type, membership_start, membership_expiry, status, photo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [m.id, m.member_id, m.name, m.phone, m.email, m.address, m.dob, m.joining_date, m.membership_type, m.membership_start, m.membership_expiry, m.status, m.photo]);
      }

      // 3. Insert payments
      for (const p of payments) {
        await query(`
          INSERT INTO payments (id, member_id, payment_date, amount, membership_type, membership_start, membership_expiry, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [p.id, p.member_id, p.payment_date, p.amount, p.membership_type, p.membership_start, p.membership_expiry, p.remarks]);
      }

      // 4. Insert attendance
      for (const a of attendance) {
        await query(`
          INSERT INTO attendance (id, member_id, date, time, status)
          VALUES ($1, $2, $3, $4, $5)
        `, [a.id, a.member_id, a.date, a.time, a.status]);
      }

      // 5. Update Postgres serial sequences to match max restored ID + 1
      await query("SELECT setval('members_id_seq', COALESCE((SELECT MAX(id)+1 FROM members), 1), false)");
      await query("SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id)+1 FROM payments), 1), false)");
      await query("SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id)+1 FROM attendance), 1), false)");

    } else {
      // SQLite restore
      // 1. Delete rows
      await query('DELETE FROM attendance');
      await query('DELETE FROM payments');
      await query('DELETE FROM members');

      // Reset sequences
      await query("DELETE FROM sqlite_sequence WHERE name IN ('attendance', 'payments', 'members')");

      // 2. Insert members
      for (const m of members) {
        await query(`
          INSERT INTO members (id, member_id, name, phone, email, address, dob, joining_date, membership_type, membership_start, membership_expiry, status, photo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [m.id, m.member_id, m.name, m.phone, m.email, m.address, m.dob, m.joining_date, m.membership_type, m.membership_start, m.membership_expiry, m.status, m.photo]);
      }

      // 3. Insert payments
      for (const p of payments) {
        await query(`
          INSERT INTO payments (id, member_id, payment_date, amount, membership_type, membership_start, membership_expiry, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [p.id, p.member_id, p.payment_date, p.amount, p.membership_type, p.membership_start, p.membership_expiry, p.remarks]);
      }

      // 4. Insert attendance
      for (const a of attendance) {
        await query(`
          INSERT INTO attendance (id, member_id, date, time, status)
          VALUES ($1, $2, $3, $4, $5)
        `, [a.id, a.member_id, a.date, a.time, a.status]);
      }
    }

    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Error during database restore:', error);
    res.status(500).json({ message: 'Internal server error during database restore' });
  }
};
