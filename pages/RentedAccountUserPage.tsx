
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import { Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ConvertRentedToMainModal from '../components/ConvertRentedToMainModal';

const toISODateString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const RentedAccountUserPage: React.FC = () => {
    const { userIdentifier } = useParams<{ userIdentifier: string }>(); // e.g., "customer-cust_1" or "guest-GuestName"
    const navigate = useNavigate();
    const { accounts, transactions, users, customers } = useRentedAccounts();
    const { user: currentUser, hasPermission } = useAuth();

    const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth' | 'custom' | 'all'>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isConvertModalOpen, setConvertModalOpen] = useState(false);
    
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
    
    const user = useMemo(() => users.find(u => u.id === userIdentifier), [users, userIdentifier]);
    
    // Helper to get the real customer object if the user is a customer
    const customerObject = useMemo(() => {
        if (!user || user.type !== 'Customer') return null;
        return customers.find(c => c.id === user.entityId) || null;
    }, [user, customers]);

    const userTransactions = useMemo(() => {
        if (!user) return [];
        
        let userType: 'Customer' | 'Partner' | 'Guest';
        let userId: string | undefined = undefined;
        let guestName: string | undefined = undefined;

        if (user.type === 'Guest') {
            userType = 'Guest';
            guestName = user.entityId; // entityId holds the name for guests
        } else {
            const idParts = user.id.split('-');
            const typeStr = idParts[0];
            userType = typeStr === 'customer' ? 'Customer' : 'Partner';
            userId = idParts.slice(1).join('-');
        }
        
        const baseTransactions = transactions.filter(t => {
            if (userType === 'Guest') {
                return t.user_type === 'Guest' && t.guest_name === guestName;
            }
            return t.user_type === userType && t.user_id === userId;
        });

        if (!dateRange.start || !dateRange.end) return baseTransactions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const start = new Date(dateRange.start + 'T00:00:00');
        const end = new Date(dateRange.end + 'T23:59:59.999');

        return baseTransactions
            .filter(t => {
                const txDate = t.timestamp;
                return txDate >= start && txDate <= end;
            })
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    }, [transactions, user, dateRange]);
    
    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);

    if (!user) {
        return (
            <div className="text-center p-10">
                <h2 className="text-3xl text-red-400">کاربر یافت نشد</h2>
                <button onClick={() => navigate('/rented-accounts')} className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded">بازگشت به لیست</button>
            </div>
        );
    }
    
    const displayBalance = user.balance;

    const TimeFilterButton: React.FC<{filter: 'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth', label: string}> = ({filter, label}) => (
        <button onClick={() => setDateFilter(filter)} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === filter ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>{label}</button>
    );

    return (
        <div style={{ direction: 'rtl' }} className="space-y-12 pl-40">
            <button onClick={() => navigate(-1)} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست حسابات
            </button>

            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{user.name}</h1>
                    <div className="text-xl text-slate-400">
                        {user.type === 'Customer' && 'مشتری'}
                        {user.type === 'Partner' && 'همکار'}
                        {user.type === 'Guest' && 'مشتری گذری'}
                    </div>
                </div>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی ایزوله (در این بخش)</h3>
                    <div className="text-5xl font-mono font-bold text-cyan-300">
                        {new Intl.NumberFormat('en-US').format(displayBalance)} IRT_BANK
                    </div>
                </div>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب</h2>
                    
                    {/* Convert Button */}
                    {customerObject && hasPermission('rentedAccounts', 'create') && (
                        <button 
                            onClick={() => setConvertModalOpen(true)}
                            className="px-5 py-2 bg-indigo-600/50 text-indigo-100 hover:bg-indigo-500/50 text-lg transition-colors border border-indigo-500/50 rounded flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            تبدیل به حساب اصلی
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 items-end p-4 border-b-2 border-cyan-400/20">
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

                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">نوع تراکنش</th>
                                <th className="px-6 py-4 font-medium">حساب کرایی</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ</th>
                                <th className="px-6 py-4 font-medium text-left">کمیسیون</th>
                                <th className="px-6 py-4 font-medium text-left">تغییر در موجودی</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userTransactions.map(tx => {
                                const account = accountsMap.get(tx.rented_account_id);
                                return (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className={`px-6 py-4 font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'deposit' ? 'رسید' : 'برد'}</td>
                                    <td className="px-6 py-4">{account?.bank_name} ({account?.partner_name})</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('en-US').format(tx.amount)}</td>
                                    <td className="px-6 py-4 font-mono text-left text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('en-US').format(tx.commission_amount) : '-'}</td>
                                    <td className={`px-6 py-4 font-mono text-left font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'}{new Intl.NumberFormat('en-US').format(tx.total_transaction_amount)}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isConvertModalOpen && customerObject && currentUser && (
                <ConvertRentedToMainModal 
                    isOpen={isConvertModalOpen} 
                    onClose={() => setConvertModalOpen(false)} 
                    onSuccess={() => setConvertModalOpen(false)}
                    customer={customerObject}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default RentedAccountUserPage;
