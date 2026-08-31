import fs from 'fs/promises';
import path from 'path';
import { DbConfig, DatabaseAdapter, DbType } from './types.js';
import { SQLiteAdapter } from './adapters/sqlite.js';
import { MongoAdapter } from './adapters/mongodb.js';
import { MySQLAdapter } from './adapters/mysql.js';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'db_config.json');

let activeAdapter: DatabaseAdapter | null = null;
let currentDbConfig: DbConfig | null = null;

export async function loadDbConfig(): Promise<DbConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    currentDbConfig = JSON.parse(data);
    return currentDbConfig!;
  } catch {
    currentDbConfig = {
      isConfigured: false,
      type: 'sqlite',
      sqlite: { filepath: 'data/app.db' },
    };
    return currentDbConfig;
  }
}

export async function saveDbConfig(config: DbConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  currentDbConfig = config;
  
  // Close existing adapter if present
  if (activeAdapter && activeAdapter.close) {
    try {
      await activeAdapter.close();
    } catch {}
  }
  activeAdapter = null;
}

export function createAdapterForConfig(config: DbConfig): DatabaseAdapter {
  switch (config.type) {
    case 'mongodb':
      return new MongoAdapter(config.mongodb || { uri: 'mongodb://localhost:27017', database: 'myapp_db' });
    case 'mysql':
      return new MySQLAdapter(config.mysql || { host: '127.0.0.1', port: 3306, database: 'myapp_db', username: 'root' });
    case 'sqlite':
    default:
      return new SQLiteAdapter(config.sqlite || { filepath: 'data/app.db' });
  }
}

export async function getDbAdapter(): Promise<DatabaseAdapter> {
  if (activeAdapter) return activeAdapter;
  const config = await loadDbConfig();
  activeAdapter = createAdapterForConfig(config);
  return activeAdapter;
}

export async function testDbConfigConnection(config: DbConfig): Promise<{ success: boolean; message?: string }> {
  try {
    const tempAdapter = createAdapterForConfig(config);
    const res = await tempAdapter.testConnection();
    if (tempAdapter.close) {
      await tempAdapter.close();
    }
    return res;
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect to database' };
  }
}

export async function initializeDbWithAdmin(
  config: DbConfig,
  initialAdmin: { username: string; passwordHash: string }
): Promise<{ success: boolean; message?: string; admin?: any }> {
  try {
    const adapter = createAdapterForConfig(config);
    const testRes = await adapter.testConnection();
    if (!testRes.success) {
      return { success: false, message: testRes.message || 'Database connection test failed' };
    }

    // Initialize Schema
    await adapter.initializeSchema();

    // Create Initial Admin Account
    const createdAdmin = await adapter.createAdmin({
      username: initialAdmin.username,
      passwordHash: initialAdmin.passwordHash,
      enabled: true,
    });

    // Save DB Config as fully configured
    const finalConfig: DbConfig = {
      ...config,
      isConfigured: true,
    };
    await saveDbConfig(finalConfig);

    return { success: true, admin: createdAdmin };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to initialize database' };
  }
}
