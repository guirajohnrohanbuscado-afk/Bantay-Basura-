import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, Clipboard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BARANGAYS } from '../constants';

interface QRGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRGalleryModal: React.FC<QRGalleryModalProps> = ({ isOpen, onClose }) => {
  const samples = [
    {
      title: 'Report Pickup',
      desc: 'Scan this to report a missed collection in Fairview.',
      data: JSON.stringify({ action: 'report', barangay: 'Fairview', street: 'Dahlia Ave' })
    },
    {
      title: 'Switch Barangay',
      desc: 'Scan this to quickly switch to Greater Lagro.',
      data: 'Greater Lagro'
    },
    {
      title: 'Help Center',
      desc: 'Scan this to open the QC Waste Management website.',
      data: 'https://quezoncity.gov.ph/program/waste-management/'
    }
  ];

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
            className="relative bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="text-eco-600" />
                    Test QR Samples
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Use these to test the scanner's intelligence system</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {samples.map((sample, idx) => (
                  <div key={idx} className="flex flex-col items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center group">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover:shadow-md transition-all">
                      <QRCodeSVG value={sample.data} size={120} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{sample.title}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-4">{sample.desc}</p>
                    <div className="mt-auto pt-2 w-full">
                        <div className="text-[8px] font-mono text-slate-400 bg-white p-2 rounded-lg border border-slate-100 truncate mb-2">
                            {sample.data}
                        </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shrink-0 h-fit">
                    <Clipboard size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">How to use</h4>
                    <p className="text-xs text-blue-700 leading-relaxed mt-1">
                        Open the scanner on another device and point it at these codes, or screenshot them and use a "scan from file" feature (standard in most mobile browsers).
                    </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
