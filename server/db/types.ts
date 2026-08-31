export type DbType = 'sqlite' | 'mongodb' | 'mysql';

export interface MongoConfig {
  uri: string;
  database: string;
  options?: string;
}

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  options?: string;
}

export interface SQLiteConfig {
  filepath: string;
}

export interface DbConfig {
  isConfigured: boolean;
  type: DbType;
  mongodb?: MongoConfig;
  mysql?: MySQLConfig;
  sqlite?: SQLiteConfig;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface DatabaseAdapter {
  type: DbType;
  testConnection(): Promise<{ success: boolean; message?: string }>;
  initializeSchema(): Promise<void>;
  
  // Admin Operations
  getAdmins(): Promise<AdminUser[]>;
  getAdminById(id: string): Promise<AdminUser | null>;
  getAdminByUsername(username: string): Promise<AdminUser | null>;
  createAdmin(admin: { username: string; passwordHash: string; enabled?: boolean }): Promise<AdminUser>;
  updateAdmin(id: string, updates: Partial<{ username: string; passwordHash: string; enabled: boolean }>): Promise<AdminUser | null>;
  deleteAdmin(id: string): Promise<boolean>;
  countAdmins(): Promise<number>;

  // Settings Operations
  getSettings(): Promise<any>;
  saveSettings(settings: any): Promise<void>;

  // Shortener Links Operations
  getLinks(): Promise<Record<string, string>>;
  saveLink(id: string, path: string): Promise<void>;

  // Messages Operations
  getMessages(): Promise<MessageRecord[]>;
  addMessage(msg: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): Promise<MessageRecord>;
  updateMessage(id: string, updates: Partial<MessageRecord>): Promise<void>;
  deleteMessage(id: string): Promise<boolean>;

  // Close connection
  close?(): Promise<void>;
}
