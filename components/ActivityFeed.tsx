import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { formatTimeAgo } from '../utils/timeFormatter';
import { CashboxRequest, DomesticTransfer, ForeignTransaction, CommissionTransfer, AccountTransfer, Expense, Amanat, Customer, PartnerAccount } from '../types';
import { cashboxRequestStatusTranslations, statusTranslations, foreignTransactionStatusTranslations, commissionTransferStatusTranslations, expenseStatusTranslations, amanatStatusTranslations } from '../utils/translations';

// --- Icon Components ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>;
const TransferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const ExchangeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const ExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 2.01v.01M12 14c-1.657 0-3-.895-3-2s1.343-2 3-2 3-.895 3-2-1.343-2-3-2m0 8c1.11 0 2.08-.402 2.599-1M12 14v.01M12 16v-1m0-1v-.01m0-2.01v-.01M12 20v-1m0-1v-.01m0-2.01v-.01M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const AmanatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;

type ActivityItem = {
    id: string;
    timestamp: Date;
    type: string;
    summary: React.ReactNode;
    details: Record<string, any>;
    icon: React.ReactNode;
    colorClass: string;
};

const ActivityDetail: React.FC<{ label: string, value: any }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    let displayValue = String(value);
    if (typeof value === 'object') {
        displayValue = JSON.stringify(value, null, 2);
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'بلی' : 'نخیر';
    }
    return (
        <div className="py-2 px-3 odd:bg-slate-700/30 grid grid-cols-3 gap-4">
            <dt className="font-semibold text-slate-400">{label}</dt>
            <dd className="col-span-2 text-slate-200 font-mono whitespace-pre-wrap break-words">{displayValue}</dd>
        </div>
    );
};

