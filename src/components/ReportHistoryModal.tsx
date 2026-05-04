import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Save, 
  Loader2,
  Calendar,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

interface Report {
  id: string;
  userId: string;
  barangay: string;
  issueType: string;
  description: string;
  location: string;
  status: 'pending' | 'resolved' | 'rejected' | 'in-progress';
  createdAt: any;
  updatedAt: any;
}

interface ReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'reports'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleEdit = (report: Report) => {
    setEditingId(report.id);
    setEditForm({
      description: report.description,
      location: report.location
    });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const reportRef = doc(db, 'reports', id);
      await updateDoc(reportRef, {
        description: editForm.description,
        location: editForm.location,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating report:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      console.error("Error deleting report:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
            className="relative bg-slate-50 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="bg-white p-8 border-b border-slate-100 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="text-eco-600" />
                    Report History
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Review and manage your submitted reports</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-sm font-medium">Fetching history...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <Clock size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900">No reports found</h3>
                  <p className="text-sm max-w-xs mt-2">
                    You haven't submitted any waste reports yet. Your reports will appear here once you make them.
                  </p>
                </div>
              ) : (
                reports.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-slate-100 text-slate-500`}>
                            <AlertCircle size={18} />
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusStyle(report.status)}`}>
                              {report.status}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {formatDate(report.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingId === report.id ? (
                            <button
                              onClick={() => handleSave(report.id)}
                              disabled={saving}
                              className="p-2 bg-eco-600 text-white rounded-xl hover:bg-eco-700 transition-colors shadow-lg shadow-eco-100"
                            >
                              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEdit(report)}
                              className="p-2 text-slate-400 hover:text-eco-600 hover:bg-eco-50 rounded-xl transition-all"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(report.id)}
                            disabled={deletingId === report.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            {deletingId === report.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <MapPin size={10} />
                            Location
                          </label>
                          {editingId === report.id ? (
                            <input
                              type="text"
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-eco-500 outline-none transition-all"
                            />
                          ) : (
                            <p className="text-sm font-bold text-slate-900">{report.location}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare size={10} />
                            Description
                          </label>
                          {editingId === report.id ? (
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              rows={3}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-eco-500 outline-none transition-all resize-none"
                            />
                          ) : (
                            <p className="text-sm text-slate-600 leading-relaxed">{report.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Brgy. {report.barangay}
                        </span>
                        {report.status === 'pending' && (
                          <div className="flex items-center gap-1 text-amber-500">
                             <Clock size={12} />
                             <span className="text-[10px] font-bold uppercase">Awaiting Collection</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-white border-t border-slate-100 shrink-0">
               <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-3xl font-bold text-sm shadow-xl shadow-slate-200 transition-all"
               >
                  Close History
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
