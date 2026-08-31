import React, { useState, useEffect } from 'react';
import { User, Lock, Check, AlertTriangle } from 'lucide-react';
import { authService } from '../../services/authService';

export const AccountSettingsEditor: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        if (user) setUsername(user.username);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load user info');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setErrorMessage('Username cannot be empty.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setErrorMessage('New password must be at least 4 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await authService.updateAccount({
        username: username.trim() !== currentUser?.username ? username.trim() : undefined,
        newPassword: newPassword || undefined,
        confirmPassword: newPassword ? confirmPassword : undefined,
      });
      setSuccessMessage('Account details updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      if (res.user) {
        setCurrentUser(res.user);
        setUsername(res.user.username);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update account.');
    } finally {
      setSubmitting(false);
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
          <User size={28} /> Account Settings
        </h2>
        <p className="text-neutral-400 text-sm font-medium">Update your administrator username and security password.</p>
      </header>

      {successMessage && (
        <div className="p-4 bg-green-50 border-2 border-green-500 text-green-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check size={16} /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleUpdate} className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
            Username
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-3 pl-10 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-bold outline-none text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
              New Password (Optional)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full p-3 pl-10 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full p-3 pl-10 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={18} /> Save Account Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
};
