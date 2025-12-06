
import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, User, TransferStatus, PayoutIncomingTransferPayload } from '../types';
import { statusTranslations } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';
import { formatTrackingCode } from '../utils/idGenerator';

interface ProcessIncomingTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const ProcessIncomingTransferModal: React.FC<ProcessIncomingTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [query, setQuery] = useState('');
    const [allUnexecutedTransfers, setAllUnexecutedTransfers] = useState<DomesticTransfer[]>([]);
    const [searchResults, setSearchResults] = useState<DomesticTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    // Fetch all unexecuted transfers on mount to allow client-side filtering by short ID
    useEffect(() => {
        if (isOpen) {
            const fetchTransfers = async () => {
                setIsLoading(true);
                const allTransfers = await api.getDomesticTransfers();
                // Filter for unexecuted incoming transfers (those with partner_reference)
                // Actually, an incoming transfer is defined by having a partner_reference or being received from partner.
                // In create logic: incoming = has partner_reference.
                const unexecuted = allTransfers.filter(t => 
                    t.status === TransferStatus.Unexecuted && 
                    t.partner_reference // Only incoming transfers have this usually, or logic implies it
                );
                setAllUnexecutedTransfers(unexecuted);
                setIsLoading(false);
            };
            fetchTransfers();
        }
    }, [isOpen, api]);


    if (!isOpen) return null;

    const resetState = () => {
        setQuery('');
        setSearchResults([]);
        setError(null);
        setIsLoading(false);
        setSearched(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSearched(true);
        
        const q = query.toLowerCase();
        
        const results = allUnexecutedTransfers.filter(t => {
            const shortCode = formatTrackingCode(t.created_at);
            const longId = t.id.toLowerCase();
            const partnerRef = t.partner_reference?.toLowerCase() || '';
            const receiver = t.receiver.name.toLowerCase();
            const sender = t.sender.name.toLowerCase();
            
            return shortCode.includes(q) || longId.includes(q) || partnerRef.includes(q) || receiver.includes(q) || sender.includes(q);
        });
        
        setSearchResults(results);
    };

    const handlePayout = async (transferId: string) => {
        setIsLoading(true);
        setError(null);

        const payload: PayoutIncomingTransferPayload = {
            transfer_id: transferId,
            user: currentUser,
        };
        
        const result = await api.payoutIncomingTransfer(payload);
        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست پرداخت به صندوق ارسال شد.", 'success');
            onSuccess();
            handleClose();
        }
    };


    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پرداخت حواله ورودی</h2>
                </div>
                
                <div className="p-8 space-y-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="جستجو بر اساس کد رهگیری (کوتاه/بلند)، کد همکار، نام گیرنده..."
                            required
                            className="flex-grow text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                        />
                        <button type="submit" disabled={isLoading} 
                            className="px-8 py-2 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors disabled:opacity-50">
                            جستجو
                        </button>
                    </form>

                    {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                    
                    <div className="max-h-[50vh] overflow-y-auto">
                        {isLoading && <p className="text-center text-slate-400">در حال جستجو...</p>}
                        {!isLoading && searched && searchResults.length === 0 && (
                            <p className="text-center text-yellow-400 text-lg">هیچ حواله‌ای با این مشخصات یافت نشد.</p>
                        )}
                        {searchResults.length > 0 && (
                             <table className="w-full text-lg text-right text-slate-300">
                                <thead className="text-xl text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2">کد / فرستنده</th>
                                        <th className="px-4 py-2">گیرنده</th>
                                        <th className="px-4 py-2">مبلغ</th>
                                        <th className="px-4 py-2">وضعیت</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map(t => {
                                        const isPayable = t.status === TransferStatus.Unexecuted;
                                        return (
                                            <tr key={t.id} className="border-b border-cyan-400/10">
                                                <td className="px-4 py-3">
                                                    <div className="font-mono text-cyan-300 font-bold">{formatTrackingCode(t.created_at)}</div>
                                                    <div className="text-sm">{t.sender.name}</div>
                                                </td>
                                                <td className="px-4 py-3 font-semibold">{t.receiver.name}</td>
                                                <td className="px-4 py-3 font-mono">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                                <td className="px-4 py-3">{statusTranslations[t.status]}</td>
                                                <td className="px-4 py-3 text-left">
                                                    <button 
                                                        onClick={() => handlePayout(t.id)} 
                                                        disabled={!isPayable || isLoading}
                                                        className="px-4 py-2 text-base font-bold text-slate-900 bg-green-500 hover:bg-green-400 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-600"
                                                    >
                                                        پرداخت
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                             </table>
                        )}
                    </div>
                </div>

                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end">
                    <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">بستن</button>
                </div>

            </div>
        </div>
    );
};

export default ProcessIncomingTransferModal;
