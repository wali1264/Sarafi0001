import React, { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { ForeignTransaction, User, Asset, ForeignTransactionStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import InitiateExchangeModal from '../components/LogForeignTransactionModal'; // Renamed in spirit to InitiateExchangeModal
import { persianToEnglishNumber, foreignTransactionStatusTranslations } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';
import { CompleteForeignExchangePayload } from '../types';


const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);


interface CompleteExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    assets: Asset[];
    transaction: ForeignTransaction;
}

const CompleteExchangeModal: React.FC<CompleteExchangeModalProps> = ({ isOpen, onClose, onSuccess, currentUser, assets, transaction }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [toAssetId, setToAssetId] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const toAsset = useMemo(() => assets.find(a => a.id === toAssetId), [assets, toAssetId]);

    useEffect(() => {
        if (!isOpen) {
            setToAssetId('');
            setToAmount('');
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload: CompleteForeignExchangePayload = {
            transaction_id: transaction.id,
            to_asset_id: toAssetId,
            to_amount: parseFloat(persianToEnglishNumber(toAmount)) || 0,
            user: currentUser,
        };
        
        const result = await api.completeForeignExchange(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست رسید برای تبادله به صندوق ارسال شد.", 'success');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-amber-400/30 shadow-[0_0_40px_rgba(251,191,36,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-amber-400/20"><h2 className="text-4xl font-bold text-amber-300 tracking-wider">تکمیل تبادله</h2></div>
                
                <form onSubmit={handleSubmit}>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="p-4 border border-slate-600/50 bg-slate-800/30 rounded-md">
                            <h3 className="text-xl font-bold text-slate-300">جزئیات مرحله اول (برد)</h3>
                            <p className="text-lg"><strong>شرح:</strong> {transaction.description}</p>
                            <p className="text-lg font-mono">
                                <strong>مبلغ برداشتی:</strong> <span className="text-red-400">{new Intl.NumberFormat().format(transaction.from_amount)} {transaction.from_currency}</span> از {transaction.from_asset_name}
                            </p>
                        </div>

                        <div className="p-4 border-2 border-green-500/20 bg-green-500/10 rounded-md space-y-4">
                            <h3 className="text-2xl font-bold text-green-300">رسید وجه جدید</h3>
                            <div>
                                <label className="block text-lg font-medium text-slate-200 mb-2">کدام دارایی را دریافت کردید؟ (مقصد)</label>
                                <select value={toAssetId} onChange={(e) => setToAssetId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-green-400 text-right">
                                    <option value="">-- انتخاب دارایی --</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                 <label className="block text-lg font-medium text-slate-200 mb-2">چه مبلغی دریافت کردید؟ ({toAsset?.currency})</label>
                                 <input value={toAmount} onChange={(e) => setToAmount(e.target.value)} placeholder="0.00" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-green-400 text-right font-mono" />
                            </div>
                        </div>
                         <p className="text-yellow-400 text-base">با ثبت این فرم، یک درخواست واریز (رسید) به صندوق ارسال می‌شود. پس از تایید صندوقدار، تبادله تکمیل خواهد شد.</p>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-amber-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50">
                            {isLoading ? 'در حال ارسال...' : 'تکمیل تبادله'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ForeignTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transactions, setTransactions] = useState<ForeignTransaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isInitiateModalOpen, setInitiateModalOpen] = useState(false);
    const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<ForeignTransaction | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [txData, assetsData] = await Promise.all([
            api.getForeignTransactions(),
            api.getAvailableAssets()
        ]);
        setTransactions(txData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setAssets(assetsData);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setInitiateModalOpen(false);
        setCompleteModalOpen(false);
        setSelectedTransaction(null);
        fetchData();
    };

    const handleCompleteClick = (tx: ForeignTransaction) => {
        setSelectedTransaction(tx);
        setCompleteModalOpen(true);
    };

    const getStatusStyle = (status: ForeignTransactionStatus) => {
        switch (status) {
            case ForeignTransactionStatus.Completed: return 'bg-green-500/20 text-green-300';
            case ForeignTransactionStatus.PendingDeposit: return 'bg-sky-500/20 text-sky-300';
            case ForeignTransactionStatus.PendingWithdrawalApproval:
            case ForeignTransactionStatus.PendingDepositApproval:
                return 'bg-yellow-500/20 text-yellow-300';
            case ForeignTransactionStatus.Rejected: return 'bg-red-500/20 text-red-300';
            default: return 'bg-slate-600/20 text-slate-300';
        }
    };

    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت تبادلات</h1>
                 {hasPermission('foreignTransfers', 'create') && (
                    <button onClick={() => setInitiateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + شروع تبادله جدید
                    </button>
                )}
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر روزنامه تبادلات</h2>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">شرح</th>
                                <th className="px-6 py-4 font-medium">مبلغ فروش</th>
                                <th className="px-6 py-4 font-medium">مبلغ خرید</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.from_amount)} {tx.from_currency}</div>
                                        <div className="text-sm text-slate-400 text-left">از: {tx.from_asset_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tx.to_amount ? (
                                            <>
                                                <div className="font-mono text-left text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.to_amount)} {tx.to_currency}</div>
                                                <div className="text-sm text-slate-400 text-left">به: {tx.to_asset_name}</div>
                                            </>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(tx.status)}`}>
                                            {foreignTransactionStatusTranslations[tx.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        {tx.status === ForeignTransactionStatus.PendingDeposit && hasPermission('foreignTransfers', 'create') && (
                                            <button onClick={() => handleCompleteClick(tx)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded text-base font-bold">
                                                تکمیل تبادله
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isInitiateModalOpen && user && (
                <InitiateExchangeModal
                    isOpen={isInitiateModalOpen}
                    onClose={() => setInitiateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    assets={assets}
                />
            )}
            {isCompleteModalOpen && user && selectedTransaction && (
                <CompleteExchangeModal 
                    isOpen={isCompleteModalOpen}
                    onClose={() => setCompleteModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    assets={assets}
                    transaction={selectedTransaction}
                />
            )}
        </div>
    );
};

export default ForeignTransfersPage;