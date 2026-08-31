import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, ShieldCheck, Check, X, Server, Key, Lock, 
  ArrowRight, Sparkles, User, AlertTriangle 
} from 'lucide-react';
import { authService } from '../services/authService';

export const ConfigSetup: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const navigate = useNavigate();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

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

  // Test Connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Administrator Credentials
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await authService.checkConfigStatus();
        setIsConfigured(res.isConfigured);
      } catch (err) {
        console.error('Failed to check config status:', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    checkStatus();
  }, []);

  const getDbConfigObj = () => {
    return {
      isConfigured: false,
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
      const res = await authService.testConfig(configObj);
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

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminUsername.trim()) {
      setErrorMessage('Administrator username is required.');
      return;
    }

    if (!adminPassword || adminPassword.length < 4) {
      setErrorMessage('Administrator password must be at least 4 characters long.');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setErrorMessage('Administrator passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const dbConfig = getDbConfigObj();
      await authService.setupApp({
        setupUsername: 'admin',
        setupPassword: 'admin',
        dbConfig,
        adminUsername: adminUsername.trim(),
        adminPassword,
        confirmPassword,
      });

      // Successfully configured!
      if (onComplete) {
        onComplete();
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Initialization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // LOCKED STATE IF ALREADY CONFIGURED
  if (isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white font-sans relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white border-2 border-black rounded-3xl p-8 relative z-10 text-center space-y-6 shadow-sm"
        >
          <div className="w-16 h-16 bg-black text-white rounded-2xl mx-auto flex items-center justify-center">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">Configuration Locked</h1>
            <p className="text-neutral-500 font-medium text-sm leading-relaxed">
              The application has already been configured. The initial setup endpoint and temporary setup credentials are locked and disabled.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              Go to Admin Panel <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-neutral-100 text-black border-2 border-neutral-200 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors"
            >
              Return Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // INITIAL UNCONFIGURED SETUP SCREEN
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4 font-sans relative">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full font-mono text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} /> First-Run System Setup
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Database & Admin Setup</h1>
          <p className="text-neutral-500 text-sm font-medium">
            Configure your application database and set your production administrator credentials.
          </p>
        </div>

        {/* Temporary Credentials Notice Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 text-amber-950 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-800">
            <Key size={16} /> Temporary Default Setup Credentials
          </div>
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-sm">
            <div>
              <span className="text-neutral-400 font-bold uppercase text-[10px] block">Username</span>
              <strong className="text-black text-base">admin</strong>
            </div>
            <div>
              <span className="text-neutral-400 font-bold uppercase text-[10px] block">Password</span>
              <strong className="text-black text-base">admin</strong>
            </div>
            <div className="text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-sans font-bold">
              Active during setup only
            </div>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            These credentials authorize this initial setup session. Once configuration completes, they will be disabled permanently.
          </p>
        </motion.div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border-2 border-red-500 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Setup Form */}
        <form onSubmit={handleCompleteSetup} className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
          
          {/* STEP 1: DATABASE SELECTION */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-100">
              <Database className="text-black" size={20} />
              <h2 className="text-lg font-black uppercase tracking-tight">1. Select Database Engine</h2>
            </div>

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

            {/* DYNAMIC DATABASE FIELDS */}
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
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Self-contained file-based database stored locally.
                  </p>
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
          </div>

          {/* STEP 2: ADMINISTRATOR CONFIGURATION */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-100">
              <ShieldCheck className="text-black" size={20} />
              <h2 className="text-lg font-black uppercase tracking-tight">2. Create Permanent Administrator Account</h2>
            </div>

            <div className="bg-neutral-50 border-2 border-neutral-100 rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                  Administrator Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full p-3 pl-10 bg-white border-2 border-neutral-200 rounded-xl font-bold text-xs focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full p-3 pl-10 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full p-3 pl-10 bg-white border-2 border-neutral-200 rounded-xl font-mono text-xs focus:border-black outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} /> Initialize & Save Configuration
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
