import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Scan, Zap, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize the scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 20, // Increased for smoother detection
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Handle successful scan
        if (scannerRef.current) {
          scannerRef.current.clear().then(() => {
            onScan(decodedText);
          }).catch(err => {
            console.error("Failed to clear scanner", err);
            onScan(decodedText);
          });
        }
      },
      (errorMessage) => {
        // Handle scan failure (optional)
        if (isInitializing) setIsInitializing(false);
      }
    );

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error("Failed to clear scanner on cleanup", err);
        });
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden relative z-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20"
      >
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-eco-100 rounded-2xl flex items-center justify-center text-eco-600">
              <Scan size={24} />
            </div>
            <div>
              <h3 className="font-display font-bold text-2xl text-slate-900">Smart Scanner</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">District 5 Intelligence</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Scanner Body */}
        <div className="p-8 pt-4">
          <div className="relative">
            <div id="qr-reader" className="overflow-hidden rounded-[2.5rem] border-0 bg-slate-900 aspect-square" />
            
            {/* Overlay Frames */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-2/3 aspect-square relative">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-eco-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-eco-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-eco-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-eco-500 rounded-br-xl" />
                
                {/* Scanning Line Animation */}
                <motion.div 
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-[10%] right-[10%] h-0.5 bg-eco-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] z-10"
                />
              </div>
            </div>

            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4 text-white">
                <div className="w-12 h-12 border-4 border-eco-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold tracking-widest uppercase">Initializing Camera</p>
              </div>
            )}
          </div>
          
          {/* Instructions Bento */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-eco-50 p-5 rounded-3xl border border-eco-100 flex gap-4">
              <div className="w-10 h-10 bg-eco-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-eco-200">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-eco-900">Instant Reports</h4>
                <p className="text-[10px] text-eco-700 font-medium leading-relaxed mt-1">
                  Scan codes on bins to report missing pickups or full containers.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-200">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Community Sync</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                  Scan Community IDs to verify recycling participation.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              Keep the code within the markers for faster detection. For low light conditions, try to bring the code closer to the screen's light.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
