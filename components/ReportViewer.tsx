import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
    CashboxRequest, 
    DomesticTransfer, 
    CommissionTransfer,
    Expense,
    AccountTransfer,
    ForeignTransaction,
    Currency,
} from '../types';
import ReportPrintView from './ReportPrintView';
import { 
    cashboxRequestStatusTranslations, 
    statusTranslations, 
    commissionTransferStatusTranslations, 
    expenseStatusTranslations, 
    foreignTransactionStatusTranslations,
    expenseCategoryTranslations
} from '../utils/translations';

type ReportData = (CashboxRequest | DomesticTransfer | CommissionTransfer | Expense | AccountTransfer | ForeignTransaction)[];
type ReportTypeKey = 'cashbox' | 'domesticTransfers' | 'commissionTransfers' | 'expenses' | 'accountTransfers' | 'foreignTransfers' | 'commissionRevenue';

interface ReportViewerProps {
    reportData: ReportData;
    reportType: ReportTypeKey;
    customersMap: Map<string, string>;
    partnersMap: Map<string, string>;
}

const PrintIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 01-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 01-2 2" /></svg>;
const DownloadIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

const ReportViewer: React.FC<ReportViewerProps> = ({ reportData, reportType, customersMap, partnersMap }) => {
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);

    const { headers, rows, summary } = useMemo(() => {
        let headers: string[] = [];
        let rows: (string | number | React.ReactNode)[][] = [];
        let summary: { label: string; value: string }[] = [];

        const formatCurrency = (amount: number, currency: string) => `${new Intl.NumberFormat('en-US').format(amount)} ${currency}`;
        
        const baseHeaders = ["تاریخ", "کاربر"];

        switch (reportType) {
            case 'cashbox':
                headers = [...baseHeaders, "نوع", "شرح", "مبلغ", "وضعیت"];
                const cashboxData = reportData as CashboxRequest[];
                rows = cashboxData.map(r => [
                    new Date(r.created_at).toLocaleString('fa-IR'),
                    r.requested_by,
                    r.request_type === 'deposit' ? <span className="text-green-400">رسید</span> : <span className="text-red-400">برد</span>,
                    r.reason,
                    formatCurrency(r.amount, r.currency),
                    cashboxRequestStatusTranslations[r.status]
                ]);
                const totalIn = cashboxData.filter(r => r.request_type === 'deposit' && r.status === 'Approved').reduce((s, r) => s + r.amount, 0);
                const totalOut = cashboxData.filter(r => r.request_type === 'withdrawal' && r.status === 'Approved').reduce((s, r) => s + r.amount, 0);
                summary = [
                    { label: "مجموع رسید", value: formatCurrency(totalIn, cashboxData[0]?.currency || '') },
                    { label: "مجموع برد", value: formatCurrency(totalOut, cashboxData[0]?.currency || '') },
                    { label: "تعداد کل", value: String(cashboxData.length) },
                ];
                break;
            
            case 'domesticTransfers':
                headers = [...baseHeaders, "فرستنده", "گیرنده", "مقصد", "همکار", "مبلغ", "کمیسیون", "وضعیت"];
                const domesticData = reportData as DomesticTransfer[];
                rows = domesticData.map(r => [
                    new Date(r.created_at).toLocaleString('fa-IR'),
                    r.created_by,
                    r.sender.name,
                    r.receiver.name,
                    r.destination_province,
                    r.partner_sarraf,
                    formatCurrency(r.amount, r.currency),
                    formatCurrency(r.commission, r.currency),
                    statusTranslations[r.status]
                ]);
                const totalAmount = domesticData.reduce((s, r) => s + r.amount, 0);
                const totalCommission = domesticData.reduce((s, r) => s + r.commission, 0);
                summary = [
                    { label: "مجموع مبالغ", value: formatCurrency(totalAmount, domesticData[0]?.currency || '') },
                    { label: "مجموع کمیسیون", value: formatCurrency(totalCommission, domesticData[0]?.currency || '') },
                    { label: "تعداد کل", value: String(domesticData.length) },
                ];
                break;
            
            case 'commissionTransfers':
                headers = [...baseHeaders, "از طرف", "مبلغ اصلی", "کمیسیون", "مبلغ پرداختی", "وضعیت"];
                const commissionData = reportData as CommissionTransfer[];
                rows = commissionData.map(r => [
                    new Date(r.created_at).toLocaleString('fa-IR'),
                    r.created_by,
                    customersMap.get(r.initiator_id) || partnersMap.get(r.initiator_id) || 'ناشناس',
                    formatCurrency(r.amount, r.currency),
                    formatCurrency(r.commission_amount || 0, r.currency),
                    formatCurrency(r.final_amount_paid || 0, r.currency),
                    commissionTransferStatusTranslations[r.status]
                ]);
                const totalCommissionAmount = commissionData.filter(r => r.status === 'Completed').reduce((s, r) => s + (r.commission_amount || 0), 0);
                summary = [
                    { label: "مجموع درآمد کمیسیون", value: formatCurrency(totalCommissionAmount, 'IRT_BANK')},
                    { label: "تعداد کل", value: String(commissionData.length) },
                ];
                break;
                
             case 'commissionRevenue':
                headers = ["تاریخ", "نوع حواله", "شناسه", "مبلغ کمیسیون"];
                const revenueData = reportData as any[]; // Combined array
                rows = revenueData.map(r => [
                    new Date(r.created_at).toLocaleString('fa-IR'),
                    r.type === 'DomesticTransfer' ? 'داخلی' : 'کمیشن‌کاری',
                    r.id,
                    formatCurrency(r.commission_amount, r.currency)
                ]);
                 const totalRevenue = revenueData.reduce((sum, r) => {
                    return sum + r.commission_amount;
                }, 0);
                 summary = [
                    { label: "مجموع درآمد (تخمینی)", value: new Intl.NumberFormat('en-US').format(totalRevenue) },
                    { label: "تعداد کل", value: String(revenueData.length) },
                ];
                break;

            case 'expenses':
                headers = [...baseHeaders, "دسته‌بندی", "شرح", "مبلغ", "وضعیت"];
                const expensesData = reportData as Expense[];
                rows = expensesData.map(r => [
                    new Date(r.created_at).toLocaleString('fa-IR'),
                    r.user,
                    expenseCategoryTranslations[r.category],
                    r.description,
                    formatCurrency(r.amount, r.currency),
                    expenseStatusTranslations[r.status]
                ]);
                const totalExpense = expensesData.filter(r => r.status === 'Approved').reduce((s, r) => s + r.amount, 0);
                 summary = [
                    { label: "مجموع مصارف تایید شده", value: formatCurrency(totalExpense, expensesData[0]?.currency || '') },
                    { label: "تعداد کل", value: String(expensesData.length) },
                ];
                break;
            
            case 'accountTransfers':
                headers = ["تاریخ", "از حساب", "به حساب", "مبلغ", "توضیحات", "کاربر"];
                const accountData = reportData as AccountTransfer[];
                rows = accountData.map(r => [
                    new Date(r.timestamp).toLocaleString('fa-IR'),
                    customersMap.get(r.from_customer_id) || r.from_customer_id,
                    customersMap.get(r.to_customer_id) || r.to_customer_id,
                    formatCurrency(r.amount, r.currency),
                    r.description,
                    r.user
                ]);
                const accountTotals = accountData.reduce((acc, r) => {
                    acc[r.currency] = (acc[r.currency] || 0) + r.amount;
                    return acc;
                }, {} as Record<string, number>);
                summary = Object.entries(accountTotals).map(([currency, total]) => ({
                    label: `مجموع ${currency}`,
                    value: formatCurrency(total, currency)
                }));
                summary.push({ label: "تعداد کل", value: String(accountData.length) });
                break;

            case 'foreignTransfers':
                headers = ["تاریخ", "شرح", "مبلغ فروش", "مبلغ خرید", "وضعیت", "کاربر"];
                const foreignData = reportData as ForeignTransaction[];
                rows = foreignData.map(r => [
                    new Date(r.timestamp).toLocaleString('fa-IR'),
                    r.description,
                    <span className="text-red-400">{formatCurrency(r.from_amount, r.from_currency)} <span className="text-xs text-slate-400">از {r.from_asset_name}</span></span>,
                    r.to_amount ? <span className="text-green-400">{formatCurrency(r.to_amount, r.to_currency!)} <span className="text-xs text-slate-400">به {r.to_asset_name}</span></span> : '-',
                    foreignTransactionStatusTranslations[r.status],
                    r.user
                ]);
                summary = [{ label: "تعداد کل", value: String(foreignData.length) }];
                break;

            default:
                break;
        }

        return { headers, rows, summary };
    }, [reportData, reportType, customersMap, partnersMap]);

    if (reportData.length === 0) {
        return <p className="text-center text-xl text-slate-400">هیچ رکوردی برای این گزارش یافت نشد.</p>;
    }
    
    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
                    {summary.map(item => (
                        <div key={item.label} className="bg-slate-800/50 px-4 py-2 rounded-lg text-center">
                            <span className="text-base text-slate-400">{item.label}</span>
                            <p className="text-2xl font-bold text-cyan-300 font-mono">{item.value}</p>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setPrintModalOpen(true)} className="flex items-center px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base rounded">
                        <PrintIcon /> چاپ
                    </button>
                    {/* <button onClick={() => {}} className="flex items-center px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base rounded">
                        <DownloadIcon /> دریافت CSV
                    </button> */}
                </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
                 <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase bg-[#12122E] sticky top-0">
                        <tr>{headers.map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                {row.map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap">{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isPrintModalOpen && (
                 <ReportPrintPreviewModal 
                    isOpen={isPrintModalOpen}
                    onClose={() => setPrintModalOpen(false)}
                    reportData={reportData}
                    reportType={reportType}
                    headers={headers}
                    rows={rows}
                    summary={summary}
                 />
            )}
        </div>
    );
};

interface ReportPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportData: ReportData;
    reportType: ReportTypeKey;
    headers: string[];
    rows: (string | number | React.ReactNode)[][];
    summary: { label: string; value: string }[];
}

const ReportPrintPreviewModal: React.FC<ReportPrintPreviewModalProps> = ({ isOpen, onClose, headers, rows, summary }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <ReportPrintView headers={headers} rows={rows} summary={summary} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
                        ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-5xl h-[90vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پیش‌نمایش چاپ گزارش</h2>
                </div>
                <div className="p-8 flex-grow overflow-y-auto bg-gray-600/20">
                    <div className="bg-white rounded shadow-lg mx-auto">
                         <ReportPrintView headers={headers} rows={rows} summary={summary} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <button onClick={handlePrint} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300" >
                        چاپ نهایی
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};


export default ReportViewer;