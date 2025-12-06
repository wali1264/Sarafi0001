
import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Currency, Customer } from '../types';
import ActivityFeed from '../components/ActivityFeed';
import DashboardChartContainer from '../components/DashboardChartContainer';
import { useFinancialPulse } from '../contexts/FinancialPulseContext';

// New BalanceSummaryCard Component
const BalanceSummaryCard: React.FC<{ 
    title: string; 
    balances: { [key in Currency]?: number }; 
    type: 'credit' | 'debt'; 
    isLoading: boolean;
}> = ({ title, balances, type, isLoading }) => {
    const colorClass = type === 'credit' ? 'text-green-400' : 'text-red-400';
    const borderClass = type === 'credit' ? 'border-green-500/30' : 'border-red-500/30';

    const nonZeroBalances = useMemo(() => 
        Object.entries(balances)
              .filter(([, amount]) => amount && amount !== 0)
              .map(([currency, amount]) => ({ currency, amount: amount! }))
    , [balances]);

    return (
        <div 
            className={`bg-[#12122E]/80 p-6 border-2 ${borderClass} shadow-[0_0_20px_rgba(0,255,255,0.1)] flex flex-col min-h-[300px]`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
            <h3 className={`text-2xl font-semibold text-slate-100 tracking-wider mb-4 border-b pb-2 ${borderClass}`}>{title}</h3>
            {isLoading ? (
                <div className="space-y-4 animate-pulse flex-grow">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="h-5 w-1/4 bg-slate-700 rounded"></div>
                            <div className="h-5 w-1/2 bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto flex-grow">
                    {nonZeroBalances.length > 0 ? (
                        nonZeroBalances.map(({ currency, amount }) => (
                            <div key={currency} className="flex justify-between items-baseline text-xl">
                                <span className="text-slate-400">{currency}:</span>
                                <span className={`font-mono font-bold ${colorClass}`}>
                                    {new Intl.NumberFormat('en-US').format(Math.abs(amount))}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-slate-500 text-lg">حسابی برای نمایش وجود ندارد.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const LiveNetWorthCard: React.FC<{ title: string; value: number | null; description: string; isLoading: boolean }> = ({ title, value, description, isLoading }) => {
    const valueDisplay = value === null ? 'N/A' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`;
    
    return (
         <div 
            className={`relative bg-[#12122E]/90 p-6 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.15)] flex flex-col min-h-[300px] justify-between group overflow-hidden`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
            {/* Live Pulse Effect */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs text-green-400 font-bold tracking-widest opacity-80">LIVE</span>
            </div>

            <div>
                <h3 className={`text-2xl font-semibold text-slate-100 tracking-wider mb-4 border-b pb-2 border-cyan-500/30 mt-2`}>{title}</h3>
                <p className="text-slate-400 text-base">{description}</p>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center gap-2">
                {isLoading ? (
                    <div className="h-12 w-3/4 bg-slate-700 rounded animate-pulse self-center"></div>
                ) : (
                    <>
                        <p className="text-5xl lg:text-6xl font-bold font-mono text-cyan-300 text-center self-center break-all drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-500 transform group-hover:scale-105">
                            {valueDisplay}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

// Helper to check if a customer record is actually a system account
const isSystemAccount = (customer: Customer) => {
    // Known system codes
    const systemCodes = ['1000', '58', '108', '1500'];
    if (systemCodes.includes(customer.code)) return true;
    
    // Known system keywords in name
    const systemKeywords = ['صندوق', 'فایده', 'سود', 'هزینه', 'مصرف', 'روغن', 'کالا', 'دفترچه'];
    return systemKeywords.some(keyword => customer.name.includes(keyword));
};

const DashboardPage: React.FC = () => {
    const api = useApi();
    const { netWorth, totalAssets, isLoading: isLiveLoading } = useFinancialPulse(); // Use the new live context
    
    const [summary, setSummary] = useState({
        customerCredit: {} as { [key in Currency]?: number },
        customerDebt: {} as { [key in Currency]?: number },
    });
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);

    useEffect(() => {
        const calculateSummaries = async () => {
            setIsLoading(true);
            const [customers, analytics] = await Promise.all([
                api.getCustomers(),
                api.getDashboardAnalytics()
            ]);

            setAnalyticsData(analytics);

            const newSummary = {
                customerCredit: {} as { [key in Currency]?: number },
                customerDebt: {} as { [key in Currency]?: number },
            };

            // Process Customers: Positive balance means we owe them (our debt). Negative means they owe us (our credit).
            customers.forEach(customer => {
                // FILTER: Skip system accounts to show only real customer stats
                if (isSystemAccount(customer)) return;

                for (const currency in customer.balances) {
                    const balance = customer.balances[currency as Currency] || 0;
                    if (balance > 0) {
                        newSummary.customerDebt[currency as Currency] = (newSummary.customerDebt[currency as Currency] || 0) + balance;
                    } else if (balance < 0) { 
                        newSummary.customerCredit[currency as Currency] = (newSummary.customerCredit[currency as Currency] || 0) + Math.abs(balance);
                    }
                }
            });
            
            setSummary(newSummary);
            setIsLoading(false);
        };

        calculateSummaries();
    }, [api]);

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider flex items-center gap-4">
                    داشبورد مدیریتی
                    <span className="text-sm font-normal bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">نبض مالی سیستم</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <LiveNetWorthCard
                    title="دارایی خالص واقعی"
                    description="ثروت واقعی شما پس از کسر تمام بدهی‌ها (به‌روزرسانی آنی)."
                    value={netWorth}
                    isLoading={isLiveLoading}
                />
                <LiveNetWorthCard
                    title="مجموع کل دارایی‌ها"
                    description="ارزش کل وجوه نقد و طلب‌ها (بدون کسر بدهی‌ها)."
                    value={totalAssets}
                    isLoading={isLiveLoading}
                />
                <BalanceSummaryCard 
                    title="مجموع طلب از مشتریان"
                    balances={summary.customerCredit}
                    type="credit"
                    isLoading={isLoading}
                />
                <BalanceSummaryCard 
                    title="مجموع بدهی به مشتریان"
                    balances={summary.customerDebt}
                    type="debt"
                    isLoading={isLoading}
                />
            </div>

            {analyticsData && <DashboardChartContainer analyticsData={analyticsData} />}

            <ActivityFeed />
        </div>
    );
};

export default DashboardPage;
