import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const isPg = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: Database.Database | null = null;

if (isPg) {
  console.log("Database: Using PostgreSQL");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
  });
} else {
  console.log("Database: Using better-sqlite3");
  const dbDir = path.resolve(__dirname, '../../..');
  const dbPath = process.env.DATABASE_PATH
    ? path.join(process.env.DATABASE_PATH, 'club.db')
    : path.resolve(dbDir, 'club.db');

  const dbDirPath = path.dirname(dbPath);
  if (!fs.existsSync(dbDirPath)) {
    fs.mkdirSync(dbDirPath, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

export interface QueryResult {
  rows: any[];
}

const convertSqliteParams = (sql: string): string => {
  return sql.replace(/\$(\d+)/g, '?');
};

export const query = (text: string, params?: any[]): Promise<QueryResult> => {
  if (isPg && pgPool) {
    return pgPool.query(text, params);
  } else if (sqliteDb) {
    try {
      const convertedSql = convertSqliteParams(text);
      const stmt = sqliteDb.prepare(convertedSql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return Promise.resolve({ rows });
    } catch (error) {
      console.error("better-sqlite3 Error:", error, "Query:", text, "Params:", params);
      return Promise.reject(error);
    }
  } else {
    return Promise.reject(new Error("Database not initialized"));
  }
};

export const getDbType = (): 'postgres' | 'sqlite' => {
  return isPg ? 'postgres' : 'sqlite';
};