const CashboxHistoryTimeline: React.FC<{ history: CashboxRequest['history'] }> = ({ history }) => {
    if (!history || history.length === 0) {
        return <p>تاریخچه‌ای برای این درخواست یافت نشد.</p>;
    }

    return (
        <div>
            <h4 className="text-xl font-bold text-cyan-300 mb-3">تاریخچه تایید</h4>
            <ol className="relative border-r-2 border-cyan-400/30 mr-3 space-y-4">
                {history.map((event, index) => (
                    <li key={index} className="mr-6">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-cyan-600 rounded-full -right-3 ring-4 ring-[#12122E]">
                            <svg className="w-3 h-3 text-cyan-200" fill="currentColor" viewBox="0 0 20 20"><path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4zM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10zM5 12h10v2H5v-2z"></path></svg>
                        </span>
                        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                            <h5 className="text-lg font-semibold text-slate-100">{event.action}</h5>
                            <p className="text-base text-slate-400">توسط: {event.user}</p>
                            <time className="text-sm font-normal text-slate-500">{new Date(event.timestamp).toLocaleString('fa-IR')}</time>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
};


const ActivityItemCard: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const isCashboxRequest = item.type.includes('صندوق');
    const hasHistory = isCashboxRequest && item.details.history && item.details.history.length > 0;

    return (
        <li className={`p-4 border-l-4 ${item.colorClass} bg-cyan-400/5 hover:bg-cyan-400/10 transition-colors`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="text-cyan-300 mt-1">{item.icon}</span>
                    <div className="text-lg">
                        <p className="text-slate-200">{item.summary}</p>
                        <p className="text-sm text-slate-500">{formatTimeAgo(item.timestamp)}</p>
                    </div>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-cyan-300 hover:text-cyan-200 font-bold flex-shrink-0">
                    {isExpanded ? 'بستن' : 'جزئیات'}
                </button>
            </div>
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-cyan-400/20 space-y-4">
                    {hasHistory ? (
                        <CashboxHistoryTimeline history={item.details.history} />
                    ) : null}

                    <dl className="text-sm bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                        {Object.entries(item.details)
                            .filter(([key]) => key !== 'history') // Don't show history as a raw JSON
                            .map(([key, value]) => (
                                <ActivityDetail key={key} label={key} value={value} />
                        ))}
                    </dl>
                </div>
            )}
        </li>
    );
};

const ActivityFeed: React.FC = () => {
    const api = useApi();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const mapDataToActivities = useCallback(async () => {
        setIsLoading(true);
        const [activityData, customerData, partnerData] = await Promise.all([
             api.getComprehensiveActivityData(),
             api.getCustomers(),
             api.getPartnerAccounts()
        ]);
        
        const customersMap = new Map(customerData.map(c => [c.id, c.name]));
        const partnersMap = new Map(partnerData.map(p => [p.id, p.name]));
        
        // FIX: Define initiatorsMap to resolve 'Cannot find name' error.
        const initiatorsMap = new Map<string, {name: string}>();
        customerData.forEach(c => initiatorsMap.set(c.id, { name: c.name }));
        partnerData.forEach(p => initiatorsMap.set(p.id, { name: p.name }));

        const allActivities: ActivityItem[] = [];

        activityData.cashboxRequests.forEach(req => {
            const isDeposit = req.request_type === 'deposit';
            allActivities.push({
                id: `cr-${req.id}`,
                timestamp: new Date(req.created_at),
                type: isDeposit ? 'رسید صندوق' : 'برد از صندوق',
                summary: <>{req.requested_by} یک درخواست <strong className={isDeposit ? "text-green-400" : "text-red-400"}>{isDeposit ? 'رسید' : 'برد'}</strong> به مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(req.amount)} {req.currency}</strong> ثبت کرد.</>,
                icon: isDeposit ? <PlusIcon /> : <MinusIcon />,
                colorClass: isDeposit ? 'border-green-500' : 'border-red-500',
                details: { ...req, status: cashboxRequestStatusTranslations[req.status], customer_name: req.customer_code ? customersMap.get(customerData.find(c => c.code === req.customer_code)?.id || '') || 'یافت نشد' : 'ندارد' },
            });
        });
        
        activityData.domesticTransfers.forEach(t => {
            allActivities.push({
                id: `dt-${t.id}`,
                timestamp: new Date(t.created_at),
                type: 'حواله داخلی',
                summary: <>حواله داخلی از <strong>{t.sender.name}</strong> به <strong>{t.receiver.name}</strong> به مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(t.amount)} {t.currency}</strong> ثبت شد.</>,
                icon: <TransferIcon />,
                colorClass: 'border-cyan-500',
                details: { ...t, status: statusTranslations[t.status], customer_name: t.customer_id ? customersMap.get(t.customer_id) || 'یافت نشد' : 'ندارد' }
            });
        });
        
        activityData.foreignTransactions.forEach(ft => {
            allActivities.push({
                id: `ft-${ft.id}`,
                timestamp: new Date(ft.timestamp),
                type: 'تبادله',
                summary: <>{ft.user} یک <strong className="text-fuchsia-400">تبادله</strong> جدید با فروش <strong className="font-mono">{new Intl.NumberFormat().format(ft.from_amount)} {ft.from_currency}</strong> از {ft.from_asset_name} را آغاز کرد.</>,
                icon: <ExchangeIcon />,
                colorClass: 'border-fuchsia-500',
                details: { ...ft, status: foreignTransactionStatusTranslations[ft.status] }
            });
        });

        activityData.commissionTransfers.forEach(ct => {
             allActivities.push({
                id: `ct-${ct.id}`,
                timestamp: new Date(ct.created_at),
                type: 'حواله کمیشن‌کاری',
                summary: <>{ct.created_by} یک <strong className="text-amber-400">حواله کمیشن‌کاری</strong> به مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(ct.amount)} {ct.currency}</strong> را ثبت کرد.</>,
                icon: <TransferIcon />,
                colorClass: 'border-amber-500',
                details: { ...ct, status: commissionTransferStatusTranslations[ct.status], initiator_name: initiatorsMap.get(ct.initiator_id)?.name || 'ناشناس' }
            });
        });

        activityData.accountTransfers.forEach(at => {
             allActivities.push({
                id: `at-${at.id}`,
                timestamp: new Date(at.timestamp),
                type: 'انتقال داخلی',
                summary: <>{at.user} مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(at.amount)} {at.currency}</strong> را از حساب <strong>{customersMap.get(at.from_customer_id) || '؟'}</strong> به <strong>{customersMap.get(at.to_customer_id) || '?'}</strong> انتقال داد.</>,
                icon: <TransferIcon />,
                colorClass: 'border-indigo-500',
                details: { ...at, from_customer_name: customersMap.get(at.from_customer_id) || '؟', to_customer_name: customersMap.get(at.to_customer_id) || '؟' }
            });
        });

        activityData.expenses.forEach(ex => {
            allActivities.push({
                id: `ex-${ex.id}`,
                timestamp: new Date(ex.created_at),
                type: 'مصرف',
                summary: <>{ex.user} یک <strong className="text-rose-400">مصرف</strong> به مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(ex.amount)} {ex.currency}</strong> ثبت کرد.</>,
                icon: <ExpenseIcon />,
                colorClass: 'border-rose-500',
                details: { ...ex, status: expenseStatusTranslations[ex.status] }
            });
        });

        activityData.amanat.forEach(am => {
            allActivities.push({
                id: `am-${am.id}`,
                timestamp: new Date(am.created_at),
                type: 'امانت',
                summary: <>{am.created_by} یک <strong className="text-lime-400">امانت</strong> به مبلغ <strong className="font-mono">{new Intl.NumberFormat().format(am.amount)} {am.currency}</strong> از طرف <strong>{am.customer_name}</strong> ثبت کرد.</>,
                icon: <AmanatIcon />,
                colorClass: 'border-lime-500',
                details: { ...am, status: amanatStatusTranslations[am.status] }
            });
        });
        
        const sortedActivities = allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(sortedActivities);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        mapDataToActivities();
    }, [mapDataToActivities]);

    return (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20">
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">گزارش زنده فعالیت‌های سیستم</h2>
            </div>
            <div className="max-h-[800px] overflow-y-auto">
                 {isLoading ? (
                    <p className="p-10 text-center text-slate-400 text-lg">در حال بارگذاری فعالیت‌ها...</p>
                ) : activities.length === 0 ? (
                    <p className="p-10 text-center text-slate-400 text-lg">هنوز فعالیتی برای نمایش وجود ندارد.</p>
                ) : (
                    <ul className="divide-y divide-cyan-400/10">
                        {activities.map(activity => (
                            <ActivityItemCard key={activity.id} item={activity} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;