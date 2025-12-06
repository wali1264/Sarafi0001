import React from 'react';
import { CommissionTransfer, CommissionTransferStatus } from '../types';
import { commissionTransferStatusTranslations } from '../utils/translations';

interface CommissionLedgerProps {
    transfers: CommissionTransfer[];
    isLoading: boolean;
}

const CommissionLedger: React.FC<CommissionLedgerProps> = ({ transfers, isLoading }) => {
    
    const getStatusStyle = (status: CommissionTransferStatus) => {
        switch (status) {
            case CommissionTransferStatus.Completed: return 'bg-green-500/20 text-green-300';
            case CommissionTransferStatus.PendingExecution: return 'bg-sky-500/20 text-sky-300';
            case CommissionTransferStatus.PendingDepositApproval:
            case CommissionTransferStatus.PendingWithdrawalApproval:
                return 'bg-yellow-500/20 text-yellow-300';
            case CommissionTransferStatus.Rejected: return 'bg-red-500/20 text-red-300';
            default: return 'bg-slate-600/20 text-slate-300';
        }
    };

    if (isLoading) {
        return <p className="text-center text-slate-400 text-lg p-8">در حال بارگذاری صورتحساب...</p>;
    }
    
    if (transfers.length === 0) {
        return <p className="text-center text-slate-400 text-lg p-8">هیچ حواله کمیشن‌کاری برای نمایش وجود ندارد.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-lg text-right text-slate-300">
                <thead className="text-xl text-slate-400 uppercase">
                    <tr>
                        <th className="px-6 py-4 font-medium">تاریخ / سریال</th>
                        <th className="px-6 py-4 font-medium">مبلغ ورودی</th>
                        <th className="px-6 py-4 font-medium">جزئیات پرداخت</th>
                        <th className="px-6 py-4 font-medium">کمیسیون</th>
                        <th className="px-6 py-4 font-medium">وضعیت</th>
                    </tr>
                </thead>
                <tbody>
                    {transfers.map(t => (
                        <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>{new Date(t.created_at).toLocaleString('fa-IR-u-nu-latn')}</div>
                                {t.receipt_serial && <div className="text-sm text-slate-400 font-mono">سریال واریز: {t.receipt_serial}</div>}
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-mono text-left text-green-400">{new Intl.NumberFormat('fa-IR').format(t.amount)} {t.currency}</div>
                                <div className="text-sm text-slate-400 text-left">از: {t.source_account_number}</div>
                                {t.source_card_last_digits && <div className="text-sm text-slate-400 text-left">کارت: **** {t.source_card_last_digits}</div>}
                            </td>
                            <td className="px-6 py-4">
                                {t.status === 'Completed' || t.status === 'PendingWithdrawalApproval' ? (
                                    <>
                                        <div className="font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR').format(t.final_amount_paid || 0)} {t.currency}</div>
                                        <div className="text-sm text-slate-400 text-left">به: {t.destination_account_number}</div>
                                        {t.execution_receipt_serial && <div className="text-xs text-slate-500 text-left font-mono">سریال پرداخت: {t.execution_receipt_serial}</div>}
                                        {t.execution_destination_card_digits && <div className="text-xs text-slate-500 text-left font-mono">کارت مقصد: **** {t.execution_destination_card_digits}</div>}
                                    </>
                                ) : <span className="text-slate-500">-</span>}
                            </td>
                            <td className="px-6 py-4 font-mono text-left text-amber-400">
                                {t.commission_amount ? new Intl.NumberFormat('fa-IR').format(t.commission_amount) : '-'}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-3 py-1 text-base font-semibold rounded-full whitespace-nowrap ${getStatusStyle(t.status)}`}>
                                    {commissionTransferStatusTranslations[t.status]}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CommissionLedger;
