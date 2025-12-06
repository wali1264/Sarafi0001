
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import CreateRentedReceiptModal from '../components/CreateRentedReceiptModal';
import CreateRentedBardModal from '../components/CreateRentedWithdrawalModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';

const toISODateString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const RentedAccountDetailPage: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { accounts, transactions, users } = useRentedAccounts();

    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

    const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth' | 'custom' | 'all'>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
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
    
    const account = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);
    
    const accountTransactions = useMemo(() => {
        const baseTransactions = transactions.filter(t => t.rented_account_id === accountId);
        if (!dateRange.start || !dateRange.end) return baseTransactions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const start = new Date(dateRange.start + 'T00:00:00');
        const end = new Date(dateRange.end + 'T23:59:59.999');

        return baseTransactions
            .filter(t => {
                const txDate = t.timestamp;
                return txDate >= start && txDate <= end;
            })
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, accountId, dateRange]);


    const handleSuccess = () => {
        setDepositModalOpen(false);
        setWithdrawalModalOpen(false);
    };

    if (!account) {
        return (
            <div className="text-center p-10">
                <h2 className="text-3xl text-red-400">حساب یافت نشد</h2>
                <button onClick={() => navigate('/rented-accounts')} className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded">بازگشت به لیست</button>
            </div>
        );
    }
    
    const TimeFilterButton: React.FC<{filter: 'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'thisMonth', label: string}> = ({filter, label}) => (
        <button onClick={() => setDateFilter(filter)} className={`px-4 py-2 text-lg rounded-md transition-colors ${timeFilter === filter ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>{label}</button>
    );

    return (
        <div style={{ direction: 'rtl' }} className="space-y-12 pl-40">
            <button onClick={() => navigate('/rented-accounts')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست حسابات
            </button>

            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{account.account_holder}</h1>
                    <div className="mt-2 text-2xl text-cyan-300">{account.bank_name} - {account.account_number}</div>
                    <div className="text-xl text-slate-400">کرایه از: {account.partner_name}</div>
                </div>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی فعلی حساب</h3>
                    <div className="text-5xl font-mono font-bold text-cyan-300">
                        {new Intl.NumberFormat('en-US').format(account.balance)} {account.currency}
                    </div>
                </div>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">روزنامچه حساب</h2>
                     <div className="flex gap-4">
                         <button onClick={() => setDepositModalOpen(true)} className="px-5 py-2 bg-green-600/50 text-green-200 hover:bg-green-500/50 text-lg transition-colors border border-green-500/50 rounded">
                            + ثبت رسید جدید
                        </button>
                        <button onClick={() => setWithdrawalModalOpen(true)} className="px-5 py-2 bg-red-600/50 text-red-200 hover:bg-red-500/50 text-lg transition-colors border border-red-500/50 rounded">
                            - ثبت برد جدید
                        </button>
                     </div>
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
                                <th className="px-6 py-4 font-medium">رسید (دهنده)</th>
                                <th className="px-6 py-4 font-medium">برد (گیرنده)</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ</th>
                                <th className="px-6 py-4 font-medium text-left">کمیسیون</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accountTransactions.map(tx => {
                                let userName = 'ناشناس';
                                if (tx.user_type === 'Guest') {
                                    userName = tx.guest_name + ' (گذری)' || 'مشتری گذری';
                                } else {
                                    const userIdentifier = `${tx.user_type.toLowerCase()}-${tx.user_id}`;
                                    userName = users.find(u => u.id === userIdentifier)?.name || 'ناشناس';
                                }
                                const accountName = `${account.bank_name} (${account.partner_name})`;

                                const giver = tx.type === 'deposit' ? userName : accountName;
                                const taker = tx.type === 'deposit' ? accountName : userName;

                                return (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-semibold text-green-400">{giver}</td>
                                    <td className="px-6 py-4 font-semibold text-red-400">{taker}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('en-US').format(tx.amount)}</td>
                                    <td className="px-6 py-4 font-mono text-left text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('en-US').format(tx.commission_amount) : '-'}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDepositModalOpen && (
                <CreateRentedReceiptModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} onSuccess={handleSuccess} fixedAccountId={account.id} />
            )}
            {isWithdrawalModalOpen && (
                <CreateRentedBardModal isOpen={isWithdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} onSuccess={handleSuccess} fixedAccountId={account.id} />
            )}
        </div>
    );
};

export default RentedAccountDetailPage;
