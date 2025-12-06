

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { AccountTransfer, User, Customer, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateAccountTransferModal from '../components/CreateAccountTransferModal';
import AssignTransferModal from '../components/AssignTransferModal';
import { persianToEnglishNumber } from '../utils/translations';
import { CURRENCIES } from '../constants';

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const AccountTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
    const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const initialFilters = {
        description: '',
        fromCustomer: '',
        toCustomer: '',
        currency: 'all',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<AccountTransfer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [transferData, customerData] = await Promise.all([
            api.getAccountTransfers(),
            api.getCustomers()
        ]);
        setTransfers(transferData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setCustomers(new Map(customerData.map(c => [c.id, c])));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setCreateModalOpen(false);
        setAssignModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };
    
    const handleAssignClick = (transfer: AccountTransfer) => {
        setSelectedTransfer(transfer);
        setAssignModalOpen(true);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => {
            const fromCustomer = customers.get(t.fromCustomerId);
            const toCustomer = customers.get(t.toCustomerId);

            const matchesDescription = !filters.description || t.description.toLowerCase().includes(filters.description.toLowerCase());
            const matchesFrom = !filters.fromCustomer || (fromCustomer && (fromCustomer.name.toLowerCase().includes(filters.fromCustomer.toLowerCase()) || fromCustomer.code.includes(filters.fromCustomer)));
            const matchesTo = !filters.toCustomer || (toCustomer && (toCustomer.name.toLowerCase().includes(filters.toCustomer.toLowerCase()) || toCustomer.code.includes(filters.toCustomer)));
            const matchesCurrency = filters.currency === 'all' || t.currency === filters.currency;
            const matchesMinAmount = !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);

            const txDate = new Date(t.timestamp);
            const matchesStartDate = !filters.startDate || txDate >= new Date(filters.startDate);
            let matchesEndDate = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                matchesEndDate = txDate <= endDate;
            }
            
            return matchesDescription && matchesFrom && matchesTo && matchesCurrency && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
        });
    }, [transfers, filters, customers]);

    const { completedTransfers, pendingTransfers } = useMemo(() => {
        const completed = filteredTransfers.filter(t => t.status === 'Completed');
        const pending = filteredTransfers.filter(t => t.status === 'PendingAssignment');
        return { completedTransfers: completed, pendingTransfers: pending };
    }, [filteredTransfers]);


    const TransferTable: React.FC<{
        title: string;
        data: AccountTransfer[];
        isPending?: boolean;
    }> = ({ title, data, isPending = false }) => (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20">
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">تاریخ</th>
                            <th className="px-6 py-4 font-medium">از حساب</th>
                            <th className="px-6 py-4 font-medium">به حساب</th>
                            <th className="px-6 py-4 font-medium">مبلغ</th>
                            <th className="px-6 py-4 font-medium">توضیحات</th>
                            {isPending && <th className="px-6 py-4 font-medium"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(t => (
                            <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                <td className="px-6 py-4 font-semibold text-slate-100">{customers.get(t.fromCustomerId)?.name || 'ناشناس'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-100">{customers.get(t.toCustomerId)?.name || 'ناشناس'}</td>
                                <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                <td className="px-6 py-4">{t.description}</td>
                                {isPending && (
                                    <td className="px-6 py-4 text-left">
                                        <button onClick={() => handleAssignClick(t)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded">تخصیص</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">انتقالات بین حسابی</h1>
                {hasPermission('accountTransfers', 'create') && (
                    <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + انتقال جدید
                    </button>
                )}
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                    <input type="text" name="description" placeholder="جستجو در شرح..." value={filters.description} onChange={handleFilterChange} className="flex-grow text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/>
                    <button onClick={() => setAdvancedSearchOpen(prev => !prev)} className="flex items-center text-lg px-4 py-2 bg-slate-700/50 border-2 border-slate-600/50 rounded-md text-cyan-300 hover:bg-slate-700">
                        <FilterIcon /> {isAdvancedSearchOpen ? 'بستن' : 'پیشرفته'}
                    </button>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out ${isAdvancedSearchOpen ? 'max-h-[500px]' : 'max-h-0'} overflow-hidden`}>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" name="fromCustomer" placeholder="نام/کد فرستنده..." value={filters.fromCustomer} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <input type="text" name="toCustomer" placeholder="نام/کد گیرنده..." value={filters.toCustomer} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <select name="currency" value={filters.currency} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ارزها</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div/>
                        <input type="text" inputMode="decimal" name="minAmount" placeholder="حداقل مبلغ" value={filters.minAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <input type="text" inputMode="decimal" name="maxAmount" placeholder="حداکثر مبلغ" value={filters.maxAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <div><label className="text-sm text-slate-400">از تاریخ:</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" /></div>
                        <div><label className="text-sm text-slate-400">تا تاریخ:</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" /></div>
                        <div className="col-span-full text-left"><button onClick={handleResetFilters} className="text-lg px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md">پاک کردن</button></div>
                    </div>
                 </div>
            </div>

            {pendingTransfers.length > 0 && (
                <TransferTable title="حواله‌های در انتظار تخصیص" data={pendingTransfers} isPending />
            )}
            
            <TransferTable title="تاریخچه انتقالات" data={completedTransfers} />
            
            {isCreateModalOpen && user && (
                <CreateAccountTransferModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />
            )}
            {isAssignModalOpen && user && selectedTransfer && (
                <AssignTransferModal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} onSuccess={handleSuccess} currentUser={user} transfer={selectedTransfer} />
            )}
        </div>
    );
};

export default AccountTransfersPage;
