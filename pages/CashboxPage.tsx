import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { CashboxRequest, CashboxBalance, CashboxRequestStatus, ResolveCashboxRequestPayload, User, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateCashboxRequestModal from '../components/CreateCashboxRequestModal';
import { cashboxRequestStatusTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import PrintPreviewModal from '../components/PrintPreviewModal';
import PrintableView from '../components/PrintableView';
import { supabase } from '../services/supabaseClient';

const StatCard: React.FC<{ title: string, value: string, currency: string }> = ({ title, value, currency }) => {
    const valueRef = useRef<HTMLParagraphElement>(null);

    useLayoutEffect(() => {
        const resizeText = () => {
            const element = valueRef.current;
            if (!element) return;

            // Reset font size to the Tailwind base class size to recalculate
            element.style.fontSize = ''; 
            
            const baseFontSize = parseFloat(window.getComputedStyle(element).fontSize);
            let currentFontSize = baseFontSize;

            // Check for overflow. The element's clientWidth is the available space.
            while (element.scrollWidth > element.clientWidth && currentFontSize > 16) { // Min font size of 16px
                currentFontSize -= 1; // Decrement slowly for precision
                element.style.fontSize = `${currentFontSize}px`;
            }
        };

        resizeText();
        window.addEventListener('resize', resizeText);
        return () => window.removeEventListener('resize', resizeText);

    }, [value, currency]);

    return (
         <div className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right shadow-[0_0_20px_rgba(0,255,255,0.2)] flex flex-col justify-between min-h-[120px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <h3 className="text-xl font-semibold text-slate-300 tracking-wider">{title}</h3>
            <p ref={valueRef} className="mt-2 text-4xl font-bold font-mono text-cyan-300 whitespace-nowrap overflow-hidden">
                {value} <span className="text-2xl text-slate-400">{currency}</span>
            </p>
        </div>
    );
};

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);


const CashboxPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    
    const [requests, setRequests] = useState<CashboxRequest[]>([]);
    const [balances, setBalances] = useState<CashboxBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedRequestForPrint, setSelectedRequestForPrint] = useState<CashboxRequest | null>(null);

    const initialFilters = {
        reason: '',
        requestType: 'all',
        status: 'all',
        currency: 'all',
        requestedBy: '',
        startDate: '',
        endDate: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);
    
    const canApprove = hasPermission('cashbox', 'approve');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [reqData, balData] = await Promise.all([
            api.getCashboxRequests(),
            api.getCashboxBalances()
        ]);
        setRequests(reqData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setBalances(balData);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const channel = supabase
            .channel('cashbox-page-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_requests' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_balances' }, () => fetchData())
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleResolve = async (requestId: string, resolution: 'approve' | 'reject') => {
        if (!user || user.userType !== 'internal') return;
        const payload: ResolveCashboxRequestPayload = { request_id: requestId, resolution, user };
        const result = await api.resolveCashboxRequest(payload);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast(resolution === 'approve' ? 'درخواست تایید شد.' : 'درخواست رد شد.', 'success');
            fetchData();
        }
    };
    
    const handleInitiatePrint = (request: CashboxRequest) => {
        setSelectedRequestForPrint(request);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = (request: CashboxRequest, printNote: string) => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <PrintableView request={request} printNote={printNote} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
                        ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
        setIsPrintModalOpen(false);
        setSelectedRequestForPrint(null);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesReason = !filters.reason || req.reason.toLowerCase().includes(filters.reason.toLowerCase());
            const matchesRequester = !filters.requestedBy || req.requested_by.toLowerCase().includes(filters.requestedBy.toLowerCase());
            const matchesRequestType = filters.requestType === 'all' || req.request_type === filters.requestType;
            const matchesStatus = filters.status === 'all' || req.status === filters.status;
            const matchesCurrency = filters.currency === 'all' || req.currency === filters.currency;
            
            const createdAt = new Date(req.created_at);
            
            const matchesStartDate = !filters.startDate || createdAt >= new Date(filters.startDate);
            
            let matchesEndDate = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999); // Include the whole end day
                matchesEndDate = createdAt <= endDate;
            }

            return matchesReason && matchesRequester && matchesRequestType && matchesStatus && matchesCurrency && matchesStartDate && matchesEndDate;
        });
    }, [requests, filters]);


    const getStatusStyle = (status: CashboxRequestStatus) => {
        switch (status) {
            case CashboxRequestStatus.Approved:
            case CashboxRequestStatus.AutoApproved:
                return 'bg-green-500/20 text-green-300';
            case CashboxRequestStatus.Pending:
                return 'bg-yellow-500/20 text-yellow-300';
            case CashboxRequestStatus.PendingCashboxApproval:
                return 'bg-amber-500/20 text-amber-300';
            case CashboxRequestStatus.Rejected:
                return 'bg-red-500/20 text-red-300';
            default:
                return 'bg-slate-600/20 text-slate-300';
        }
    };

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت صندوق</h1>
                    {hasPermission('cashbox', 'create') && (
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                            + ثبت رسید/برد جدید
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8">
                    {CURRENCIES.map(currency => {
                        const balance = balances.find(b => b.currency === currency)?.balance ?? 0;
                        return <StatCard key={currency} title={`موجودی ${currency}`} value={new Intl.NumberFormat('en-US').format(balance)} currency={currency} />
                    })}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                    <input 
                        type="text"
                        name="reason"
                        placeholder="جستجو در شرح تراکنش..."
                        value={filters.reason}
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
                        
                        <select name="requestType" value={filters.requestType} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه انواع</option>
                            <option value="deposit">رسید</option>
                            <option value="withdrawal">برد</option>
                        </select>
                        
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه وضعیت‌ها</option>
                            {Object.values(CashboxRequestStatus).map(s => <option key={s} value={s}>{cashboxRequestStatusTranslations[s]}</option>)}
                        </select>

                        <select name="currency" value={filters.currency} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ارزها</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <input type="text" name="requestedBy" placeholder="نام درخواست کننده..." value={filters.requestedBy} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        
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
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">روزنامچه (درخواست‌های صندوق)</h2>
                </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-lg text-right text-slate-300">
                         <thead className="text-xl text-slate-400 uppercase">
                             <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">نوع</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">شرح</th>
                                <th className="px-6 py-4 font-medium">درخواست کننده</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="py-4 pr-6 pl-32 font-medium"></th>
                             </tr>
                         </thead>
                         <tbody>
                            {filteredRequests.map(req => {
                                const isResolvable = (req.status === 'Pending' || req.status === 'PendingCashboxApproval') && canApprove;
                                const isPrintable = !isResolvable; // Can print after it's resolved (approved, rejected, etc.)
                                return (
                                <tr key={req.id} className="border-b border-cyan-400/10 transition-colors hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(req.created_at).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className={`px-6 py-4 font-bold ${req.request_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {req.request_type === 'deposit' ? 'رسید' : 'برد'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(req.amount)} {req.currency}</td>
                                    <td className="px-6 py-4">{req.reason}</td>
                                    <td className="px-6 py-4">{req.requested_by}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(req.status)}`}>
                                            {cashboxRequestStatusTranslations[req.status]}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-6 pl-32 whitespace-nowrap">
                                        <div className="flex items-center justify-start gap-x-4">
                                            {isResolvable && (
                                                <>
                                                    <button onClick={() => handleResolve(req.id, 'approve')} className="px-3 py-1 bg-green-600/50 hover:bg-green-500/50 text-green-200 rounded">تایید</button>
                                                    <button onClick={() => handleResolve(req.id, 'reject')} className="px-3 py-1 bg-red-600/50 hover:bg-red-500/50 text-red-200 rounded">رد</button>
                                                </>
                                            )}
                                            {isPrintable && (
                                                <button onClick={() => handleInitiatePrint(req)} className="text-cyan-300 hover:text-cyan-200">چاپ</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                         </tbody>
                     </table>
                 </div>
            </div>
            
            {isModalOpen && user && (
                <CreateCashboxRequestModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
            
            {selectedRequestForPrint && (
                <PrintPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    onConfirmPrint={handleConfirmPrint}
                    request={selectedRequestForPrint}
                />
            )}

        </div>
    );
};

export default CashboxPage;