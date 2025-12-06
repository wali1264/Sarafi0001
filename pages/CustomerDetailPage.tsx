
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { Customer, CustomerTransaction, Currency, User, InternalExchange } from '../types';
import { CURRENCIES } from '../constants';
import InternalExchangeModal from '../components/InternalExchangeModal';
import { useAuth } from '../contexts/AuthContext';
import StatementPrintView from '../components/StatementPrintView';
import { supabase } from '../services/supabaseClient';
import CommissionLedgerModal from '../components/CommissionLedgerModal';
import { useUnifiedBalance } from '../contexts/UnifiedBalanceContext';
import ShareButton from '../components/ShareButton';

interface StatementPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
}

const StatementPrintPreviewModal: React.FC<StatementPrintPreviewModalProps> = ({ isOpen, onClose, customerId }) => {
    const printableAreaId = useMemo(() => `printable-customer-statement-${customerId}`, [customerId]);

    if (!isOpen) return null;

    const handlePrint = () => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <StatementPrintView entityId={customerId} type="customer" id={printableAreaId} />,
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
                         <StatementPrintView entityId={customerId} type="customer" id={printableAreaId} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <ShareButton printableAreaId={printableAreaId} fileName={`customer_statement_${customerId}`} />
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


const CustomerDetailPage: React.FC = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();
    const api = useApi();
    const { user } = useAuth();
    const { getUnifiedCustomerById, getRentedIrtBalance } = useUnifiedBalance();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [processedTransactions, setProcessedTransactions] = useState<(CustomerTransaction & { balanceAfter: number })[]>([]);
    const [exchangeHistory, setExchangeHistory] = useState<InternalExchange[]>([]);
    const [isInternalExchangeModalOpen, setInternalExchangeModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [isCommissionLedgerOpen, setCommissionLedgerOpen] = useState(false);


    const fetchData = useCallback(async () => {
        if (!customerId) return;

        const customerData = getUnifiedCustomerById(customerId);
        
        if (customerData) {
            setCustomer(customerData);
            
            const [txData, exchangeData] = await Promise.all([
                api.getTransactionsForCustomer(customerId),
                api.getInternalExchangesForCustomer(customerId)
            ]);
            setExchangeHistory(exchangeData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            
            const runningBalances: { [key in Currency]?: number } = {};
            const processed = txData
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Oldest first
                .map(tx => {
                    const balance = runningBalances[tx.currency] || 0;
                    const newBalance = balance + (tx.type === 'credit' ? tx.amount : -tx.amount);
                    runningBalances[tx.currency] = newBalance;
                    return { ...tx, balanceAfter: newBalance };
                });
            setProcessedTransactions(processed.reverse()); // Newest first for display
        } else {
            // Data might not be ready yet, or invalid ID. For now, navigate back.
            // A better solution might be a loading state in the unified context.
            // navigate('/customers');
        }
    }, [api, customerId, navigate, getUnifiedCustomerById]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!customerId) return;

        const channel = supabase
            .channel(`customer-detail-updates-${customerId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_transactions', filter: `customer_id=eq.${customerId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_exchanges', filter: `customer_id=eq.${customerId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'commission_transfers', filter: `initiator_id=eq.${customerId}` }, () => fetchData())
             // Listen to rented transactions as well to update unified balance
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rented_account_transactions' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [customerId, fetchData]);
    
    const handleModalSuccess = () => {
        setInternalExchangeModalOpen(false);
        fetchData(); // Refresh data after successful operation
    };

    const rentedIrtBalance = customer ? getRentedIrtBalance(customer.id) : 0;

    if (!customer) {
        return <div className="text-center text-slate-400 text-2xl">در حال بارگذاری اطلاعات مشتری...</div>;
    }

    const getBalanceStyle = (balance: number) => {
        if (balance > 0) return 'text-red-400'; // We owe customer (Sarrafi is in debt - danger)
        if (balance < 0) return 'text-green-400'; // Customer owes us (Sarrafi is owed - asset)
        return 'text-slate-300';
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <button onClick={() => navigate('/customers')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست مشتریان
            </button>
            
            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{customer.name}</h1>
                    <div className="mt-2 text-3xl font-mono text-cyan-300">کد: {customer.code}</div>
                </div>
                 <div className="flex items-start gap-x-16">
                    <div className="text-left space-y-2">
                         <h3 className="text-2xl text-teal-400">موجودی حسابات کرایی</h3>
                        <div className={`text-3xl font-mono font-bold ${getBalanceStyle(rentedIrtBalance)}`}>
                            {new Intl.NumberFormat('en-US').format(rentedIrtBalance)} IRT_BANK
                        </div>
                    </div>
                    <div className="text-left space-y-2">
                        <h3 className="text-2xl text-slate-400">موجودی حسابات</h3>
                        {CURRENCIES.map(currency => {
                            const balance = customer.balances[currency] || 0;
                            if (balance === 0 && !processedTransactions.some(tx => tx.currency === currency)) return null; 
                            return (
                                <div key={currency} className={`text-3xl font-mono font-bold ${getBalanceStyle(balance)}`}>
                                    {new Intl.NumberFormat('en-US').format(balance)} {currency}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب مشتری</h2>
                     <div className="flex gap-4">
                         <button 
                            onClick={() => navigate(`/rented-accounts/user/customer-${customerId}`)}
                            className="px-5 py-2 bg-teal-600/50 text-teal-100 hover:bg-teal-500/50 text-lg transition-colors border border-teal-500/50 rounded"
                         >
                            دفتر حساب کرایی
                        </button>
                         <button 
                            onClick={() => setInternalExchangeModalOpen(true)}
                            className="px-5 py-2 bg-amber-600/50 text-amber-100 hover:bg-amber-500/50 text-lg transition-colors border border-amber-500/50 rounded"
                         >
                            + تبدیل ارز داخلی
                        </button>
                        <button 
                            onClick={() => setCommissionLedgerOpen(true)}
                            className="px-5 py-2 bg-indigo-600/50 text-indigo-100 hover:bg-indigo-500/50 text-lg transition-colors border border-indigo-500/50 rounded"
                         >
                            حواله های کمیشنی
                        </button>
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
                                <th scope="col" className="px-6 py-4 font-medium">رسیدن (بستانکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بردان (بدهکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium text-left">مانده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">
                                        {tx.type === 'credit' ? `${new Intl.NumberFormat('en-US').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                     <td className="px-6 py-4 font-mono text-left text-red-400">
                                        {tx.type === 'debit' ? `${new Intl.NumberFormat('en-US').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-left whitespace-nowrap ${getBalanceStyle(tx.balanceAfter)}`}>
                                        {new Intl.NumberFormat('en-US').format(tx.balanceAfter)} {tx.currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {exchangeHistory.length > 0 && (
                <div className="mt-12 bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                    <div className="p-6 border-b-2 border-cyan-400/20">
                        <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تاریخچه تبادلات ارزی</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                    <th scope="col" className="px-6 py-4 font-medium text-left">از</th>
                                    <th scope="col" className="px-6 py-4 font-medium text-left">به</th>
                                    <th scope="col" className="px-6 py-4 font-medium">نرخ</th>
                                    <th scope="col" className="px-6 py-4 font-medium">کاربر</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchangeHistory.map(ex => (
                                    <tr key={ex.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                        <td className="px-6 py-4">{new Date(ex.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                        <td className="px-6 py-4 font-mono text-left text-red-400">
                                            {new Intl.NumberFormat('en-US').format(ex.fromAmount)} {ex.fromCurrency}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-left text-green-400">
                                            {new Intl.NumberFormat('en-US').format(ex.toAmount)} {ex.toCurrency}
                                        </td>
                                        <td className="px-6 py-4 font-mono">{ex.rate}</td>
                                        <td className="px-6 py-4">{ex.user}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {isInternalExchangeModalOpen && user && (
                <InternalExchangeModal
                    isOpen={isInternalExchangeModalOpen}
                    onClose={() => setInternalExchangeModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    currentUser={user}
                    customer={customer}
                />
            )}
            
            {isPrintModalOpen && customerId && (
                <StatementPrintPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setPrintModalOpen(false)}
                    customerId={customerId}
                />
            )}

            {isCommissionLedgerOpen && customerId && (
                <CommissionLedgerModal
                    isOpen={isCommissionLedgerOpen}
                    onClose={() => setCommissionLedgerOpen(false)}
                    customerId={customerId}
                    customerName={customer.name}
                />
            )}

        </div>
    );
};

export default CustomerDetailPage;
