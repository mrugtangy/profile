import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white border-2 border-black rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="p-5 bg-white border-2 border-black rounded-full text-black">
            <ShieldCheck size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">Admin Area</h1>
            <p className="text-neutral-500 font-medium leading-relaxed">
              Sign in with your authorized Google account to manage settings and content.
            </p>
          </div>

          {error && (
            <div className="w-full p-4 bg-red-50 border-2 border-red-500 text-red-600 text-sm font-bold rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white border-2 border-black text-black font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 outline-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            Sign in with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
};
