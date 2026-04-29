import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, AlertCircle, Loader2, Info, MapPin, ChevronDown } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { BARANGAYS } from '../constants';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [barangay, setBarangay] = useState(BARANGAYS[2]); // Default to Fairview
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      const userData: any = {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        updatedAt: serverTimestamp(),
      };

      if (!userSnap.exists()) {
        userData.createdAt = serverTimestamp();
        userData.barangay = BARANGAYS[2]; // Default for new Google users
      }
      
      // Save/Update user profile in Firestore
      await setDoc(userRef, userData, { merge: true });

      onSuccess(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile
        await updateProfile(result.user, { displayName });
        
        // Save user profile in Firestore
        await setDoc(doc(db, 'users', result.user.uid), {
          displayName,
          email,
          barangay,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        onSuccess(result.user);
        onClose();
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(result.user);
        onClose();
      }
    } catch (err: any) {
      // Map Firebase errors to user friendly messages
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Email is already in use po.';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      setError(msg || 'An error occurred during authentication');
    } finally {
      setLoading(false);
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
                  <h2 className="text-2xl font-display font-bold text-slate-900">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {mode === 'login' 
                      ? 'Access your waste management dashboard' 
                      : 'Join District 5 community services'}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full mb-6 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl transition-all shadow-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />}
                <span>Continue with Google</span>
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or email</span>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleAction} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Johnny Dela Cruz"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none transition-all text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Your Barangay</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none appearance-none transition-all text-sm cursor-pointer"
                          required
                        >
                          {BARANGAYS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-eco-600 hover:bg-eco-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-eco-200 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-eco-600 font-bold hover:underline"
                  >
                    {mode === 'login' ? 'Sign Up' : 'Log In'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
