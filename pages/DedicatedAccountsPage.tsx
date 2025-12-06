import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDedicatedAccounts } from '../contexts/DedicatedAccountContext';
import { useAuth } from '../contexts/AuthContext';
import CreateDedicatedAccountModal from '../components/CreateDedicatedAccountModal';

const StatCard: React.FC<{ title: string, value: string }> = ({ title, value }) => (
    <div className="bg-slate-800/50 p-6 rounded-lg text-center border border-cyan-400/20">
        <h3 className="text-2xl text-slate-400">{title}</h3>
        <p className="text-5xl font-bold font-mono text-cyan-300 my-2">
            {value}
        </p>
    </div>
);

// Helper to format a Date object into YYYY-MM-DD string
const toISODateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const DedicatedAccountsPage: React.FC = () => {
    const { accounts, transactions } = useDedicatedAccounts();
    const { hasPermission } = useAuth();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'dayBefore' | 'custom'>('today');
    
    // Use ISO date string for state to be compatible with date inputs and new Date()
    const [dateRange, setDateRange] = useState({ 
        start: toISODateString(new Date()), 
        end: toISODateString(new Date())
    });

    const setDateFilter = (filter: 'today' | 'yesterday' | 'dayBefore') => {
        setTimeFilter(filter);
        const targetDate = new Date();
        if (filter === 'yesterday') targetDate.setDate(targetDate.getDate() - 1);
        if (filter === 'dayBefore') targetDate.setDate(targetDate.getDate() - 2);
        
        const dateString = toISODateString(targetDate);
        setDateRange({ start: dateString, end: dateString });
    };

    const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTimeFilter('custom');
        setDateRange(prev => ({...prev, [e.target.name]: e.target.value}));
    };
    
    const parseDateString = (dateString: string): Date | null => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
        try {
            // The input type="date" provides a standard YYYY-MM-DD string that new Date() can parse correctly.
            return new Date(dateString);
        } catch(e) {
            return null;
        }
    }


    const filteredTransactionsByDate = useMemo(() => {
        const start = parseDateString(dateRange.start);
        const end = parseDateString(dateRange.end);

        if (!start || !end) return [];

        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        return transactions
            .filter(t => {
                const txDate = new Date(t.timestamp);
                return txDate >= start && txDate <= end;
            })
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    }, [transactions, dateRange]);

    const displayedIncome = useMemo(() => {
         return filteredTransactionsByDate.reduce((sum, t) => sum + (t.type === 'withdrawal' ? t.commission_amount : 0), 0)
    }, [filteredTransactionsByDate]);

    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    return (
        <div style={{ direction: 'rtl' }} className="space-y-12">
            <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-wider">مدیریت حسابات اختصاصی</h1>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider mb-6">داشبورد و فیلتر زمانی</h2>
                 <div className="flex flex-wrap gap-4 items-end mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setDateFilter('today')} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === 'today' ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>امروز</button>
                        <button onClick={() => setDateFilter('yesterday')} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === 'yesterday' ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>دیروز</button>
                        <button onClick={() => setDateFilter('dayBefore')} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === 'dayBefore' ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>پریروز</button>
                    </div>
                     <div className="flex items-end gap-2">
                        <div>
                            <label className="text-sm text-slate-400">از تاریخ:</label>
                            <input type="date" name="start" value={dateRange.start} onChange={handleDateRangeChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400">تا تاریخ:</label>
                            <input type="date" name="end" value={dateRange.end} onChange={handleDateRangeChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                    </div>
                 </div>
                 <div>
                    <StatCard title="درآمد در بازه انتخابی" value={new Intl.NumberFormat('fa-IR').format(displayedIncome)} />
                 </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">لیست حسابات اختصاصی</h2>
                    {hasPermission('dedicatedAccounts', 'create') && (
                        <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'}}>
                            + ایجاد حساب جدید
                        </button>
                    )}
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">مالک حساب</th>
                                <th className="px-6 py-4 font-medium">بانک / شماره حساب</th>
                                <th className="px-6 py-4 font-medium text-left">موجودی</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {accounts.map(acc => (
                                <tr key={acc.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-100">{acc.owner_name}</div>
                                        <div className="text-sm text-slate-400">{acc.owner_type === 'Customer' ? 'مشتری' : 'همکار'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>{acc.bank_name} - {acc.account_holder}</div>
                                        <div className="font-mono text-sm text-cyan-300">{acc.account_number}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left font-bold text-xl">{new Intl.NumberFormat('fa-IR').format(acc.balance)} {acc.currency}</td>
                                    <td className="px-6 py-4 text-left">
                                        <Link to={`/dedicated-accounts/${acc.id}`} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                                            مشاهده دفتر حساب
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider mb-6">روزنامچه عملیات</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ / ساعت</th>
                                <th className="px-6 py-4 font-medium">نوع</th>
                                <th className="px-6 py-4 font-medium">حساب</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ</th>
                                <th className="px-6 py-4 font-medium text-left">کمیسیون</th>
                                <th className="px-6 py-4 font-medium">جزئیات</th>
                                <th className="px-6 py-4 font-medium">کاربر</th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredTransactionsByDate.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-8 text-slate-500">هیچ تراکنشی در این بازه زمانی یافت نشد.</td></tr>
                            ) : filteredTransactionsByDate.map(tx => {
                                const account = accountsMap.get(tx.account_id);
                                return (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className={`px-6 py-4 font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'deposit' ? 'واریزی' : 'برداشتی'}</td>
                                    <td className="px-6 py-4">{account?.owner_name || 'ناشناس'}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR').format(tx.amount)}</td>
                                    <td className="px-6 py-4 font-mono text-left text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('fa-IR').format(tx.commission_amount) : '-'}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-400">
                                        <div>سریال: {tx.receipt_serial}</div>
                                        {tx.source_account && <div>مبدا: {tx.source_account}</div>}
                                        {tx.destination_account && <div>مقصد: {tx.destination_account}</div>}
                                    </td>
                                    <td className="px-6 py-4">{tx.created_by}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isCreateModalOpen && (
                <CreateDedicatedAccountModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => setCreateModalOpen(false)}
                />
            )}
        </div>
    );
};

export default DedicatedAccountsPage;