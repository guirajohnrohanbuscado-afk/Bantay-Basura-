import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, MapPin, Loader2, CheckCircle2, AlertCircle, Trash2, Camera } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { BARANGAYS } from '../constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdate: (updatedUser: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [barangay, setBarangay] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBarangay(data.barangay || BARANGAYS[0]);
          if (data.displayName && !displayName) setDisplayName(data.displayName);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProfile();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update Auth Profile
      await updateProfile(auth.currentUser!, { displayName });

      // 2. Update Firestore Profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        barangay,
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
      onUpdate({ ...user, displayName });
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">Profile Settings</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage your account and preferences</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-eco-600" size={32} />
                  <p className="text-sm text-slate-500">Loading profile data...</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800 text-sm">
                      <AlertCircle size={18} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-eco-50 border border-eco-100 rounded-2xl flex items-center gap-3 text-eco-800 text-sm">
                      <CheckCircle2 size={18} className="shrink-0" />
                      Profile updated successfully!
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-eco-100 rounded-full flex items-center justify-center text-eco-600 text-3xl font-display font-bold">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt={displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          displayName[0] || user?.email[0] || 'U'
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-eco-600 transition-colors">
                        <Camera size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Display Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Home Barangay</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none appearance-none transition-all text-sm cursor-pointer"
                        >
                          {BARANGAYS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-eco-600 hover:bg-eco-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-eco-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
