import React, { useState, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { 
    ReportType, 
    Currency, 
    CashboxRequest,
    DomesticTransfer,
    CommissionTransfer,
    Expense,
    AccountTransfer,
    ForeignTransaction,
    Customer,
    PartnerAccount,
} from '../types';
import { reportTypeTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';
import ReportViewer from '../components/ReportViewer';

type ReportData = (CashboxRequest | DomesticTransfer | CommissionTransfer | Expense | AccountTransfer | ForeignTransaction)[];

// A new, more descriptive set of report types for the UI
const availableReports = {
    'cashbox': 'گزارش جامع صندوق',
    'domesticTransfers': 'گزارش حواله‌جات داخلی',
    'commissionTransfers': 'گزارش حواله‌جات کمیشن‌کاری',
    'expenses': 'گزارش مصارف',
    'accountTransfers': 'گزارش انتقالات بین مشتریان',
    'foreignTransfers': 'گزارش تبادلات ارزی',
    'commissionRevenue': 'گزارش درآمد کمیسیون‌ها',
};

type AvailableReportKey = keyof typeof availableReports;

export const ReportsPage: React.FC = () => {
    const api = useApi();
    const [activeReport, setActiveReport] = useState<AvailableReportKey>('cashbox');
    
    // Filters State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Data State
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [customersMap, setCustomersMap] = useState<Map<string, string>>(new Map());
    const [partnersMap, setPartnersMap] = useState<Map<string, string>>(new Map());
    
    // Control State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setDateRange = (period: 'today' | 'yesterday' | 'this_week' | 'this_month') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let start = new Date(today);
        let end = new Date(today);
        end.setHours(23, 59, 59, 999);

        switch (period) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                break;
            case 'this_week':
                const dayOfWeek = today.getDay(); // Sunday - Saturday : 0 - 6
                start.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) -1); // Assuming Saturday is the start of the week
                break;
            case 'this_month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };


    const handleGenerateReport = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setReportData(null);
        
        try {
            // Fetch maps needed for display names in the viewer, this is still necessary.
            const [customersData, partnersData] = await Promise.all([api.getCustomers(), api.getPartnerAccounts()]);
            setCustomersMap(new Map(customersData.map(c => [c.id, c.name])));
            setPartnersMap(new Map(partnersData.map(p => [p.id, p.name])));

            // Call the new, efficient RPC that filters on the server
            const result = await api.generateReport({
                report_type: activeReport,
                start_date: startDate,
                end_date: endDate,
            });

            if ('error' in result) {
                throw new Error(result.error);
            }
            
            setReportData(result);
        } catch (e: any) {
            setError("خطا در تولید گزارش: " + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [api, activeReport, startDate, endDate]);
    
    const renderFilters = () => {
        return (
            <div className="p-6 border-b-2 border-cyan-400/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-lg font-medium text-cyan-300 mb-2">بازه زمانی</label>
                        <div className="flex gap-2">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {['today', 'yesterday', 'this_week', 'this_month'].map(period => (
                                <button key={period} onClick={() => setDateRange(period as any)} className="px-3 py-1 text-sm bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700">
                                    {{'today': 'امروز', 'yesterday': 'دیروز', 'this_week': 'این هفته', 'this_month': 'این ماه'}[period]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 text-left">
                         <button onClick={handleGenerateReport} disabled={isLoading} className="w-full px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال تولید...' : 'تولید گزارش'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ direction: 'rtl' }}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">مرکز گزارشات پیشرفته</h1>
            
            <div className="flex gap-8 items-start">
                <aside className="w-1/4 bg-[#12122E]/80 border-2 border-cyan-400/20 p-4 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b border-cyan-400/20 pb-2">انتخاب گزارش</h2>
                    <nav>
                        <ul>
                            {(Object.keys(availableReports) as AvailableReportKey[]).map(key => (
                                <li key={key}>
                                    <button 
                                        onClick={() => { setActiveReport(key); setReportData(null); }}
                                        className={`w-full text-right text-xl font-semibold px-4 py-3 my-1 rounded-md transition-colors ${activeReport === key ? 'bg-cyan-400/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-700/50'}`}
                                    >
                                        {availableReports[key]}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
                
                <main className="w-3/4">
                    <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                        {renderFilters()}
                        <div className="p-6 min-h-[400px]">
                            {isLoading && <div className="text-center text-2xl text-slate-400 p-10">در حال تولید گزارش...</div>}
                            {error && <div className="text-center text-2xl text-red-400 p-10">{error}</div>}
                            {reportData && (
                                <ReportViewer 
                                    reportData={reportData} 
                                    reportType={activeReport} 
                                    customersMap={customersMap} 
                                    partnersMap={partnersMap}
                                />
                            )}
                             {!isLoading && !reportData && <div className="text-center text-2xl text-slate-500 p-10">برای مشاهده نتایج، گزارش را تولید کنید.</div>}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};