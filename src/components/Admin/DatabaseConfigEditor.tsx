import React, { useState, useEffect } from 'react';
import { Database, Server, Check, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { authService } from '../../services/authService';

export const DatabaseConfigEditor: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Database selection
  const [dbType, setDbType] = useState<'sqlite' | 'mongodb' | 'mysql'>('sqlite');

  // SQLite fields
  const [sqliteFilepath, setSqliteFilepath] = useState('data/app.db');

  // MongoDB fields
  const [mongoUri, setMongoUri] = useState('mongodb://localhost:27017');
  const [mongoDbName, setMongoDbName] = useState('myapp_db');
  const [mongoOptions, setMongoOptions] = useState('');

  // MySQL fields
  const [mysqlHost, setMysqlHost] = useState('127.0.0.1');
  const [mysqlPort, setMysqlPort] = useState(3306);
  const [mysqlDbName, setMysqlDbName] = useState('myapp_db');
  const [mysqlUsername, setMysqlUsername] = useState('root');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [mysqlOptions, setMysqlOptions] = useState('');

  // Connection testing state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await authService.fetchDbConfig();
        if (config.type) setDbType(config.type);

        if (config.sqlite) {
          setSqliteFilepath(config.sqlite.filepath || 'data/app.db');
        }
        if (config.mongodb) {
          setMongoUri(config.mongodb.uri || 'mongodb://localhost:27017');
          setMongoDbName(config.mongodb.database || 'myapp_db');
          setMongoOptions(config.mongodb.options || '');
        }
        if (config.mysql) {
          setMysqlHost(config.mysql.host || '127.0.0.1');
          setMysqlPort(config.mysql.port || 3306);
          setMysqlDbName(config.mysql.database || 'myapp_db');
          setMysqlUsername(config.mysql.username || 'root');
          setMysqlPassword(config.mysql.password || '');
          setMysqlOptions(config.mysql.options || '');
        }
      } catch (err: any) {
        setSaveError(err.message || 'Failed to load database configuration');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const getDbConfigObj = () => {
    return {
      isConfigured: true,
      type: dbType,
      sqlite: dbType === 'sqlite' ? { filepath: sqliteFilepath } : undefined,
      mongodb: dbType === 'mongodb' ? { uri: mongoUri, database: mongoDbName, options: mongoOptions } : undefined,
      mysql: dbType === 'mysql' ? {
        host: mysqlHost,
        port: Number(mysqlPort),
        database: mysqlDbName,
        username: mysqlUsername,
        password: mysqlPassword,
        options: mysqlOptions,
      } : undefined,
    };
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);
    try {
      const configObj = getDbConfigObj();
      const res = await authService.testDbConfig(configObj);
      if (res.success) {
        setTestStatus('success');
        setTestMessage('Database connection test succeeded!');
      } else {
        setTestStatus('error');
        setTestMessage(res.message || 'Database connection test failed.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Failed to connect to database.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const configObj = getDbConfigObj();
      await authService.updateDbConfig(configObj);
      setSaveSuccess('Database configuration updated and reconnected successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update database configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans">
      <header>
        <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Database size={28} /> Database Configuration
        </h2>
        <p className="text-neutral-400 text-sm font-medium">Configure active database storage engine and credentials.</p>
      </header>

      {/* Migration Notice Warning Card */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 text-amber-950 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-800">
          <ShieldAlert size={16} /> Database Migration Notice
        </div>
        <p className="text-xs font-medium text-amber-900 leading-relaxed">
          Updating the database engine or target credentials switches the active data store for settings and accounts. Existing data is retained safely in its original store and is not destroyed.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-50 border-2 border-green-500 text-green-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check size={16} /> {saveSuccess}
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle size={16} /> {saveError}
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        
        {/* ENGINE SELECTION */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block">
            Select Active Database Engine
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['sqlite', 'mongodb', 'mysql'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setDbType(type);
                  setTestStatus('idle');
                  setTestMessage(null);
                }}
                className={`py-4 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${
                  dbType === type
                    ? 'bg-black text-white border-black scale-[1.02]'
                    : 'bg-white text-black border-neutral-200 hover:border-black'
                }`}
              >
                <Server size={18} />
                <span>{type === 'sqlite' ? 'SQLite' : type === 'mongodb' ? 'MongoDB' : 'MySQL'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DYNAMIC FORM FIELDS */}
        <div className="bg-neutral-50 border-2 border-neutral-100 rounded-2xl p-6 space-y-4">
          
          {/* SQLite Config */}
          {dbType === 'sqlite' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                SQLite Database File Path
              </label>
              <input
                type="text"
                required
                value={sqliteFilepath}
                onChange={(e) => setSqliteFilepath(e.target.value)}
                placeholder="data/app.db"
                className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
              />
            </div>
          )}

          {/* MongoDB Config */}
          {dbType === 'mongodb' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                  Connection URI
                </label>
                <input
                  type="text"
                  required
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  placeholder="mongodb://localhost:27017"
                  className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Database Name
                  </label>
                  <input
                    type="text"
                    required
                    value={mongoDbName}
                    onChange={(e) => setMongoDbName(e.target.value)}
                    placeholder="myapp_db"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-bold text-xs focus:border-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Connection Options (Optional)
                  </label>
                  <input
                    type="text"
                    value={mongoOptions}
                    onChange={(e) => setMongoOptions(e.target.value)}
                    placeholder="e.g. retryWrites=true&w=majority"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MySQL Config */}
          {dbType === 'mysql' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Host
                  </label>
                  <input
                    type="text"
                    required
                    value={mysqlHost}
                    onChange={(e) => setMysqlHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={mysqlPort}
                    onChange={(e) => setMysqlPort(Number(e.target.value))}
                    placeholder="3306"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Database Name
                  </label>
                  <input
                    type="text"
                    required
                    value={mysqlDbName}
                    onChange={(e) => setMysqlDbName(e.target.value)}
                    placeholder="myapp_db"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-bold text-xs focus:border-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={mysqlUsername}
                    onChange={(e) => setMysqlUsername(e.target.value)}
                    placeholder="root"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-bold text-xs focus:border-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Password
                  </label>
                  <input
                    type="password"
                    value={mysqlPassword}
                    onChange={(e) => setMysqlPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-3 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TEST CONNECTION ACTION */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-6 py-3 bg-white border-2 border-black text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testStatus === 'testing' ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Test Connection
            </button>

            {testMessage && (
              <div
                className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 ${
                  testStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {testStatus === 'success' ? <Check size={14} /> : <X size={14} />}
                {testMessage}
              </div>
            )}
          </div>

        </div>

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={18} /> Update Database Configuration
            </>
          )}
        </button>

      </form>
    </div>
  );
};
