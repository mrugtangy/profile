import fs from 'fs/promises';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { DatabaseAdapter, DbType, SQLiteConfig, AdminUser, MessageRecord } from '../types.js';

export class SQLiteAdapter implements DatabaseAdapter {
  type: DbType = 'sqlite';
  private filepath: string;
  private db: Database | null = null;
  private SQL: any = null;

  constructor(config: SQLiteConfig) {
    this.filepath = config.filepath || 'data/app.db';
  }

  private async ensureDb(): Promise<Database> {
    if (this.db) return this.db;

    if (!this.SQL) {
      this.SQL = await initSqlJs();
    }

    const absolutePath = path.isAbsolute(this.filepath)
      ? this.filepath
      : path.join(process.cwd(), this.filepath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    try {
      const fileBuffer = await fs.readFile(absolutePath);
      this.db = new this.SQL.Database(fileBuffer);
    } catch {
      // File doesn't exist yet, create a new DB
      this.db = new this.SQL.Database();
      await this.persist();
    }

    return this.db;
  }

  private async persist(): Promise<void> {
    if (!this.db) return;
    const absolutePath = path.isAbsolute(this.filepath)
      ? this.filepath
      : path.join(process.cwd(), this.filepath);

    const data = this.db.export();
    const buffer = Buffer.from(data);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const db = await this.ensureDb();
      db.exec('SELECT 1');
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'SQLite connection error' };
    }
  }

  async initializeSchema(): Promise<void> {
    const db = await this.ensureDb();
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0
      );
    `);

    await this.persist();
  }

  async getAdmins(): Promise<AdminUser[]> {
    const db = await this.ensureDb();
    const res = db.exec('SELECT * FROM admins ORDER BY createdAt ASC');
    if (!res.length) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row) => {
      const admin: any = {};
      columns.forEach((col, idx) => {
        admin[col] = row[idx];
      });
      return {
        id: String(admin.id),
        username: String(admin.username),
        passwordHash: String(admin.passwordHash),
        enabled: Boolean(admin.enabled),
        createdAt: String(admin.createdAt),
        updatedAt: String(admin.updatedAt),
      };
    });
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const admins = await this.getAdmins();
    return admins.find((a) => a.id === id) || null;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const admins = await this.getAdmins();
    return admins.find((a) => a.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async createAdmin(adminData: { username: string; passwordHash: string; enabled?: boolean }): Promise<AdminUser> {
    const db = await this.ensureDb();
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const enabled = adminData.enabled !== undefined ? (adminData.enabled ? 1 : 0) : 1;

    const stmt = db.prepare(
      'INSERT INTO admins (id, username, passwordHash, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run([id, adminData.username, adminData.passwordHash, enabled, now, now]);
    stmt.free();

    await this.persist();

    return {
      id,
      username: adminData.username,
      passwordHash: adminData.passwordHash,
      enabled: Boolean(enabled),
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateAdmin(id: string, updates: Partial<{ username: string; passwordHash: string; enabled: boolean }>): Promise<AdminUser | null> {
    const db = await this.ensureDb();
    const current = await this.getAdminById(id);
    if (!current) return null;

    const newUsername = updates.username !== undefined ? updates.username : current.username;
    const newPasswordHash = updates.passwordHash !== undefined ? updates.passwordHash : current.passwordHash;
    const newEnabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (current.enabled ? 1 : 0);
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'UPDATE admins SET username = ?, passwordHash = ?, enabled = ?, updatedAt = ? WHERE id = ?'
    );
    stmt.run([newUsername, newPasswordHash, newEnabled, now, id]);
    stmt.free();

    await this.persist();

    return {
      id,
      username: newUsername,
      passwordHash: newPasswordHash,
      enabled: Boolean(newEnabled),
      createdAt: current.createdAt,
      updatedAt: now,
    };
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const db = await this.ensureDb();
    const stmt = db.prepare('DELETE FROM admins WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    await this.persist();
    return true;
  }

  async countAdmins(): Promise<number> {
    const admins = await this.getAdmins();
    return admins.filter((a) => a.enabled).length;
  }

  async getSettings(): Promise<any> {
    const db = await this.ensureDb();
    const res = db.exec("SELECT data FROM settings WHERE id = 'main'");
    if (!res.length || !res[0].values.length) return null;
    try {
      return JSON.parse(String(res[0].values[0][0]));
    } catch {
      return null;
    }
  }

  async saveSettings(settings: any): Promise<void> {
    const db = await this.ensureDb();
    const jsonStr = JSON.stringify(settings);
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO settings (id, data) VALUES ('main', ?)"
    );
    stmt.run([jsonStr]);
    stmt.free();
    await this.persist();
  }

  async getLinks(): Promise<Record<string, string>> {
    const db = await this.ensureDb();
    const res = db.exec('SELECT id, path FROM links');
    if (!res.length) return {};
    const links: Record<string, string> = {};
    res[0].values.forEach(([id, p]) => {
      links[String(id)] = String(p);
    });
    return links;
  }

  async saveLink(id: string, filePath: string): Promise<void> {
    const db = await this.ensureDb();
    const stmt = db.prepare('INSERT OR REPLACE INTO links (id, path) VALUES (?, ?)');
    stmt.run([id, filePath]);
    stmt.free();
    await this.persist();
  }

  async getMessages(): Promise<MessageRecord[]> {
    const db = await this.ensureDb();
    const res = db.exec('SELECT * FROM messages ORDER BY createdAt DESC');
    if (!res.length) return [];
    const columns = res[0].columns;

    return res[0].values.map((row) => {
      const msg: any = {};
      columns.forEach((col, idx) => {
        msg[col] = row[idx];
      });
      return {
        id: String(msg.id),
        name: String(msg.name),
        email: String(msg.email),
        subject: String(msg.subject),
        message: String(msg.message),
        createdAt: String(msg.createdAt),
        read: Boolean(msg.read),
      };
    });
  }

  async addMessage(msg: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): Promise<MessageRecord> {
    const db = await this.ensureDb();
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO messages (id, name, email, subject, message, createdAt, read) VALUES (?, ?, ?, ?, ?, ?, 0)'
    );
    stmt.run([id, msg.name, msg.email, msg.subject, msg.message, now]);
    stmt.free();
    await this.persist();

    return {
      id,
      name: msg.name,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      createdAt: now,
      read: false,
    };
  }

  async updateMessage(id: string, updates: Partial<MessageRecord>): Promise<void> {
    const db = await this.ensureDb();
    if (updates.read !== undefined) {
      const stmt = db.prepare('UPDATE messages SET read = ? WHERE id = ?');
      stmt.run([updates.read ? 1 : 0, id]);
      stmt.free();
      await this.persist();
    }
  }

  async deleteMessage(id: string): Promise<boolean> {
    const db = await this.ensureDb();
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    await this.persist();
    return true;
  }
}
