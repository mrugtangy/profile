import { MongoClient, Db } from 'mongodb';
import { DatabaseAdapter, DbType, MongoConfig, AdminUser, MessageRecord } from '../types.js';

export class MongoAdapter implements DatabaseAdapter {
  type: DbType = 'mongodb';
  private config: MongoConfig;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(config: MongoConfig) {
    this.config = config;
  }

  private async getDb(): Promise<Db> {
    if (this.db) return this.db;

    let uri = this.config.uri || 'mongodb://localhost:27017';
    if (this.config.options) {
      const sep = uri.includes('?') ? '&' : '?';
      uri = `${uri}${sep}${this.config.options}`;
    }

    this.client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await this.client.connect();
    this.db = this.client.db(this.config.database || 'myapp_db');
    return this.db;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      let uri = this.config.uri || 'mongodb://localhost:27017';
      if (this.config.options) {
        const sep = uri.includes('?') ? '&' : '?';
        uri = `${uri}${sep}${this.config.options}`;
      }
      const client = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      await client.db(this.config.database || 'myapp_db').command({ ping: 1 });
      await client.close();
      return { success: true };
    } catch (err: any) {
      // Remove any password in connection string before returning message
      const sanitized = (err.message || 'MongoDB Connection failed').replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      return { success: false, message: sanitized };
    }
  }

  async initializeSchema(): Promise<void> {
    const db = await this.getDb();
    const collections = await db.listCollections().toArray();
    const colNames = collections.map((c) => c.name);

    if (!colNames.includes('admins')) {
      await db.createCollection('admins');
      await db.collection('admins').createIndex({ username: 1 }, { unique: true });
    }
    if (!colNames.includes('settings')) {
      await db.createCollection('settings');
    }
    if (!colNames.includes('links')) {
      await db.createCollection('links');
    }
    if (!colNames.includes('messages')) {
      await db.createCollection('messages');
    }
  }

  async getAdmins(): Promise<AdminUser[]> {
    const db = await this.getDb();
    const docs = await db.collection('admins').find({}).toArray();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      username: doc.username,
      passwordHash: doc.passwordHash,
      enabled: doc.enabled !== false,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
    }));
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    const admins = await this.getAdmins();
    return admins.find((a) => a.id === id) || null;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const db = await this.getDb();
    const doc = await db.collection('admins').findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      username: doc.username,
      passwordHash: doc.passwordHash,
      enabled: doc.enabled !== false,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
    };
  }

  async createAdmin(adminData: { username: string; passwordHash: string; enabled?: boolean }): Promise<AdminUser> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const enabled = adminData.enabled !== undefined ? adminData.enabled : true;

    const res = await db.collection('admins').insertOne({
      username: adminData.username,
      passwordHash: adminData.passwordHash,
      enabled,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: res.insertedId.toString(),
      username: adminData.username,
      passwordHash: adminData.passwordHash,
      enabled,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateAdmin(id: string, updates: Partial<{ username: string; passwordHash: string; enabled: boolean }>): Promise<AdminUser | null> {
    const db = await this.getDb();
    const current = await this.getAdminById(id);
    if (!current) return null;

    const setObj: any = { updatedAt: new Date().toISOString() };
    if (updates.username !== undefined) setObj.username = updates.username;
    if (updates.passwordHash !== undefined) setObj.passwordHash = updates.passwordHash;
    if (updates.enabled !== undefined) setObj.enabled = updates.enabled;

    await db.collection('admins').updateOne({ username: current.username }, { $set: setObj });
    return this.getAdminById(id);
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const db = await this.getDb();
    const current = await this.getAdminById(id);
    if (!current) return false;
    await db.collection('admins').deleteOne({ username: current.username });
    return true;
  }

  async countAdmins(): Promise<number> {
    const admins = await this.getAdmins();
    return admins.filter((a) => a.enabled).length;
  }

  async getSettings(): Promise<any> {
    const db = await this.getDb();
    const doc = await db.collection('settings').findOne({ _id: 'main' as any });
    return doc ? doc.data : null;
  }

  async saveSettings(settings: any): Promise<void> {
    const db = await this.getDb();
    await db.collection('settings').updateOne(
      { _id: 'main' as any },
      { $set: { data: settings } },
      { upsert: true }
    );
  }

  async getLinks(): Promise<Record<string, string>> {
    const db = await this.getDb();
    const docs = await db.collection('links').find({}).toArray();
    const res: Record<string, string> = {};
    docs.forEach((doc) => {
      res[doc._id.toString()] = doc.path;
    });
    return res;
  }

  async saveLink(id: string, path: string): Promise<void> {
    const db = await this.getDb();
    await db.collection('links').updateOne(
      { _id: id as any },
      { $set: { path } },
      { upsert: true }
    );
  }

  async getMessages(): Promise<MessageRecord[]> {
    const db = await this.getDb();
    const docs = await db.collection('messages').find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
      createdAt: doc.createdAt,
      read: Boolean(doc.read),
    }));
  }

  async addMessage(msg: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): Promise<MessageRecord> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const res = await db.collection('messages').insertOne({
      ...msg,
      createdAt: now,
      read: false,
    });
    return {
      id: res.insertedId.toString(),
      ...msg,
      createdAt: now,
      read: false,
    };
  }

  async updateMessage(id: string, updates: Partial<MessageRecord>): Promise<void> {
    const db = await this.getDb();
    const setObj: any = {};
    if (updates.read !== undefined) setObj.read = updates.read;
    await db.collection('messages').updateOne({ _id: id as any }, { $set: setObj });
  }

  async deleteMessage(id: string): Promise<boolean> {
    const db = await this.getDb();
    await db.collection('messages').deleteOne({ _id: id as any });
    return true;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}
