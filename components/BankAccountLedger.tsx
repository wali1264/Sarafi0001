import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { BankAccount, CashboxRequest, CashboxRequestStatus } from '../types';
import { cashboxRequestStatusTranslations } from '../utils/translations';

const TX_PER_PAGE = 15;

type TransactionWithBalance = CashboxRequest & { balanceAfter: number };

const BankAccountLedger: React.FC = () => {
    const api = useApi();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    // --- Filter State ---
    const initialFilters = { description: '', type: 'all', startDate: '', endDate: '' };
    const [filters, setFilters] = useState(initialFilters);
    const [visibleTxCount, setVisibleTxCount] = useState(TX_PER_PAGE);

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            const data = await api.getBankAccounts();
            setAccounts(data.filter(a => a.status === 'Active'));
            setIsLoading(false);
        };
        fetchAccounts();
    }, [api]);

    const handleSelectAccount = useCallback(async (account: BankAccount) => {
        setSelectedAccount(account);
        setIsLoadingTx(true);
        const txData = await api.getTransactionsForBankAccount(account.id);
        
        // Calculate running balance (oldest first)
        const runningBalances: { [key: string]: number } = {};
        const processed = txData.map(tx => {
            const balance = runningBalances[tx.currency] || 0;
            let newBalance = balance;

            const isApproved = tx.status === CashboxRequestStatus.Approved || tx.status === CashboxRequestStatus.AutoApproved;

            if (isApproved) {
                 newBalance = balance + (tx.request_type === 'deposit' ? tx.amount : -tx.amount);
            }
            runningBalances[tx.currency] = newBalance;
            return { ...tx, balanceAfter: newBalance };
        });

        setTransactions(processed.reverse()); // Newest first for display
        setIsLoadingTx(false);
    }, [api]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesDesc = !filters.description || tx.reason.toLowerCase().includes(filters.description.toLowerCase());
            const matchesType = filters.type === 'all' || tx.request_type === filters.type;
            const txDate = new Date(tx.created_at);
            const matchesStart = !filters.startDate || txDate >= new Date(filters.startDate);
            let matchesEnd = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                matchesEnd = txDate <= endDate;
            }
            return matchesDesc && matchesType && matchesStart && matchesEnd;
        });
    }, [transactions, filters]);
    
    const visibleTransactions = useMemo(() => filteredTransactions.slice(0, visibleTxCount), [filteredTransactions, visibleTxCount]);

    const getStatusStyle = (status: CashboxRequestStatus) => {
        switch(status) {
            case 'Approved': case 'AutoApproved': return 'text-green-400';
            case 'Rejected': return 'text-red-400 opacity-70';
            default: return 'text-yellow-400';
        }
    };

    if (isLoading) {
        return <p className="text-center text-slate-400 text-lg p-8">در حال بارگذاری حسابات بانکی...</p>;
    }

    if (selectedAccount) {
        return (
            <div className="space-y-8 animate-fadeIn">
                <button onClick={() => setSelectedAccount(null)} className="text-cyan-300 hover:text-cyan-200 text-lg flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                    بازگشت به لیست حساب‌ها
                </button>

                <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                     <div className="p-6 border-b-2 border-cyan-400/20">
                        <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تاریخچه حساب: {selectedAccount.bank_name} - {selectedAccount.account_holder}</h2>
                        <p className="text-xl font-mono text-cyan-300">موجودی فعلی: {new Intl.NumberFormat('fa-IR').format(selectedAccount.balance)} {selectedAccount.currency}</p>
                    </div>

                    <div className="p-4 border-b-2 border-cyan-400/20 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <input type="text" placeholder="جستجو در شرح..." value={filters.description} onChange={e => setFilters(f => ({...f, description: e.target.value}))} className="md:col-span-2 text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/>
                        <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه تراکنش‌ها</option>
                            <option value="deposit">رسید</option>
                            <option value="withdrawal">برد</option>
                        </select>
                        <div><label className="text-sm text-slate-400">از تاریخ:</label><input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/></div>
                        <div><label className="text-sm text-slate-400">تا تاریخ:</label><input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/></div>
                    </div>

                    <div className="overflow-x-auto">
                         <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4">تاریخ</th>
                                    <th className="px-6 py-4">شرح</th>
                                    <th className="px-6 py-4 text-left">رسید</th>
                                    <th className="px-6 py-4 text-left">برد</th>
                                    <th className="px-6 py-4 text-left">مانده</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingTx ? (<tr><td colSpan={5} className="p-8 text-center">در حال بارگذاری...</td></tr>) 
                                : visibleTransactions.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center">تراکنشی یافت نشد.</td></tr>)
                                : visibleTransactions.map(tx => (
                                    <tr key={tx.id} className={`border-b border-cyan-400/10 ${tx.status === 'Rejected' ? 'opacity-50' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.created_at).toLocaleString('fa-IR-u-nu-latn')}</td>
                                        <td className="px-6 py-4">{tx.reason} <span className={`text-sm ${getStatusStyle(tx.status)}`}>({cashboxRequestStatusTranslations[tx.status]})</span></td>
                                        <td className="px-6 py-4 font-mono text-left text-green-400">{tx.request_type === 'deposit' ? new Intl.NumberFormat('fa-IR').format(tx.amount) : '-'}</td>
                                        <td className="px-6 py-4 font-mono text-left text-red-400">{tx.request_type === 'withdrawal' ? new Intl.NumberFormat('fa-IR').format(tx.amount) : '-'}</td>
                                        <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR').format(tx.balanceAfter)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredTransactions.length > visibleTxCount && (
                        <div className="p-4 text-center">
                            <button onClick={() => setVisibleTxCount(c => c + TX_PER_PAGE)} className="px-6 py-2 text-lg font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700">نمایش موارد بیشتر</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">صاحب حساب</th>
                            <th className="px-6 py-4 font-medium">نام بانک</th>
                            <th className="px-6 py-4 font-medium">شماره حساب</th>
                            <th className="px-6 py-4 font-medium text-left">موجودی فعلی</th>
                            <th className="px-6 py-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(acc => (
                             <tr key={acc.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                <td className="px-6 py-4 font-semibold text-slate-100">{acc.account_holder}</td>
                                <td className="px-6 py-4">{acc.bank_name}</td>
                                <td className="px-6 py-4 font-mono text-cyan-300">{acc.account_number}</td>
                                <td className="px-6 py-4 font-mono text-left font-bold text-xl">{new Intl.NumberFormat('fa-IR').format(acc.balance)} {acc.currency}</td>
                                <td className="px-6 py-4 text-left">
                                    <button onClick={() => handleSelectAccount(acc)} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">مشاهده تاریخچه</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BankAccountLedger;