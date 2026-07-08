import { query, getDbType } from '../config/db';
import bcrypt from 'bcryptjs';

export const initDb = async () => {
  const dbType = getDbType();
  console.log(`Initializing database schema for ${dbType}...`);

  try {
    if (dbType === 'postgres') {
      // PostgreSQL schema
      await query(`
        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          member_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100),
          address TEXT,
          dob DATE,
          joining_date DATE NOT NULL,
          membership_type VARCHAR(50) NOT NULL,
          membership_start DATE NOT NULL,
          membership_expiry DATE NOT NULL,
          status VARCHAR(20) NOT NULL,
          photo VARCHAR(255)
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          member_id VARCHAR(50) REFERENCES members(member_id) ON DELETE CASCADE,
          date DATE NOT NULL,
          time VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          UNIQUE(member_id, date)
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          member_id VARCHAR(50) REFERENCES members(member_id) ON DELETE CASCADE,
          payment_date DATE NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          membership_type VARCHAR(50) NOT NULL,
          membership_start DATE NOT NULL,
          membership_expiry DATE NOT NULL,
          remarks TEXT
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL
        );
      `);
    } else {
      // SQLite schema
      await query(`
        CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          address TEXT,
          dob TEXT,
          joining_date TEXT NOT NULL,
          membership_type TEXT NOT NULL,
          membership_start TEXT NOT NULL,
          membership_expiry TEXT NOT NULL,
          status TEXT NOT NULL,
          photo TEXT
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          status TEXT NOT NULL,
          UNIQUE(member_id, date)
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
          payment_date TEXT NOT NULL,
          amount REAL NOT NULL,
          membership_type TEXT NOT NULL,
          membership_start TEXT NOT NULL,
          membership_expiry TEXT NOT NULL,
          remarks TEXT
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        );
      `);
    }

    // Seed default admin if it doesn't exist
    const adminCheck = await query(`SELECT * FROM admins WHERE username = $1`, ['admin']);
    if (adminCheck.rows.length === 0) {
      console.log("Seeding default admin account...");
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await query(`INSERT INTO admins (username, password) VALUES ($1, $2)`, ['admin', hashedPassword]);
    }

    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    throw error;
  }
};
