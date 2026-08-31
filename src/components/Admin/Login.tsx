import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, User, Lock } from 'lucide-react';
import { authService } from '../../services/authService';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.login(username.trim(), password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white relative overflow-hidden font-sans">
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white border-2 border-black rounded-3xl p-8 relative z-10 shadow-sm"
      >
        <form onSubmit={handleLogin} className="flex flex-col items-center text-center space-y-6">
          <div className="p-5 bg-white border-2 border-black rounded-full text-black">
            <ShieldCheck size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight">Admin Area</h1>
            <p className="text-neutral-500 font-medium text-sm leading-relaxed">
              Enter your administrator credentials to access the management panel.
            </p>
          </div>

          {error && (
            <div className="w-full p-4 bg-red-50 border-2 border-red-500 text-red-600 text-xs font-bold rounded-xl text-left">
              {error}
            </div>
          )}

          <div className="w-full space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full p-3 pl-10 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full p-3 pl-10 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-mono outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-black text-white font-black uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 outline-none text-xs"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
