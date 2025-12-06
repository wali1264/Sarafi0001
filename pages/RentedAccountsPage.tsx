
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { useAuth } from '../contexts/AuthContext';
import { RentedAccountTransaction } from '../types';
import CreateRentedAccountModal from '../components/CreateRentedAccountModal';
import CreateRentedReceiptModal from '../components/CreateRentedReceiptModal';
import CreateRentedBardModal from '../components/CreateRentedWithdrawalModal';
import RentedReportsTab from '../components/RentedReportsTab'; // Import the new component
import ShamsiDatePicker from '../components/ShamsiDatePicker';

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
            active ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
    >
        {children}
    </button>
);

const StatCard: React.FC<{ title: string, value: string, currency: string }> = ({ title, value, currency }) => (
    <div className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-center shadow-[0_0_20px_rgba(0,255,255,0.1)] flex flex-col justify-between min-h-[120px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <h3 className="text-xl font-semibold text-slate-300 tracking-wider">{title}</h3>
        <p className="mt-2 text-4xl font-bold font-mono text-cyan-300 whitespace-nowrap overflow-hidden">
            {value} <span className="text-2xl text-slate-400">{currency}</span>
        </p>
    </div>
);

const toISODateString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const RentedAccountsPage: React.FC = () => {
    const { accounts, transactions, users, toggleAccountStatus, hideGuest } = useRentedAccounts();
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState<'journal' | 'accounts' | 'users' | 'reports'>('journal');

    const [isCreateAccountModalOpen, setCreateAccountModalOpen] = useState(false);
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

    const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth' | 'custom' | 'all'>('all');
    const [dateRange, setDateRange] = useState({ 
        start: '', 
        end: ''
    });

    const setDateFilter = (filter: 'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth') => {
        setTimeFilter(filter);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to local midnight

        let start = new Date(today);
        let end = new Date(today);
        end.setHours(23, 59, 59, 999); // End of today

        switch (filter) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                break;
            case 'dayBefore':
                start.setDate(start.getDate() - 2);
                end.setDate(end.getDate() - 2);
                break;
            case 'thisWeek':
                const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
                const diff = (dayOfWeek + 1) % 7; // In Afghanistan/Iran, week starts on Saturday. Sat -> diff=0.
                start.setDate(today.getDate() - diff);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
        }
        setDateRange({ start: toISODateString(start), end: toISODateString(end) });
    };
    
    const handleResetFilters = () => {
        setTimeFilter('all');
        setDateRange({ start: '', end: '' });
    };

    const handleDateRangeChange = (name: 'start' | 'end', value: string) => {
        setTimeFilter('custom');
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const filteredTransactions = useMemo(() => {
        let baseTransactions = transactions;
        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start + 'T00:00:00');
            const end = new Date(dateRange.end + 'T23:59:59.999');
            baseTransactions = transactions.filter(t => {
                const txDate = new Date(t.timestamp);
                return txDate >= start && txDate <= end;
            });
        }
        return baseTransactions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, dateRange]);

    const { totalIncome, totalReceipts, totalBards } = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            if (tx.type === 'deposit') {
                acc.totalReceipts += tx.amount;
            } else { // withdrawal
                acc.totalBards += tx.amount;
                acc.totalIncome += tx.commission_amount;
            }
            return acc;
        }, { totalIncome: 0, totalReceipts: 0, totalBards: 0 });
    }, [filteredTransactions]);

    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    const handleSuccess = () => {
        setCreateAccountModalOpen(false);
        setDepositModalOpen(false);
        setWithdrawalModalOpen(false);
    };
    
    const TimeFilterButton: React.FC<{filter: 'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth', label: string}> = ({filter, label}) => (
        <button onClick={() => setDateFilter(filter)} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === filter ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>{label}</button>
    )

    return (
        <div style={{ direction: 'rtl' }} className="space-y-8 pl-40">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت حسابات کرایی</h1>
                <div className="flex gap-4">
                     {hasPermission('rentedAccounts', 'create') && (
                        <>
                         <button onClick={() => setDepositModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'}}>+ ثبت رسید</button>
                         <button onClick={() => setWithdrawalModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-red-500 hover:bg-red-400 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'}}>- ثبت برد</button>
                        </>
                    )}
                </div>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard title="مجموع درآمد کمیسیون" value={new Intl.NumberFormat('en-US').format(totalIncome)} currency="IRT" />
                    <StatCard title="مجموع کل رسیدها" value={new Intl.NumberFormat('en-US').format(totalReceipts)} currency="IRT" />
                    <StatCard title="مجموع کل بردها" value={new Intl.NumberFormat('en-US').format(totalBards)} currency="IRT" />
                </div>
                 <div className="flex flex-wrap gap-4 items-end p-4 border-t-2 border-cyan-400/20">
                    <div className="flex items-center gap-2 flex-wrap">
                        <TimeFilterButton filter="today" label="امروز" />
                        <TimeFilterButton filter="yesterday" label="دیروز" />
                        <TimeFilterButton filter="dayBefore" label="پریروز" />
                        <TimeFilterButton filter="thisWeek" label="این هفته" />
                        <TimeFilterButton filter="thisMonth" label="این ماه" />
                    </div>
                     <div className="flex items-end gap-2 flex-grow">
                        <div className="flex-grow">
                           <ShamsiDatePicker label="از تاریخ:" value={dateRange.start} onChange={(val) => handleDateRangeChange('start', val)} />
                        </div>
                        <div className="flex-grow">
                           <ShamsiDatePicker label="تا تاریخ:" value={dateRange.end} onChange={(val) => handleDateRangeChange('end', val)} />
                        </div>
                        <button onClick={handleResetFilters} className="px-4 py-2 text-lg rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30">حذف فیلتر</button>
                    </div>
                 </div>
            </div>


            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')}>روزنامچه عمومی</TabButton>
                <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>لیست حسابات کرایی</TabButton>
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>دفتر حساب مشتریان</TabButton>
                <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>گزارشات</TabButton>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                {activeTab === 'journal' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                             <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">تاریخ</th>
                                    <th className="px-4 py-3">رسید (دهنده)</th>
                                    <th className="px-4 py-3">برد (گیرنده)</th>
                                    <th className="px-4 py-3 text-left">مبلغ</th>
                                    <th className="px-4 py-3 text-left">کمیسیون</th>
                                    <th className="px-4 py-3">کاربر</th>
                               </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(tx => {
                                     const account = accountsMap.get(tx.rented_account_id);
                                     
                                     let userName = 'ناشناس';
                                     if (tx.user_type === 'Guest') {
                                         userName = tx.guest_name + ' (گذری)' || 'مشتری گذری';
                                     } else {
                                         const userIdentifier = `${tx.user_type.toLowerCase()}-${tx.user_id}`;
                                         userName = users.find(u => u.id === userIdentifier)?.name || 'ناشناس';
                                     }
                                     
                                     const giver = tx.type === 'deposit' ? userName : `${account?.bank_name} (${account?.partner_name})`;
                                     const taker = tx.type === 'deposit' ? `${account?.bank_name} (${account?.partner_name})` : userName;

                                    return (
                                        <tr key={tx.id} className="border-b border-cyan-400/10">
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                            <td className="px-4 py-3 font-semibold text-green-400">{giver}</td>
                                            <td className="px-4 py-3 font-semibold text-red-400">{taker}</td>
                                            <td className="px-4 py-3 text-left font-mono">{new Intl.NumberFormat('en-US').format(tx.amount)}</td>
                                            <td className="px-4 py-3 text-left font-mono text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('en-US').format(tx.commission_amount) : '-'}</td>
                                            <td className="px-4 py-3">{tx.created_by}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                 {activeTab === 'accounts' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold">لیست حسابات</h3>
                             {hasPermission('rentedAccounts', 'create') && (
                                <button onClick={() => setCreateAccountModalOpen(true)} className="px-4 py-2 text-lg font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700">+ افزودن حساب</button>
                             )}
                        </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-lg text-right text-slate-300">
                                <thead className="text-xl text-slate-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">کرایه از</th>
                                        <th className="px-4 py-3">بانک / شماره حساب</th>
                                        <th className="px-4 py-3 text-left">موجودی</th>
                                        <th className="px-4 py-3">وضعیت</th>
                                        <th className="px-4 py-3"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id} className={`border-b border-cyan-400/10 ${acc.status === 'Inactive' ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 font-semibold">{acc.partner_name}</td>
                                            <td className="px-4 py-3">{acc.bank_name} ({acc.account_number})</td>
                                            <td className="px-4 py-3 font-mono text-left font-bold text-xl">{new Intl.NumberFormat('en-US').format(acc.balance)}</td>
                                            <td className={`px-4 py-3 font-bold ${acc.status === 'Active' ? 'text-green-400' : 'text-slate-500'}`}>{acc.status === 'Active' ? 'فعال' : 'غیرفعال'}</td>
                                            <td className="px-4 py-3 text-left space-x-4 space-x-reverse">
                                                <button onClick={() => toggleAccountStatus(acc.id)} className="text-sm text-amber-400 hover:underline">تغییر وضعیت</button>
                                                <Link to={`/rented-accounts/${acc.id}`} className="text-cyan-300 hover:underline">مشاهده روزنامچه</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                 {activeTab === 'users' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">نام</th>
                                    <th className="px-4 py-3">آخرین فعالیت</th>
                                    <th className="px-4 py-3">نوع</th>
                                    <th className="px-4 py-3 text-left">موجودی ایزوله</th>
                                    <th className="px-4 py-3">عملیات</th>
                               </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-cyan-400/10">
                                        <td className="px-4 py-3 font-semibold">{user.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(user.lastActivity).toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                        <td className="px-4 py-3">
                                            {user.type === 'Customer' && 'مشتری'}
                                            {user.type === 'Partner' && 'همکار'}
                                            {user.type === 'Guest' && <span className="text-amber-400">گذری</span>}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-left font-bold">{new Intl.NumberFormat('en-US').format(user.balance)}</td>
                                        <td className="px-4 py-3 text-left flex items-center justify-end gap-2">
                                            <Link to={`/rented-accounts/user/${user.id}`} className="text-cyan-300 hover:underline">مشاهده دفتر حساب</Link>
                                            {user.type === 'Guest' && user.balance === 0 && (
                                                <button 
                                                    onClick={() => {
                                                        if(window.confirm('آیا مطمئن هستید که می‌خواهید این مشتری گذری را از لیست مخفی کنید؟ (در صورت ثبت تراکنش جدید، دوباره ظاهر خواهد شد)')) {
                                                            hideGuest(user.id);
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                                                    title="مخفی کردن (بایگانی موقت)"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                        <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                                                        <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.243 4.243Z" />
                                                        <path d="M6.75 12c0-.619.107-1.215.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'reports' && (
                    <RentedReportsTab />
                )}
            </div>
            
            {isCreateAccountModalOpen && <CreateRentedAccountModal isOpen={isCreateAccountModalOpen} onClose={() => setCreateAccountModalOpen(false)} onSuccess={handleSuccess} />}
            {isDepositModalOpen && <CreateRentedReceiptModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} onSuccess={handleSuccess} />}
            {isWithdrawalModalOpen && <CreateRentedBardModal isOpen={isWithdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default RentedAccountsPage;
