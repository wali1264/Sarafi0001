import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CashboxRequest } from '../types';
import PrintableView from './PrintableView';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmPrint: (request: CashboxRequest, printNote: string) => void;
    request: CashboxRequest;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, onConfirmPrint, request }) => {
    const [printNote, setPrintNote] = useState('');

    if (!isOpen) return null;

    const handlePrint = () => {
        onConfirmPrint(request, printNote);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl h-[95vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پیش‌نمایش چاپ سند</h2>
                </div>

                <div className="p-8 flex-grow overflow-y-auto bg-gray-800/20 flex flex-col items-center">
                    <div className="w-full transform scale-[0.9] origin-top">
                        <PrintableView request={request} printNote={printNote} />
                    </div>
                </div>
                
                <div className="p-6 bg-black/30 border-t-2 border-cyan-400/20 flex-shrink-0">
                     <label htmlFor="printNote" className="block text-lg font-medium text-cyan-300 mb-2">یادداشت برای چاپ (اختیاری)</label>
                        <textarea
                            id="printNote"
                            value={printNote}
                            onChange={(e) => setPrintNote(e.target.value)}
                            placeholder="این یادداشت فقط روی نسخه چاپی نمایش داده می‌شود..."
                            rows={2}
                            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                        ></textarea>
                </div>

                <div className="px-8 py-5 bg-black/30 border-t border-slate-700 flex justify-end space-x-4 space-x-reverse flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <button
                        onClick={handlePrint}
                        className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}
                    >
                        چاپ نهایی
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default PrintPreviewModal;
