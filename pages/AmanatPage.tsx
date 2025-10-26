

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Amanat, AmanatStatus, User, ReturnAmanatPayload, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateAmanatModal from '../components/CreateAmanatModal';
import { amanatStatusTranslations, persianToEnglishNumber } from '../utils/translations';
import { CURRENCIES } from '../constants';
import { useToast } from '../contexts/ToastContext';

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const AmanatPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [amanatList, setAmanatList] = useState<Amanat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const initialFilters = {
        customerName: '',
        notes: '',
        currency: 'all',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [statusFilter, setStatusFilter] = useState<AmanatStatus>(AmanatStatus.Active);
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getAmanat();
        // FIX: Changed 'createdAt' to 'created_at' to match the 'Amanat' type.
        setAmanatList(data.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleReturnAmanat = async (amanatId: string) => {
        // FIX: Add a type guard to ensure the user is an internal user before creating the payload.
        // This narrows the `AuthenticatedUser` union type to the `User` type expected by the API.
        if (!user || user.userType !== 'internal') return;
        if (window.confirm("آیا از بازگشت این امانت اطمینان دارید؟ یک درخواست برداشت از صندوق ایجاد خواهد شد.")) {
            // FIX: Changed 'amanatId' to 'amanat_id' to match the 'ReturnAmanatPayload' type.
            const payload: ReturnAmanatPayload = { amanat_id: amanatId, user };
            const result = await api.returnAmanat(payload);
            if ('error' in result) {
                addToast(result.error, 'error');
            } else {
                addToast("درخواست بازگشت امانت به صندوق ارسال شد.", 'success');
                fetchData();
            }
        }
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredList = useMemo(() => {
        return amanatList.filter(a => {
            const matchesStatus = a.status === statusFilter;
            const matchesCustomer = !filters.customerName || a.customer_name.toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesNotes = !filters.notes || a.notes.toLowerCase().includes(filters.notes.toLowerCase());
            const matchesCurrency = filters.currency === 'all' || a.currency === filters.currency;
            const matchesMinAmount = !filters.minAmount || a.amount >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || a.amount <= parseFloat(filters.maxAmount);
            
            const createdAt = new Date(a.created_at);
            const matchesStartDate = !filters.startDate || createdAt >= new Date(filters.startDate);
            let matchesEndDate = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                matchesEndDate = createdAt <= endDate;
            }

            return matchesStatus && matchesCustomer && matchesNotes && matchesCurrency && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
        });
    }, [amanatList, statusFilter, filters]);


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

    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت امانات</h1>
                 {hasPermission('amanat', 'create') && (
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت امانت جدید
                    </button>
                )}
            </div>

            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={statusFilter === 'Active'} onClick={() => setStatusFilter(AmanatStatus.Active)}>امانات فعال</TabButton>
                <TabButton active={statusFilter === 'Returned'} onClick={() => setStatusFilter(AmanatStatus.Returned)}>امانات بازگشت داده شده</TabButton>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                    <input 
                        type="text"
                        name="customerName"
                        placeholder="جستجو بر اساس نام مشتری..."
                        value={filters.customerName}
                        onChange={handleFilterChange}
                        className="flex-grow text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                    <button onClick={() => setAdvancedSearchOpen(prev => !prev)} className="flex items-center text-lg px-4 py-2 bg-slate-700/50 border-2 border-slate-600/50 rounded-md text-cyan-300 hover:bg-slate-700">
                        <FilterIcon />
                        {isAdvancedSearchOpen ? 'بستن جستجوی پیشرفته' : 'جستجوی پیشرفته'}
                    </button>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out ${isAdvancedSearchOpen ? 'max-h-[500px]' : 'max-h-0'} overflow-hidden`}>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" name="notes" placeholder="جستجو در یادداشت‌ها..." value={filters.notes} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <select name="currency" value={filters.currency} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ارزها</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="text" inputMode="decimal" name="minAmount" placeholder="حداقل مبلغ" value={filters.minAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <input type="text" inputMode="decimal" name="maxAmount" placeholder="حداکثر مبلغ" value={filters.maxAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <div>
                            <label className="text-sm text-slate-400">از تاریخ:</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400">تا تاریخ:</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        <div className="col-span-full text-left">
                            <button onClick={handleResetFilters} className="text-lg px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md">پاک کردن فیلترها</button>
                        </div>
                    </div>
                 </div>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">تاریخ ثبت</th>
                                <th className="px-6 py-4 font-medium">نام مشتری</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">یادداشت</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(a => (
                                <tr key={a.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(a.created_at).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-100">{a.customer_name}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(a.amount)} {a.currency}</td>
                                    <td className="px-6 py-4">{a.notes}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${a.status === AmanatStatus.Active ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/20 text-slate-300'}`}>
                                            {amanatStatusTranslations[a.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        {a.status === AmanatStatus.Active && hasPermission('amanat', 'process') && (
                                            <button onClick={() => handleReturnAmanat(a.id)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded">بازگشت امانت</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && user && (
                <CreateAmanatModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default AmanatPage;