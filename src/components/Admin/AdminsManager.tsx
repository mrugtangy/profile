import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, ShieldAlert, Edit2, Trash2, X, Check, Lock, User, AlertTriangle } from 'lucide-react';
import { authService } from '../../services/authService';

export const AdminsManager: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form fields for Add/Edit
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enabledToggle, setEnabledToggle] = useState(true);

  // Action feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = async () => {
    try {
      const data = await authService.fetchAdmins();
      setAdmins(data);
      const me = await authService.getCurrentUser();
      setCurrentUser(me);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleOpenAddModal = () => {
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setEnabledToggle(true);
    setErrorMessage(null);
    setAddModalOpen(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newUsername.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.createAdmin({
        username: newUsername.trim(),
        password: newPassword,
        enabled: enabledToggle,
      });
      setSuccessMessage('Administrator created successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setAddModalOpen(false);
      await loadAdmins();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (admin: any) => {
    setEditAdmin(admin);
    setNewUsername(admin.username);
    setNewPassword('');
    setConfirmPassword('');
    setEnabledToggle(admin.enabled);
    setErrorMessage(null);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    setErrorMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.updateAdmin(editAdmin.id, {
        username: newUsername.trim() !== editAdmin.username ? newUsername.trim() : undefined,
        password: newPassword || undefined,
        enabled: enabledToggle,
      });
      setSuccessMessage('Administrator updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditAdmin(null);
      await loadAdmins();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteConfirmId) return;
    setErrorMessage(null);
    try {
      await authService.deleteAdmin(deleteConfirmId);
      setSuccessMessage('Administrator deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setDeleteConfirmId(null);
      await loadAdmins();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete administrator.');
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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Users size={28} /> Administrator Management
          </h2>
          <p className="text-neutral-400 text-sm font-medium">Manage user accounts with administrative privileges.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-all hover:scale-105"
        >
          <UserPlus size={16} /> Add Administrator
        </button>
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

      {/* Admin Users List */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center border-b-2 border-neutral-100 pb-4">
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
            Total Administrators: {admins.length}
          </span>
        </div>

        <div className="divide-y divide-neutral-100 space-y-3">
          {admins.map((admin) => {
            const isMe = currentUser?.id === admin.id;
            return (
              <div
                key={admin.id}
                className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-black">{admin.username}</span>
                    {isMe && (
                      <span className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase rounded-md tracking-wider">
                        You
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider ${
                        admin.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {admin.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400">
                    Created: {new Date(admin.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(admin)}
                    className="p-2.5 bg-white border border-neutral-200 hover:border-black rounded-xl text-black font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Edit Admin"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(admin.id)}
                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Delete Admin"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-10 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setAddModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black uppercase tracking-tight mb-6">Create Administrator</h3>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-bold outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="addEnabled"
                    checked={enabledToggle}
                    onChange={(e) => setEnabledToggle(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                  <label htmlFor="addEnabled" className="text-xs font-bold text-black cursor-pointer">
                    Account Active & Enabled
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="flex-1 py-3 border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT ADMIN MODAL */}
      <AnimatePresence>
        {editAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditAdmin(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-10 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEditAdmin(null)}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black uppercase tracking-tight mb-6">Edit Administrator</h3>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleUpdateAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-bold outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                    New Password (Leave blank to keep unchanged)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
                  />
                </div>

                {newPassword ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black font-mono outline-none text-sm"
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="editEnabled"
                    checked={enabledToggle}
                    onChange={(e) => setEnabledToggle(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                  <label htmlFor="editEnabled" className="text-xs font-bold text-black cursor-pointer">
                    Account Active & Enabled
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAdmin(null)}
                    className="flex-1 py-3 border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Update Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border-2 border-black p-6 flex flex-col items-center text-center gap-6 relative z-10 overflow-hidden"
            >
              <div className="p-4 bg-red-50 border-2 border-black rounded-full text-red-500">
                <ShieldAlert size={36} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Remove Administrator</h3>
                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                  Are you sure you want to remove this administrator account?
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest text-center hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAdmin}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center border-2 border-black hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
