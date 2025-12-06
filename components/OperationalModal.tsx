import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

interface OperationalModalProps {
    isOpen: boolean;
    title: string;
    data: any;
    type: 'confirmation' | 'report';
    onConfirm: () => void;
    onCancel: () => void;
}

const LiveType: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText(''); // Reset on new text
        if (text) {
            let i = 0;
            const intervalId = setInterval(() => {
                setDisplayedText(text.slice(0, i));
                i++;
                if (i > text.length) {
                    clearInterval(intervalId);
                }
            }, 10); // Adjust typing speed here
            return () => clearInterval(intervalId);
        }
    }, [text]);

    return <pre className="whitespace-pre-wrap font-sans text-lg text-slate-200">{displayedText}</pre>;
};

const ConfirmationDataView: React.FC<{ data: any }> = ({ data }) => {
    const formattedData = useMemo(() => {
        if (typeof data !== 'object' || data === null) return [];
        return Object.entries(data).map(([key, value]) => ({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format key for display
            value: String(value)
        }));
    }, [data]);
    
    return (
        <dl className="text-lg bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
            {formattedData.map(({label, value}, index) => (
                <div key={index} className="py-3 px-4 odd:bg-slate-700/30 grid grid-cols-3 gap-4">
                    <dt className="font-semibold text-slate-400">{label}</dt>
                    <dd className="col-span-2 text-slate-100 font-mono">{value}</dd>
                </div>
            ))}
        </dl>
    );
};


const OperationalModal: React.FC<OperationalModalProps> = ({ isOpen, title, data, type, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-[60] transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/95 w-full max-w-4xl max-h-[85vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_50px_rgba(0,255,255,0.3)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <header className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">{title}</h2>
                </header>

                <main className="p-8 flex-grow overflow-y-auto">
                    {type === 'report' && (
                        <LiveType text={data} />
                    )}
                    {type === 'confirmation' && (
                        <ConfirmationDataView data={data} />
                    )}
                </main>

                <footer className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse flex-shrink-0">
                    <button onClick={onCancel} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">
                        {type === 'confirmation' ? 'لغو' : 'بستن'}
                    </button>
                    {type === 'confirmation' && (
                         <button
                            onClick={onConfirm}
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            تایید نهایی
                        </button>
                    )}
                </footer>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default OperationalModal;
