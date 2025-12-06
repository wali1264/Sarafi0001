
import React, { useState, useMemo } from 'react';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import RentedReportPrintModal from './RentedReportPrintModal';
import ShamsiDatePicker from './ShamsiDatePicker';

type ReportType = 'customerStatement' | 'accountStatement' | 'commissionReport';
interface ReportResult {
    title: string;
    summary: { label: string; value: string; currency: string }[];
    headers: string[];
    rows: (string | number)[][];
}

const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const RentedReportsTab: React.FC = () => {
    const { transactions, users, accounts } = useRentedAccounts();

    // Form state
    const [reportType, setReportType] = useState<ReportType>('customerStatement');
    const [entityId, setEntityId] = useState('');
    const [timeFilter, setTimeFilter] = useState<'thisMonth' | 'custom'>('thisMonth');
    const [dateRange, setDateRange] = useState(() => {
        const start = new Date();
        start.setDate(1);
        return { start: toISODateString(start), end: toISODateString(new Date()) };
    });

    // Result state
    const [reportData, setReportData] = useState<ReportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const handleGenerateReport = () => {
        setIsLoading(true);
        setReportData(null);
        if (!entityId && (reportType === 'customerStatement' || reportType === 'accountStatement')) {
            setIsLoading(false);
            return;
        }

        const start = new Date(dateRange.start + 'T00:00:00');
        const end = new Date(dateRange.end + 'T23:59:59.999');

        const filteredTx = transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            return txDate >= start && txDate <= end;
        });

        let result: ReportResult | null = null;
        
        switch (reportType) {
            case 'customerStatement': {
                const user = usersMap.get(entityId);
                if (!user) break;
                
                let userTxs;
                if (user.type === 'Guest') {
                     // Guest ID in context is guest-GuestName
                     // Transaction guest_name matches entityId (which is GuestName)
                     userTxs = filteredTx.filter(t => t.user_type === 'Guest' && t.guest_name === user.entityId);
                } else {
                    const [userType, userId] = user.id.split('-');
                    userTxs = filteredTx.filter(t => t.user_type.toLowerCase() === userType && t.user_id === userId);
                }
                
                const totalReceipts = userTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
                const totalBards = userTxs.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.total_transaction_amount, 0);

                result = {
                    title: `صورتحساب برای: ${user.name}`,
                    summary: [
                        { label: 'مجموع رسیدها', value: new Intl.NumberFormat('en-US').format(totalReceipts), currency: 'IRT' },
                        { label: 'مجموع بردها', value: new Intl.NumberFormat('en-US').format(totalBards), currency: 'IRT' },
                    ],
                    headers: ['تاریخ', 'نوع', 'حساب کرایی', 'مبلغ', 'کمیسیون', 'مبلغ کل'],
                    rows: userTxs.map(t => [
                        new Date(t.timestamp).toLocaleString('fa-IR-u-nu-latn'),
                        t.type === 'deposit' ? 'رسید' : 'برد',
                        accountsMap.get(t.rented_account_id)?.bank_name || '-',
                        t.amount,
                        t.commission_amount,
                        t.total_transaction_amount,
                    ])
                };
                break;
            }
            case 'accountStatement': {
                const account = accountsMap.get(entityId);
                if (!account) break;

                const accountTxs = filteredTx.filter(t => t.rented_account_id === entityId);
                const totalReceipts = accountTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
                const totalBards = accountTxs.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.total_transaction_amount, 0);
                
                result = {
                    title: `صورتحساب برای حساب: ${account.bank_name} (${account.partner_name})`,
                    summary: [
                        { label: 'مجموع رسیدها', value: new Intl.NumberFormat('en-US').format(totalReceipts), currency: 'IRT' },
                        { label: 'مجموع بردها', value: new Intl.NumberFormat('en-US').format(totalBards), currency: 'IRT' },
                    ],
                    headers: ['تاریخ', 'طرف حساب', 'نوع', 'مبلغ', 'کمیسیون', 'مبلغ کل'],
                    rows: accountTxs.map(t => {
                        let userName = '-';
                        if (t.user_type === 'Guest') {
                            userName = t.guest_name + ' (گذری)';
                        } else {
                            userName = usersMap.get(`${t.user_type.toLowerCase()}-${t.user_id}`)?.name || '-';
                        }
                        return [
                            new Date(t.timestamp).toLocaleString('fa-IR-u-nu-latn'),
                            userName,
                            t.type === 'deposit' ? 'رسید' : 'برد',
                            t.amount,
                            t.commission_amount,
                            t.total_transaction_amount
                        ]
                    })
                };
                break;
            }
        }

        setReportData(result);
        setIsLoading(false);
    };

    const exportToCSV = () => {
        if (!reportData) return;
        const { headers, rows, title } = reportData;
        
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
        csvContent += rows.map(r => r.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${title.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">مرکز گزارشات</h2>
            <div className="p-4 border border-cyan-400/20 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-lg text-cyan-300 mb-1">نوع گزارش</label>
                        <select value={reportType} onChange={e => { setReportType(e.target.value as ReportType); setEntityId(''); setReportData(null); }} className="w-full text-lg p-2 bg-slate-900/50 border border-slate-600 rounded">
                            <option value="customerStatement">صورتحساب مشتری/همکار</option>
                            <option value="accountStatement">صورتحساب حساب کرایی</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-lg text-cyan-300 mb-1">انتخاب</label>
                        <select value={entityId} onChange={e => setEntityId(e.target.value)} className="w-full text-lg p-2 bg-slate-900/50 border border-slate-600 rounded">
                            <option value="" disabled>-- یک مورد را انتخاب کنید --</option>
                            {reportType === 'customerStatement' 
                                ? users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.type === 'Customer' ? 'مشتری' : u.type === 'Partner' ? 'همکار' : 'گذری'})</option>)
                                : accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} ({a.partner_name})</option>)
                            }
                        </select>
                    </div>
                </div>
                <div className="flex items-end gap-4">
                     <div className="flex-grow">
                        <ShamsiDatePicker label="از تاریخ:" value={dateRange.start} onChange={(val) => setDateRange(prev => ({...prev, start: val}))} />
                    </div>
                    <div className="flex-grow">
                        <ShamsiDatePicker label="تا تاریخ:" value={dateRange.end} onChange={(val) => setDateRange(prev => ({...prev, end: val}))} />
                    </div>
                    <button onClick={handleGenerateReport} disabled={isLoading || !entityId} className="px-6 py-2 text-xl font-bold text-slate-900 bg-cyan-400 rounded disabled:opacity-50">تولید گزارش</button>
                </div>
            </div>

            {isLoading && <p className="text-center text-slate-400">در حال تولید گزارش...</p>}
            
            {reportData && (
                <div className="p-4 border border-cyan-400/20 rounded-lg animate-fadeIn space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">{reportData.title}</h3>
                        <div className="flex gap-2">
                             <button onClick={() => setIsPrintModalOpen(true)} className="px-4 py-1 bg-slate-700 hover:bg-slate-600 rounded">چاپ</button>
                             <button onClick={exportToCSV} className="px-4 py-1 bg-slate-700 hover:bg-slate-600 rounded">خروجی اکسل</button>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        {reportData.summary.map(s => (
                            <div key={s.label} className="bg-slate-800/50 p-3 rounded text-center">
                                <h4 className="text-slate-400">{s.label}</h4>
                                <p className="font-mono text-2xl font-bold">{s.value} <span className="text-lg">{s.currency}</span></p>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-base text-right text-slate-300">
                            <thead className="text-lg text-slate-400 bg-slate-800 sticky top-0">
                                <tr>{reportData.headers.map(h => <th key={h} className="p-2">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {reportData.rows.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-700">
                                        {row.map((cell, j) => <td key={j} className="p-2 font-mono">{typeof cell === 'number' ? new Intl.NumberFormat('en-US').format(cell) : cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             {isPrintModalOpen && reportData && (
                <RentedReportPrintModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    reportData={reportData}
                />
            )}
        </div>
    );
};

export default RentedReportsTab;
