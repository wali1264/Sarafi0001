
import React from 'react';
import ReactDOM from 'react-dom';

interface NumberViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    value: string;
    currency: string;
}

const NumberViewModal: React.FC<NumberViewModalProps> = ({ isOpen, onClose, title, value, currency }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity animate-fadeIn" onClick={onClose} style={{ direction: 'rtl' }}>
            <div 
                className="bg-[#12122E]/95 p-10 rounded-2xl border-2 border-cyan-400 shadow-[0_0_60px_rgba(34,211,238,0.3)] max-w-[95vw] relative flex flex-col items-center gap-8 glowing-border" 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-3xl text-slate-300 font-medium tracking-wide border-b border-cyan-500/30 pb-4 px-8">{title}</h2>
                
                <div className="text-center space-y-4">
                    <p className="text-7xl md:text-9xl font-bold font-mono text-cyan-300 break-all leading-tight select-all drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                        {value}
                    </p>
                    <p className="text-4xl md:text-5xl text-slate-400 font-bold tracking-wider">{currency}</p>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default NumberViewModal;
