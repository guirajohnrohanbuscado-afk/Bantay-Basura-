import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize the scanner
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
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
        // console.warn(`QR Code no longer in front of camera: ${errorMessage}`);
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-white/20"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-xl text-slate-900">Scan QR Code</h3>
            <p className="text-xs text-slate-500">Scan codes found on bins or community posters</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div id="qr-reader" className="overflow-hidden rounded-3xl border-0" />
          
          <div className="mt-8 bg-eco-50 p-4 rounded-2xl border border-eco-100">
            <p className="text-xs text-eco-800 leading-relaxed">
              <span className="font-bold">Instructions:</span> Center the QR code within the frame above. 
              You can scan codes to instantly report issues, view location-specific schedules, or learn about recycling programs.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
