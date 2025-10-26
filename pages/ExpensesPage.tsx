

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Expense, User, ExpenseCategory, Currency, ExpenseStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateExpenseModal from '../components/CreateExpenseModal';
import { expenseCategoryTranslations, persianToEnglishNumber, expenseStatusTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const ExpensesPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const initialFilters = {
        description: '',
        category: 'all',
        currency: 'all',
        user: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getExpenses();
        setExpenses(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const matchesDescription = !filters.description || exp.description.toLowerCase().includes(filters.description.toLowerCase());
            const matchesUser = !filters.user || exp.user.toLowerCase().includes(filters.user.toLowerCase());
            const matchesCategory = filters.category === 'all' || exp.category === filters.category;
            const matchesCurrency = filters.currency === 'all' || exp.currency === filters.currency;
            const matchesMinAmount = !filters.minAmount || exp.amount >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || exp.amount <= parseFloat(filters.maxAmount);

            const createdAt = new Date(exp.created_at);
            const matchesStartDate = !filters.startDate || createdAt >= new Date(filters.startDate);
            let matchesEndDate = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                matchesEndDate = createdAt <= endDate;
            }

            return matchesDescription && matchesUser && matchesCategory && matchesCurrency && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
        });
    }, [expenses, filters]);

    const getStatusStyle = (status: ExpenseStatus) => {
        switch (status) {
            case ExpenseStatus.Approved:
                return 'bg-green-500/20 text-green-300';
            case ExpenseStatus.PendingApproval:
                return 'bg-yellow-500/20 text-yellow-300';
            case ExpenseStatus.Rejected:
                return 'bg-red-500/20 text-red-300';
            default:
                return 'bg-slate-600/20 text-slate-300';
        }
    };


    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت مصارف</h1>
                 {hasPermission('expenses', 'create') && (
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت مصرف جدید
                    </button>
                )}
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                    <input 
                        type="text"
                        name="description"
                        placeholder="جستجو در شرح..."
                        value={filters.description}
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
                        <select name="category" value={filters.category} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه دسته‌بندی‌ها</option>
                            {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{expenseCategoryTranslations[c]}</option>)}
                        </select>
                         <select name="currency" value={filters.currency} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ارزها</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="text" name="user" placeholder="نام ثبت کننده..." value={filters.user} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <div />
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
                 <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">لیست مصارف ثبت شده</h2>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">دسته‌بندی</th>
                                <th className="px-6 py-4 font-medium">شرح</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">ثبت کننده</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(exp.created_at).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-semibold text-cyan-300">{expenseCategoryTranslations[exp.category]}</td>
                                    <td className="px-6 py-4 text-slate-100">{exp.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(exp.amount)} {exp.currency}</td>
                                    <td className="px-6 py-4">{exp.user}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(exp.status)}`}>
                                            {expenseStatusTranslations[exp.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && user && (
                <CreateExpenseModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default ExpensesPage;