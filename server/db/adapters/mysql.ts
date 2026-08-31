import mysql from 'mysql2/promise';
import { DatabaseAdapter, DbType, MySQLConfig, AdminUser, MessageRecord } from '../types.js';

export class MySQLAdapter implements DatabaseAdapter {
  type: DbType = 'mysql';
  private config: MySQLConfig;
  private pool: mysql.Pool | null = null;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  private getPool(): mysql.Pool {
    if (this.pool) return this.pool;

    this.pool = mysql.createPool({
      host: this.config.host || 'localhost',
      port: Number(this.config.port) || 3306,
      user: this.config.username || 'root',
      password: this.config.password || '',
      database: this.config.database || 'myapp_db',
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 5000,
    });

    return this.pool;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const pool = mysql.createPool({
        host: this.config.host || 'localhost',
        port: Number(this.config.port) || 3306,
        user: this.config.username || 'root',
        password: this.config.password || '',
        database: this.config.database || 'myapp_db',
        connectTimeout: 5000,
      });

      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      await pool.end();
      return { success: true };
    } catch (err: any) {
      // Sanitize password or host details if necessary
      const sanitized = (err.message || 'MySQL Connection failed').replace(/using password: (YES|NO)/gi, 'using password: ***');
      return { success: false, message: sanitized };
    }
  }

  async initializeSchema(): Promise<void> {
    const pool = this.getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(128) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        createdAt VARCHAR(64) NOT NULL,
        updatedAt VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(64) PRIMARY KEY,
        data LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS links (
        id VARCHAR(64) PRIMARY KEY,
        path VARCHAR(512) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        createdAt VARCHAR(64) NOT NULL,
        read TINYINT(1) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  async getAdmins(): Promise<AdminUser[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<any[]>('SELECT * FROM admins ORDER BY createdAt ASC');
    return rows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      passwordHash: String(r.passwordHash),
      enabled: Boolean(r.enabled),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const admins = await this.getAdmins();
    return admins.find((a) => a.id === id) || null;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<any[]>('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [username]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: String(r.id),
      username: String(r.username),
      passwordHash: String(r.passwordHash),
      enabled: Boolean(r.enabled),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    };
  }

  async createAdmin(adminData: { username: string; passwordHash: string; enabled?: boolean }): Promise<AdminUser> {
    const pool = this.getPool();
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const enabled = adminData.enabled !== undefined ? (adminData.enabled ? 1 : 0) : 1;

    await pool.query(
      'INSERT INTO admins (id, username, passwordHash, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, adminData.username, adminData.passwordHash, enabled, now, now]
    );

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
    const pool = this.getPool();
    const current = await this.getAdminById(id);
    if (!current) return null;

    const newUsername = updates.username !== undefined ? updates.username : current.username;
    const newPasswordHash = updates.passwordHash !== undefined ? updates.passwordHash : current.passwordHash;
    const newEnabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (current.enabled ? 1 : 0);
    const now = new Date().toISOString();

    await pool.query(
      'UPDATE admins SET username = ?, passwordHash = ?, enabled = ?, updatedAt = ? WHERE id = ?',
      [newUsername, newPasswordHash, newEnabled, now, id]
    );

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
    const pool = this.getPool();
    await pool.query('DELETE FROM admins WHERE id = ?', [id]);
    return true;
  }

  async countAdmins(): Promise<number> {
    const admins = await this.getAdmins();
    return admins.filter((a) => a.enabled).length;
  }

  async getSettings(): Promise<any> {
    const pool = this.getPool();
    const [rows] = await pool.query<any[]>("SELECT data FROM settings WHERE id = 'main'");
    if (!rows.length) return null;
    try {
      return JSON.parse(rows[0].data);
    } catch {
      return null;
    }
  }

  async saveSettings(settings: any): Promise<void> {
    const pool = this.getPool();
    const jsonStr = JSON.stringify(settings);
    await pool.query(
      'INSERT INTO settings (id, data) VALUES (\'main\', ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [jsonStr]
    );
  }

  async getLinks(): Promise<Record<string, string>> {
    const pool = this.getPool();
    const [rows] = await pool.query<any[]>('SELECT id, path FROM links');
    const links: Record<string, string> = {};
    rows.forEach((r) => {
      links[String(r.id)] = String(r.path);
    });
    return links;
  }

  async saveLink(id: string, filePath: string): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      'INSERT INTO links (id, path) VALUES (?, ?) ON DUPLICATE KEY UPDATE path = VALUES(path)',
      [id, filePath]
    );
  }

  async getMessages(): Promise<MessageRecord[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<any[]>('SELECT * FROM messages ORDER BY createdAt DESC');
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      subject: String(r.subject),
      message: String(r.message),
      createdAt: String(r.createdAt),
      read: Boolean(r.read),
    }));
  }

  async addMessage(msg: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): Promise<MessageRecord> {
    const pool = this.getPool();
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();

    await pool.query(
      'INSERT INTO messages (id, name, email, subject, message, createdAt, read) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, msg.name, msg.email, msg.subject, msg.message, now]
    );

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
    const pool = this.getPool();
    if (updates.read !== undefined) {
      await pool.query('UPDATE messages SET read = ? WHERE id = ?', [updates.read ? 1 : 0, id]);
    }
  }

  async deleteMessage(id: string): Promise<boolean> {
    const pool = this.getPool();
    await pool.query('DELETE FROM messages WHERE id = ?', [id]);
    return true;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
