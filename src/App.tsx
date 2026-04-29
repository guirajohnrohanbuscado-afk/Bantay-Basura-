/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Camera, 
  Send, 
  MessageSquare, 
  X, 
  ChevronDown,
  Info,
  CheckCircle2,
  Clock,
  Leaf,
  Truck,
  Search,
  QrCode,
  User as UserIcon,
  LogOut,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BARANGAYS, getCollectionType, getWeeklySchedule, RECYCLE_INCENTIVE } from './constants';
import { getBantayBotResponse } from './services/geminiService';
import { QRScanner } from './components/QRScanner';
import { auth, db, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';

export default function App() {
  const [selectedBarangay, setSelectedBarangay] = useState(BARANGAYS[2]); // Default to Fairview
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isRecycleModalOpen, setIsRecycleModalOpen] = useState(true);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isTruckDetailsOpen, setIsTruckDetailsOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBarangayDropdownOpen, setIsBarangayDropdownOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Mabuhay! I am Bantay-Bot. How can I help you with your waste management today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [reportForm, setReportForm] = useState({ street: '', photo: null as File | null });
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Listen for auth changes using Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile to get their specific barangay
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.barangay && BARANGAYS.includes(userData.barangay)) {
              setSelectedBarangay(userData.barangay);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setIsUserMenuOpen(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const collectionType = getCollectionType(dayName, selectedBarangay);
  const weeklySchedule = getWeeklySchedule(selectedBarangay);

  // Truck Tracker Logic
  const getTruckStatus = () => {
    if (isDemoMode) return 'in-transit';
    if (collectionType === 'No Collection') return 'off-duty';
    
    const now = new Date();
    const [startStr, endStr] = weeklySchedule.collectionTime.split(' - ');
    
    const parseTime = (timeStr: string) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);

    if (now < startTime) return 'preparing';
    if (now >= startTime && now <= endTime) return 'in-transit';
    return 'completed';
  };

  const truckStatus = getTruckStatus();

  const searchableItems = [
    { id: 'bio', title: 'Biodegradable Waste', type: 'Waste Type', description: 'Fruits, veggies, food scraps, garden waste', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSearchOpen(false); } },
    { id: 'non-bio', title: 'Non-Biodegradable Waste', type: 'Waste Type', description: 'Plastics, metals, glass, paper, rubber', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSearchOpen(false); } },
    { id: 'special', title: 'Special Collection', type: 'Program', description: 'Furniture, electronics, appliances pickup', action: () => { setIsSpecialModalOpen(true); setIsSearchOpen(false); } },
    { id: 'plastic', title: 'Plastic to Peso', type: 'Program', description: 'Earn ₱1.00 per plastic bottle', action: () => { setIsRecycleModalOpen(true); setIsSearchOpen(false); } },
    { id: 'policy', title: 'QC Waste Policy', type: 'Information', description: 'Learn about segregation at source rules', action: () => { setIsPolicyModalOpen(true); setIsSearchOpen(false); } },
    { id: 'tracker', title: 'Live Truck Tracker', type: 'Feature', description: 'Track dump trucks in real-time', action: () => { window.scrollTo({ top: 400, behavior: 'smooth' }); setIsSearchOpen(false); } },
    ...BARANGAYS.map(b => ({ id: `brgy-${b}`, title: `Brgy. ${b}`, type: 'Location', description: `View collection schedule for ${b}`, action: () => { setSelectedBarangay(b); setIsSearchOpen(false); } }))
  ];

  const filteredItems = searchQuery.trim() === '' 
    ? [] 
    : searchableItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await getBantayBotResponse(userMsg, selectedBarangay);
      setChatMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'bot', text: error.message || "Pasensya na, nagkaroon ng error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Save report to Firestore
      await addDoc(collection(db, 'reports'), {
        userId: user.uid,
        userEmail: user.email,
        barangay: selectedBarangay,
        issueType: 'missed-collection', // Default but could be dynamic
        description: reportForm.street ? `Missed collection at ${reportForm.street}` : 'Missed collection reported via dashboard',
        location: reportForm.street || 'Unknown',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setIsReportSubmitted(true);
      setTimeout(() => {
        setIsReportSubmitted(false);
        setReportForm({ street: '', photo: null });
      }, 3000);
    } catch (error: any) {
      console.error("Report submission failed:", error);
      handleFirestoreError(error, 'create', 'reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleQRScan = (data: string) => {
    setIsQRScannerOpen(false);
    
    const scrollToReport = (message: string) => {
      const reportSection = document.getElementById('report-section');
      if (reportSection) {
        setTimeout(() => {
          reportSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
        setChatMessages(prev => [...prev, { role: 'bot', text: message }]);
      }
    };

    // Try to parse JSON first
    try {
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        if (parsed.action === 'report' || parsed.type === 'missed') {
          const brgy = BARANGAYS.find(b => b.toLowerCase() === (parsed.barangay || '').toLowerCase());
          if (brgy) setSelectedBarangay(brgy);
          
          if (parsed.street) {
            setReportForm(prev => ({ ...prev, street: parsed.street }));
          }
          
          scrollToReport(`Intelligence system detected a report request in the QR code. I've pre-filled the form for ${parsed.street || 'your area'} in Brgy. ${brgy || selectedBarangay}.`);
          return;
        }
      }
    } catch (e) { /* Not JSON */ }

    // Logic for structured strings like REPORT|FAIRVIEW|DAHLIA
    const parts = data.split(/[|:,]/).map(p => p.trim());
    const command = parts[0]?.toUpperCase();
    if (parts.length >= 2 && ['REPORT', 'MISSED', 'BASURA', 'ISSUE'].includes(command)) {
      const brgy = BARANGAYS.find(b => b.toLowerCase() === parts[1].toLowerCase());
      if (brgy) setSelectedBarangay(brgy);
      
      const streetPart = parts[2] || '';
      if (streetPart) {
        setReportForm(prev => ({ ...prev, street: streetPart }));
      }
      
      scrollToReport(`QR Report detected! I've pre-filled the form for ${streetPart || 'your location'} in Brgy. ${brgy || selectedBarangay}.`);
      return;
    }

    // Logic for simple scanned data
    const lowerData = data.toLowerCase();
    
    // Check if it's a barangay
    const matchedBarangay = BARANGAYS.find(b => lowerData.includes(b.toLowerCase()));
    if (matchedBarangay) {
      setSelectedBarangay(matchedBarangay);
      setChatMessages(prev => [...prev, { role: 'bot', text: `QR Code scanned! Switched view to Brgy. ${matchedBarangay}.` }]);
      return;
    }

    // Check if it's a report command
    if (lowerData.includes('report') || lowerData.includes('missed')) {
      scrollToReport("QR Code scanned! I've navigated you to the report section.");
      return;
    }

    // Default: Check if it's a URL
    if (data.startsWith('http')) {
      window.open(data, '_blank');
      setChatMessages(prev => [...prev, { role: 'bot', text: `Scanning complete. Opening external link: ${data}` }]);
      return;
    }

    // Generic response from bot
    setChatMessages(prev => [...prev, { 
      role: 'bot', 
      text: `Scanned code content: "${data}". This data has been logged. If you need to report an issue, you can scan a QR code with the format "REPORT|Barangay|Street".` 
    }]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Alert Notification Bar */}
      <div className="bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
        <AlertTriangle size={16} />
        <span>Alert: High flood risk in Brgy. Santa Lucia - please secure your trash bins.</span>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-eco-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-eco-600 p-2.5 rounded-2xl text-white shadow-lg shadow-eco-200">
              <Trash2 size={24} />
            </div>
            <div className="hidden md:block">
              <h1 className="font-display font-bold text-xl text-eco-900 tracking-tight leading-none">
                Bantay <span className="text-eco-600">Basura</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">District 5 • QC</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-eco-600 transition-colors" size={18} />
              </div>
              <input 
                type="text"
                placeholder="Search waste types, schedules, or programs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-slate-100/50 border-transparent border focus:bg-white focus:border-eco-500 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-eco-500/10 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {isSearchOpen && searchQuery.trim() !== '' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-[400px] overflow-y-auto"
                  >
                    {filteredItems.length > 0 ? (
                      <div className="p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Search Results</p>
                        {filteredItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className="w-full text-left p-3 hover:bg-eco-50 rounded-xl transition-colors group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-eco-700">{item.title}</h4>
                                <p className="text-xs text-slate-500">{item.description}</p>
                              </div>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">
                                {item.type}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-500">No results found for "{searchQuery}"</p>
                        <p className="text-xs text-slate-400 mt-1">Try searching for "Plastic", "Schedule", or a Barangay name.</p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative flex items-center gap-3">
            {/* Quick Report Button */}
            <button 
              onClick={() => {
                const reportSection = document.getElementById('report-section');
                if (reportSection) reportSection.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden lg:flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-red-200"
            >
              <AlertTriangle size={14} />
              <span>Report Missed</span>
            </button>

            <button 
              onClick={() => setIsQRScannerOpen(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors order-last md:order-none"
              title="Scan QR Code"
            >
              <QrCode size={20} />
            </button>
            
            {/* User Auth Section */}
            <div className="relative">
              {user ? (
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-eco-300 px-3 py-2 rounded-full transition-all shadow-sm"
                >
                  <div className="w-6 h-6 bg-eco-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-xs font-bold text-slate-700">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-black transition-all shadow-lg shadow-slate-200"
                >
                  Log In
                </button>
              )}

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                      </div>
                      <div className="p-1">
                        <button 
                          onClick={() => {
                            setIsProfileModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          <UserIcon size={16} />
                          <span>Profile Settings</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                          <Settings size={16} />
                          <span>Regional Alerts</span>
                        </button>
                        <div className="h-px bg-slate-50 my-1" />
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                        >
                          <LogOut size={16} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsBarangayDropdownOpen(!isBarangayDropdownOpen)}
              className="flex items-center gap-2 bg-eco-50 hover:bg-eco-100 transition-colors px-3 py-2 rounded-full text-eco-800 font-medium text-sm border border-eco-200"
            >
              <MapPin size={16} className="text-eco-600" />
              <span>Brgy. {selectedBarangay}</span>
              <ChevronDown size={14} className={`transition-transform ${isBarangayDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isBarangayDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsBarangayDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-eco-100 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    {BARANGAYS.map(b => (
                      <button
                        key={b}
                        onClick={async () => {
                          setSelectedBarangay(b);
                          setIsBarangayDropdownOpen(false);
                          
                          // Update user profile if logged in
                          if (user) {
                            try {
                              const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
                              await updateDoc(doc(db, 'users', user.uid), {
                                barangay: b,
                                updatedAt: serverTimestamp()
                              });
                            } catch (error) {
                              console.error("Failed to update user barangay:", error);
                            }
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-eco-50 transition-colors ${selectedBarangay === b ? 'text-eco-600 font-bold bg-eco-50' : 'text-slate-600'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Status & Schedule (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Status Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-eco-100 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Today's Collection</p>
                    <h2 className="text-3xl font-display font-bold text-slate-900">{dayName}</h2>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 ${
                    collectionType === 'No Collection' ? 'bg-slate-100 text-slate-500' : 'bg-eco-600 text-white shadow-lg shadow-eco-200'
                  }`}>
                    {collectionType === 'No Collection' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                    {collectionType === 'No Collection' ? 'Rest Day' : 'Active Today'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-6 rounded-3xl border-2 transition-all duration-500 ${
                    collectionType === 'Biodegradable' 
                      ? 'bg-eco-50 border-eco-500 shadow-xl shadow-eco-500/10 scale-[1.02]' 
                      : 'bg-slate-50 border-transparent opacity-40 grayscale'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      collectionType === 'Biodegradable' ? 'bg-eco-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <Leaf size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Biodegradable</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Fruits, veggies, food scraps, garden waste</p>
                    {collectionType === 'Biodegradable' && (
                      <div className="mt-4 flex items-center gap-2 text-eco-600 font-bold text-[10px] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-eco-600 animate-pulse"></span>
                        Collecting Now
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const reportSection = document.getElementById('report-section');
                        if (reportSection) reportSection.scrollIntoView({ behavior: 'smooth' });
                        if (collectionType === 'Biodegradable') setReportForm(prev => ({ ...prev, street: '' }));
                      }}
                      className="mt-4 text-[10px] font-bold text-eco-600 hover:underline flex items-center gap-1"
                    >
                      Report missed pickup <ChevronDown size={10} className="-rotate-90" />
                    </button>
                  </div>

                  <div className={`p-6 rounded-3xl border-2 transition-all duration-500 ${
                    collectionType === 'Non-Biodegradable' 
                      ? 'bg-blue-50 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]' 
                      : 'bg-slate-50 border-transparent opacity-40 grayscale'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      collectionType === 'Non-Biodegradable' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <Trash2 size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Non-Biodegradable</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Plastics, metals, glass, paper, rubber</p>
                    {collectionType === 'Non-Biodegradable' && (
                      <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                        Collecting Now
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const reportSection = document.getElementById('report-section');
                        if (reportSection) reportSection.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-4 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Report missed pickup <ChevronDown size={10} className="-rotate-90" />
                    </button>
                  </div>
                </div>

                {collectionType !== 'No Collection' && (
                  <div className="mt-6 p-4 bg-eco-50 rounded-2xl flex items-center justify-between border border-eco-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-eco-600 shadow-sm">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Collection Window</p>
                        <p className="text-sm font-bold text-eco-900">{weeklySchedule.collectionTime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                      <p className="text-sm font-bold text-eco-600">On Schedule</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none">
                <Trash2 size={300} />
              </div>
            </motion.div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Schedule Bento */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-eco-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-eco-100 text-eco-600 rounded-2xl">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-slate-900">Weekly Schedule</h3>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                  7-Day View
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const type = getCollectionType(day, selectedBarangay);
                  const isToday = day === dayName;
                  
                  return (
                    <div 
                      key={day} 
                      className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                        isToday ? 'bg-eco-50 border-eco-200 shadow-md scale-[1.02] z-10' : 'bg-white border-slate-100 hover:border-eco-100'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isToday ? 'text-eco-900' : 'text-slate-700'}`}>
                          {day}
                        </span>
                        {type !== 'No Collection' && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {weeklySchedule.collectionTime}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          type === 'Biodegradable' ? 'bg-eco-100 text-eco-700' :
                          type === 'Non-Biodegradable' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {type === 'No Collection' ? 'Rest' : type.split('-')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Live Tracker Bento */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-eco-100 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl">
                    <MapPin size={20} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-slate-900">Live Tracker</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsDemoMode(!isDemoMode)}
                    className={`text-[10px] px-3 py-1 rounded-full font-bold border transition-all ${
                      isDemoMode ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {isDemoMode ? 'Demo Active' : 'Demo Mode'}
                  </button>
                  <span className={`w-2 h-2 rounded-full ${truckStatus === 'in-transit' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                </div>
              </div>

              {/* Stylized Map */}
              <div className="relative flex-1 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden min-h-[240px] shadow-inner">
                <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 200 200">
                  <path d="M0 40 H200 M0 80 H200 M0 120 H200 M0 160 H200" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M40 0 V200 M80 0 V200 M120 0 V200 M160 0 V200" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M0 0 L200 200 M200 0 L0 200" stroke="currentColor" strokeWidth="0.5" fill="none" />
                  {truckStatus === 'in-transit' && (
                    <motion.path 
                      d="M 40 40 L 160 40 L 160 160 L 40 160 Z" 
                      stroke="#3b82f6" 
                      strokeWidth="2" 
                      strokeDasharray="4 4" 
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                  )}
                </svg>

                <AnimatePresence>
                  {truckStatus === 'in-transit' && (
                    <motion.div 
                      initial={{ x: "10%", y: "10%" }}
                      animate={{ 
                        x: ["20%", "80%", "80%", "20%", "20%"],
                        y: ["20%", "20%", "80%", "80%", "20%"]
                      }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute z-10 cursor-pointer"
                      onClick={() => setIsTruckDetailsOpen(true)}
                    >
                      <div className="relative group">
                        <div className="absolute -inset-6 bg-blue-500/20 rounded-full animate-ping"></div>
                        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
                          <Truck size={24} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                  {truckStatus !== 'in-transit' && (
                    <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-slate-100 text-xs font-bold text-slate-500 text-center">
                      {truckStatus === 'preparing' ? 'Truck preparing at depot' : 
                       truckStatus === 'completed' ? 'Collection completed for today' : 
                       'No collection scheduled'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Arrival</p>
                  <p className="text-lg font-display font-bold text-slate-900">
                    {truckStatus === 'in-transit' ? 'Arriving in ~15 mins' : 
                     truckStatus === 'preparing' ? weeklySchedule.collectionTime.split(' - ')[0] : 
                     '--:--'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsMapModalOpen(true)}
                  className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-2xl font-bold text-xs hover:bg-blue-100 transition-all shadow-sm"
                >
                  Expand Map
                </button>
              </div>
            </motion.div>

            {/* Special Collection Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setIsSpecialModalOpen(true)}
              className="bg-white p-6 rounded-3xl shadow-sm border border-eco-100 cursor-pointer hover:border-eco-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Trash2 size={20} />
                </div>
                <h3 className="font-bold text-slate-900">Special Collection</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Have old furniture, electronics, or appliances? Schedule a special pickup for bulky items.
              </p>
              <span className="text-eco-600 text-sm font-bold flex items-center gap-2">
                View details & schedule <ChevronDown size={14} className="-rotate-90" />
              </span>
            </motion.div>

            {/* Waste Impact Bento */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-eco-600 p-8 rounded-[2.5rem] shadow-xl shadow-eco-600/20 text-white relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Leaf size={20} />
                  </div>
                  <h3 className="font-display font-bold text-xl">Waste Impact</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-bold text-eco-100 uppercase tracking-widest mb-1">Recycled</p>
                    <p className="text-2xl font-display font-bold">1.2 Tons</p>
                    <p className="text-[10px] text-eco-200 mt-1">+12% from last month</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-3xl border border-white/10">
                    <p className="text-[10px] font-bold text-eco-100 uppercase tracking-widest mb-1">Participation</p>
                    <p className="text-2xl font-display font-bold">94%</p>
                    <p className="text-[10px] text-eco-200 mt-1">Top 3 in {selectedBarangay}</p>
                  </div>
                </div>

                <div className="bg-white text-eco-700 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs font-medium leading-tight">
                    Great job, {selectedBarangay}! Your segregation efforts saved 45 trees this month.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
                <Leaf size={200} />
              </div>
            </motion.div>

            {/* Localized Updates Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-eco-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-eco-100 text-eco-600 rounded-2xl">
                    <Info size={20} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-slate-900">Brgy. {selectedBarangay} Updates</h3>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-eco-300 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-eco-600 bg-eco-100 px-2 py-0.5 rounded-full uppercase">Community Event</span>
                    <span className="text-[10px] text-slate-400">2h ago</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Plastic for Rice Exchange</h4>
                  <p className="text-xs text-slate-500">Happening this Saturday at the {selectedBarangay} Multi-purpose Hall. Bring 5kg PET bottles for 1kg rice.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-eco-300 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Maintenance</span>
                    <span className="text-[10px] text-slate-400">Yesterday</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Road Cleaning Schedule</h4>
                  <p className="text-xs text-slate-500">Street sweepers will prioritize the main avenues of {selectedBarangay} starting 5:00 AM daily.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-eco-300 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Announcement</span>
                    <span className="text-[10px] text-slate-400">3 days ago</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">New Recycling Bins Installed</h4>
                  <p className="text-xs text-slate-500">Check the new color-coded bins placed near the {selectedBarangay} health center for easier disposal.</p>
                </div>
              </div>

              <button className="w-full mt-6 py-3 border border-eco-100 rounded-xl text-xs font-bold text-eco-600 hover:bg-eco-50 transition-colors">
                View All Local News
              </button>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Chat & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bantay-Bot Chat Bento */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] shadow-sm border border-eco-100 flex flex-col h-[500px] overflow-hidden"
          >
            <div className="p-6 border-b border-eco-50 bg-eco-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-eco-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-eco-200">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900">Bantay-Bot</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Assistant</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-eco-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-eco-50">
              <form 
                onSubmit={handleSendMessage}
                className="relative"
              >
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about recycling, schedules..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-eco-500 outline-none transition-all text-sm"
                />
                <button 
                  type="submit"
                  disabled={!userInput.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-eco-600 text-white rounded-xl flex items-center justify-center hover:bg-eco-700 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>

          {/* Quick Actions Bento */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setIsSpecialModalOpen(true)}
              className="bg-white p-6 rounded-[2rem] border border-eco-100 shadow-sm hover:border-eco-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Trash2 size={20} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1 text-nowrap">Special Collection</h4>
              <p className="text-[10px] text-slate-400">Bulky items & E-waste</p>
            </button>
            <button 
              onClick={() => setIsRecycleModalOpen(true)}
              className="bg-white p-6 rounded-[2rem] border border-eco-100 shadow-sm hover:border-eco-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 bg-eco-100 text-eco-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-eco-600 group-hover:text-white transition-colors">
                <Leaf size={20} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1 text-nowrap">Plastic to Peso</h4>
              <p className="text-[10px] text-slate-400">Earn from recycling</p>
            </button>
            <button 
              onClick={() => setIsQRScannerOpen(true)}
              className="bg-white p-6 rounded-[2rem] border border-eco-100 shadow-sm hover:border-eco-300 hover:shadow-md transition-all text-left group col-span-2 md:col-span-1"
            >
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <QrCode size={20} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Scan QR Code</h4>
              <p className="text-[10px] text-slate-400">Instantly access info</p>
            </button>
          </div>

          {/* Report Card Bento */}
          <motion.div 
            id="report-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-900">Report Issue</h3>
            </div>

            {isReportSubmitted ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-eco-100 text-eco-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="font-bold text-lg mb-2">Report Received</h4>
                <p className="text-slate-500 text-sm px-4">Our team has been notified and will investigate shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <input 
                  type="text" 
                  required
                  placeholder="Street Name (e.g. Dahlia Ave)"
                  value={reportForm.street}
                  onChange={e => setReportForm(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm"
                />
                <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-red-300 transition-colors cursor-pointer bg-slate-50/50">
                  <Camera size={24} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500">Upload Evidence</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setReportForm(prev => ({ ...prev, photo: e.target.files?.[0] || null }))}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {reportForm.photo && (
                    <span className="text-[10px] font-bold text-eco-600 bg-eco-50 px-2 py-1 rounded-full">{reportForm.photo.name}</span>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-200"
                >
                  Submit Report
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </main>

      <AnimatePresence>
        {isQRScannerOpen && (
          <QRScanner 
            onScan={handleQRScan} 
            onClose={() => setIsQRScannerOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={(user) => {
          setUser(user);
          setChatMessages(prev => [...prev, { role: 'bot', text: `Welcome, ${user.displayName || user.email?.split('@')[0] || 'Neighbor'}! You are now logged in.` }]);
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdate={(updatedUser) => {
          setUser(updatedUser);
          if (updatedUser.barangay) setSelectedBarangay(updatedUser.barangay);
        }}
      />

      {/* Floating Chat Button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-eco-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <MessageSquare size={24} />
      </button>

      {/* Special Collection Modal */}
      <AnimatePresence>
        {isSpecialModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSpecialModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-eco-100 p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Trash2 size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">Special Collection</h2>
                </div>
                <button 
                  onClick={() => setIsSpecialModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-eco-600" />
                    Accepted Special Waste
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-sm text-slate-700 mb-2">E-Waste (Electronics)</h4>
                      <p className="text-xs text-slate-500">Old phones, computers, monitors, batteries, chargers, and small gadgets.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-sm text-slate-700 mb-2">Bulky Items</h4>
                      <p className="text-xs text-slate-500">Sofas, mattresses, cabinets, tables, chairs, and large wooden furniture.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-sm text-slate-700 mb-2">Appliances</h4>
                      <p className="text-xs text-slate-500">Refrigerators, washing machines, air conditioners, and microwave ovens.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-sm text-slate-700 mb-2">Construction Debris</h4>
                      <p className="text-xs text-slate-500">Small amounts of wood, tiles, or concrete from minor home repairs.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Info size={20} className="text-blue-600" />
                    How to Schedule
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm">1</div>
                      <p className="text-sm text-slate-600">Contact the **DSQC Hotline** or your local **Barangay Hall** to request a special pickup.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm">2</div>
                      <p className="text-sm text-slate-600">Provide a list of items and your exact location for assessment.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm">3</div>
                      <p className="text-sm text-slate-600">Wait for the scheduled date. Ensure items are placed in an accessible area outside your home.</p>
                    </div>
                  </div>
                </section>

                <div className="bg-eco-50 p-6 rounded-3xl border border-eco-100">
                  <h4 className="font-bold text-eco-900 mb-2">Contact Information & Fees</h4>
                  <div className="space-y-3 text-sm text-eco-800">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-eco-100 rounded-lg text-eco-600">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="font-bold">DSQC Hotline</p>
                        <p className="opacity-80">8988-4242 local 8350</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-eco-100 rounded-lg text-eco-600">
                        <Send size={16} />
                      </div>
                      <div>
                        <p className="font-bold">Email Support</p>
                        <p className="opacity-80">dsqc@quezoncity.gov.ph</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-eco-100 rounded-lg text-eco-600">
                        <Info size={16} />
                      </div>
                      <div>
                        <p className="font-bold">Associated Fees</p>
                        <p className="opacity-80">
                          Residential pickups for District 5 are **FREE OF CHARGE**.
                          Commercial debris or large-scale renovation waste may require a processing fee.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsSpecialModalOpen(false)}
                  className="w-full bg-eco-600 hover:bg-eco-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-eco-200"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Truck Details Modal */}
      <AnimatePresence>
        {isTruckDetailsOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTruckDetailsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck size={24} />
                  <h3 className="font-bold text-lg">Truck #QC-502 Details</h3>
                </div>
                <button onClick={() => setIsTruckDetailsOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Driver</p>
                    <p className="text-sm font-bold text-slate-700">Juan Dela Cruz</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Plate Number</p>
                    <p className="text-sm font-bold text-slate-700">QC-1234</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Current Speed</p>
                    <p className="text-sm font-bold text-slate-700">15 km/h</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Next Stop</p>
                    <p className="text-sm font-bold text-slate-700">Sector 5</p>
                  </div>
                </div>
                <div className="bg-eco-50 p-4 rounded-2xl border border-eco-100 flex items-center gap-3">
                  <div className="p-2 bg-eco-500 text-white rounded-lg">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-eco-600 uppercase">Status</p>
                    <p className="text-xs font-medium text-eco-800">On schedule for Brgy. {selectedBarangay}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTruckDetailsOpen(false)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMapModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl h-[80vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-slate-900">Live Collection Map</h2>
                    <p className="text-xs text-slate-500">Real-time tracking for Brgy. {selectedBarangay}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMapModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 relative bg-slate-50 overflow-hidden">
                {/* Large Stylized Map */}
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 600">
                  <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  <path d="M 0 300 Q 400 100 800 300" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-400" />
                  <path d="M 200 0 Q 600 300 200 600" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-400" />
                  
                  {/* Historical Route (Simulated) */}
                  {truckStatus === 'in-transit' && (
                    <motion.path 
                      d="M 50 50 L 750 50 L 750 550 L 50 550 Z" 
                      stroke="#3b82f6" 
                      strokeWidth="8" 
                      strokeDasharray="16 16" 
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  )}
                </svg>

                {/* Simulated Streets */}
                <div className="absolute inset-0 p-12">
                  <div className="w-full h-full border-4 border-slate-200 rounded-3xl relative">
                    {/* Truck on Large Map */}
                    <AnimatePresence>
                      {truckStatus === 'in-transit' && (
                        <motion.div 
                          initial={{ x: "10%", y: "10%" }}
                          animate={{ 
                            x: ["5%", "90%", "90%", "5%", "5%"],
                            y: ["5%", "5%", "90%", "90%", "5%"]
                          }}
                          transition={{ 
                            duration: 30, 
                            repeat: Infinity, 
                            ease: "linear" 
                          }}
                          className="absolute z-10 cursor-pointer"
                          onClick={() => setIsTruckDetailsOpen(true)}
                        >
                          <div className="relative group">
                            <div className="absolute -inset-8 bg-blue-500/10 rounded-full animate-ping"></div>
                            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 group-hover:scale-105 transition-transform">
                              <Truck size={32} />
                              <div className="text-left">
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Truck #QC-502</p>
                                <p className="text-sm font-bold">In Transit</p>
                                <p className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded mt-1">Tap for Details</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Map Markers */}
                    <div className="absolute top-1/4 left-1/3">
                      <div className="flex flex-col items-center">
                        <MapPin size={24} className="text-eco-600" />
                        <span className="bg-white px-2 py-1 rounded shadow-sm text-[10px] font-bold mt-1">Barangay Hall</span>
                      </div>
                    </div>
                    <div className="absolute bottom-1/3 right-1/4">
                      <div className="flex flex-col items-center">
                        <MapPin size={24} className="text-amber-600" />
                        <span className="bg-white px-2 py-1 rounded shadow-sm text-[10px] font-bold mt-1">Redemption Center</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-lg space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Map Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                      <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                      <span>Collection Truck</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                      <MapPin size={12} className="text-eco-600" />
                      <span>Barangay Hall</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                      <MapPin size={12} className="text-amber-600" />
                      <span>Plastic to Peso Center</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status</span>
                    <span className={`text-sm font-bold ${truckStatus === 'in-transit' ? 'text-green-600' : 'text-slate-500'}`}>
                      {truckStatus === 'in-transit' ? 'Collecting in Sector 4' : 'Truck Offline'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMapModalOpen(false)}
                  className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  Close Map
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isRecycleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRecycleModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-eco-100 text-eco-600 rounded-lg">
                    <Leaf size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">Plastic to Peso</h2>
                </div>
                <button 
                  onClick={() => setIsRecycleModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-eco-50 p-6 rounded-2xl border border-eco-100 text-center">
                  <p className="text-eco-600 font-bold text-sm uppercase tracking-widest mb-2">Incentive Program</p>
                  <h3 className="text-4xl font-display font-bold text-eco-900 mb-1">₱1.00</h3>
                  <p className="text-slate-600 font-medium">Per Plastic Bottle (PET)</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900">How it works:</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3 text-sm">
                      <div className="w-6 h-6 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold">1</div>
                      <p className="text-slate-600">Collect clean, empty plastic bottles (PET type).</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="w-6 h-6 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold">2</div>
                      <p className="text-slate-600">Bring them to the **Mobile Redemption Truck** during its weekly visit to your barangay.</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="w-6 h-6 bg-eco-100 text-eco-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold">3</div>
                      <p className="text-slate-600">Receive your cash reward instantly or via digital wallet (GCash/Maya).</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                  <Info size={18} className="text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Bottles must be clean and with caps. Labels can remain. This program aims to reduce plastic pollution in District 5 waterways.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsRecycleModalOpen(false)}
                className="w-full mt-8 bg-eco-600 text-white font-bold py-4 rounded-2xl hover:bg-eco-700 transition-all shadow-lg shadow-eco-200"
              >
                Start Earning!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPolicyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPolicyModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-eco-100 text-eco-600 rounded-lg">
                    <Info size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">QC Waste Policy</h2>
                </div>
                <button 
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                <p>
                  Quezon City strictly enforces the **"Segregation at Source"** policy. This means residents are responsible for sorting their waste before collection.
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <p className="font-bold text-slate-800">Key Rules:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use separate bins for Bio and Non-Bio waste.</li>
                    <li>Only the scheduled waste type will be collected.</li>
                    <li>Hazardous waste must be handled separately.</li>
                    <li>Littering and open burning are strictly prohibited.</li>
                  </ul>
                </div>
                <p>
                  Violators may face fines or community service as per City Ordinance No. SP-2350, S-2014.
                </p>
              </div>

              <button 
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-full mt-8 bg-eco-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-eco-100 flex items-center justify-between bg-eco-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Bantay-Bot</h3>
                    <p className="text-[10px] opacity-80">District 5 Digital Assistant</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-eco-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 shadow-sm border border-eco-100 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-eco-100 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-eco-300 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-eco-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-eco-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-eco-100 bg-white">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask about schedules, reporting, etc..."
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-eco-500 outline-none rounded-xl text-sm transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!userInput.trim() || isTyping}
                    className="p-2 bg-eco-600 text-white rounded-xl hover:bg-eco-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-eco-100 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-eco-600" />
            <span className="font-display font-bold text-slate-900">Bantay Basura D5</span>
          </div>
          <p className="text-slate-400 text-xs">
            © 2026 Quezon City Government - District 5. Segregation at Source Policy.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-eco-600 text-xs transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-eco-600 text-xs transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
