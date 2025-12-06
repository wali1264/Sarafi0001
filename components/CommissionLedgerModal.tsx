import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { CommissionTransfer } from '../types';
import CommissionLedger from './CommissionLedger';

interface CommissionLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
}

const CommissionLedgerModal: React.FC<CommissionLedgerModalProps> = ({ isOpen, onClose, customerId, customerName }) => {
    const api = useApi();
    const [transfers, setTransfers] = useState<CommissionTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && customerId) {
            setIsLoading(true);
            api.getCommissionTransfersForInitiator(customerId)
                .then(data => {
                    setTransfers(data); // Already sorted by API
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, customerId, api]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-7xl h-[90vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">حواله های کمیشنی</h2>
                    <p className="text-xl text-slate-400 mt-1">{customerName}</p>
                </div>
                <div className="p-8 flex-grow overflow-y-auto">
                    <CommissionLedger transfers={transfers} isLoading={isLoading} />
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default CommissionLedgerModal;