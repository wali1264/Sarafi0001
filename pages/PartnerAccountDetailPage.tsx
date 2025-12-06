import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { PartnerAccount, PartnerTransaction, User, Currency, CashboxRequest, CashboxRequestStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PartnerSettlementModal from '../components/SettleBalanceModal';
import { CURRENCIES } from '../constants';
import { cashboxRequestStatusTranslations } from '../utils/translations';
import StatementPrintView from '../components/StatementPrintView';
import { supabase } from '../services/supabaseClient';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import ShareButton from '../components/ShareButton';

interface StatementPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerId: string;
}

const StatementPrintPreviewModal: React.FC<StatementPrintPreviewModalProps> = ({ isOpen, onClose, partnerId }) => {
    const printableAreaId = useMemo(() => `printable-partner-statement-${partnerId}`, [partnerId]);

    if (!isOpen) return null;

    const handlePrint = () => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <StatementPrintView entityId={partnerId} type="partner" id={printableAreaId} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
                        ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-5xl h-[90vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پیش‌نمایش چاپ صورتحساب</h2>
                </div>
                <div className="p-8 flex-grow overflow-y-auto bg-gray-600/20">
                    <div className="bg-white rounded shadow-lg mx-auto">
                         <StatementPrintView entityId={partnerId} type="partner" id={printableAreaId} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <ShareButton printableAreaId={printableAreaId} fileName={`partner_statement_${partnerId}`} />
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


const PartnerAccountDetailPage: React.FC = () => {
    const { partnerId } = useParams<{ partnerId: string }>();
    const navigate = useNavigate();
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const { users: rentedUsers } = useRentedAccounts();

    const [partner, setPartner] = useState<PartnerAccount | null>(null);
    const [processedTransactions, setProcessedTransactions] = useState<(PartnerTransaction & { balanceAfter: number; status?: CashboxRequestStatus | 'Completed' })[]>([]);
    const [settlementModal, setSettlementModal] = useState<{isOpen: boolean, type: 'receive' | 'pay' | null}>({isOpen: false, type: null});
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);

    const rentedUser = rentedUsers.find(u => u.type === 'Partner' && u.entityId === partnerId);

    const fetchData = useCallback(async () => {
        if (!partnerId) return;
        
        const [partnerData, txData, allCashboxRequests] = await Promise.all([
            api.getPartnerAccountById(partnerId),
            api.getTransactionsForPartner(partnerId),
            api.getCashboxRequests(),
        ]);

        if (partnerData) {
            setPartner(partnerData);
            
            const settlementRequests = allCashboxRequests.filter(
                req => req.linked_entity?.type === 'PartnerSettlement' && req.linked_entity.id === partnerId
            );

            const virtualTransactions = settlementRequests.map(req => {
                const details = req.linked_entity!.details as any;
                return {
                    id: req.id,
                    timestamp: req.created_at,
                    description: req.reason,
                    type: details.type, // 'credit' or 'debit' for the PARTNER
                    amount: req.amount,
                    currency: req.currency,
                    status: req.status,
                    partner_id: partnerId,
                } as any;
            });
            
            const realTransactions = txData.map(tx => ({
                ...tx,
                status: 'Completed' as const,
            }));

            const allItems = [...virtualTransactions, ...realTransactions]
                .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const runningBalances: { [key in Currency]?: number } = {};
            const processed = allItems.map(item => {
                const balance = runningBalances[item.currency] || 0;
                let newBalance = balance;
                
                const isApproved = item.status === 'Completed' || item.status === CashboxRequestStatus.Approved || item.status === CashboxRequestStatus.AutoApproved;

                if (isApproved) {
                    newBalance = balance + (item.type === 'credit' ? item.amount : -item.amount);
                    runningBalances[item.currency] = newBalance;
                }
                return { ...item, balanceAfter: newBalance };
            });

            setProcessedTransactions(processed.reverse());

        } else {
            navigate('/partner-accounts');
        }
    }, [api, partnerId, navigate]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!partnerId) return;

        const channel = supabase
            .channel(`partner-detail-updates-${partnerId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_transactions', filter: `partner_id=eq.${partnerId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_requests' }, () => fetchData())
             // Listen to rented transactions as well to update unified balance
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rented_account_transactions' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [partnerId, fetchData]);
    
    const handleSuccess = () => {
        setSettlementModal({ isOpen: false, type: null });
        fetchData();
    }

    if (!partner) {
        return <div className="text-center text-slate-400 text-2xl">در حال بارگذاری اطلاعات همکار...</div>;
    }

    const getBalanceStyle = (balance: number) => {
        if (balance > 0) return 'text-red-400'; // We owe them (Sarrafi is in debt - danger)
        if (balance < 0) return 'text-green-400'; // They owe us (Sarrafi is owed - asset)
        return 'text-slate-300';
    };

    const getStatusBadgeStyle = (status: CashboxRequestStatus | 'Completed') => {
        if (status === 'Completed' || status === CashboxRequestStatus.Approved || status === CashboxRequestStatus.AutoApproved) {
            return 'bg-green-500/20 text-green-300';
        }
        if (status === CashboxRequestStatus.Rejected) {
            return 'bg-red-500/20 text-red-300';
        }
        return 'bg-yellow-500/20 text-yellow-300'; // Pending states
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <button onClick={() => navigate('/partner-accounts')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست همکاران
            </button>
            
            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{partner.name}</h1>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی حسابات</h3>
                    {CURRENCIES.map(currency => {
                        const balance = partner.balances[currency] || 0;
                        if (balance === 0 && !processedTransactions.some(tx => tx.currency === currency)) return null; 
                        return (
                            <div key={currency} className={`text-3xl font-mono font-bold ${getBalanceStyle(balance)}`}>
                                {new Intl.NumberFormat('en-US').format(balance)} {currency}
                            </div>
                        )
                    })}
                    {rentedUser && rentedUser.balance !== 0 && (
                        <div key="IRT_BANK_RENTED" className={`text-3xl font-mono font-bold ${getBalanceStyle(rentedUser.balance)}`}>
                            {new Intl.NumberFormat('en-US').format(rentedUser.balance)} IRT_BANK (کرایی)
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب همکار</h2>
                    <div className="flex gap-x-4 flex-wrap">
                        {hasPermission('partnerAccounts', 'create') && (
                            <>
                                <button 
                                    onClick={() => setSettlementModal({ isOpen: true, type: 'receive' })}
                                    className="px-5 py-2 bg-green-600/50 text-green-200 hover:bg-green-500/50 text-lg transition-colors border border-green-500/50 rounded"
                                >
                                    دریافت وجه از همکار
                                </button>
                                <button 
                                    onClick={() => setSettlementModal({ isOpen: true, type: 'pay' })}
                                    className="px-5 py-2 bg-red-600/50 text-red-200 hover:bg-red-500/50 text-lg transition-colors border border-red-500/50 rounded"
                                >
                                    پرداخت وجه به همکار
                                </button>
                            </>
                        )}
                         <button 
                            onClick={() => setPrintModalOpen(true)}
                            className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                         >
                            چاپ صورتحساب
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                                <th scope="col" className="px-6 py-4 font-medium">طلبکار (Credit)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بدهکار (Debit)</th>
                                <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                                <th scope="col" className="px-6 py-4 font-medium text-left">مانده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedTransactions.map(tx => {
                                const isCompleted = tx.status === 'Completed' || tx.status === CashboxRequestStatus.Approved || tx.status === CashboxRequestStatus.AutoApproved;
                                const getRowStyle = () => {
                                    if (isCompleted) return 'hover:bg-cyan-400/5';
                                    if (tx.status === CashboxRequestStatus.Rejected) return 'bg-red-900/30 opacity-60';
                                    return 'bg-yellow-900/20 opacity-80';
                                };

                                return (
                                <tr key={tx.id} className={`border-b border-cyan-400/10 transition-colors ${getRowStyle()}`}>
                                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">
                                        {tx.type === 'credit' ? `${new Intl.NumberFormat('en-US').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                     <td className="px-6 py-4 font-mono text-left text-red-400">
                                        {tx.type === 'debit' ? `${new Intl.NumberFormat('en-US').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full whitespace-nowrap ${getStatusBadgeStyle(tx.status!)}`}>
                                            {tx.status === 'Completed' ? 'تکمیل شده' : cashboxRequestStatusTranslations[tx.status!]}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-left whitespace-nowrap ${isCompleted ? getBalanceStyle(tx.balanceAfter) : 'text-slate-500'}`}>
                                        {new Intl.NumberFormat('en-US').format(tx.balanceAfter)} {tx.currency}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {settlementModal.isOpen && user && settlementModal.type && (
                <PartnerSettlementModal 
                    isOpen={settlementModal.isOpen}
                    onClose={() => setSettlementModal({isOpen: false, type: null})}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    partner={partner}
                    type={settlementModal.type}
                />
            )}
            {isPrintModalOpen && partnerId && (
                <StatementPrintPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setPrintModalOpen(false)}
                    partnerId={partnerId}
                />
            )}
        </div>
    );
};

export default PartnerAccountDetailPage;