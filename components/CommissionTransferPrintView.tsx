
import React from 'react';
import { CommissionTransfer, BankAccount } from '../types';
import { commissionTransferStatusTranslations } from '../utils/translations';
import { formatTrackingCode } from '../utils/idGenerator';

interface CommissionTransferPrintViewProps {
    transfer: CommissionTransfer | null;
    initiatorName: string;
    bankAccountsMap: Map<string, BankAccount>;
    id: string;
}

const CommissionTransferPrintView: React.FC<CommissionTransferPrintViewProps> = ({ transfer, initiatorName, bankAccountsMap, id }) => {
    
    if (!transfer) {
        return <div className="text-center p-10 text-gray-700">سند یافت نشد.</div>;
    }
    
    const receivedIntoAccount = bankAccountsMap.get(transfer.receivedIntoBankAccountId);
    const paidFromAccount = transfer.paidFromBankAccountId ? bankAccountsMap.get(transfer.paidFromBankAccountId) : null;

    return (
        <div id={id} className="printable-area bg-white text-black p-8 max-w-2xl mx-auto font-sans" style={{ direction: 'rtl' }}>
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
                <div>
                    <h1 className="text-3xl font-bold">صرافی الشیخ</h1>
                    <p className="text-lg">رسید حواله کمیشن‌کاری</p>
                </div>
                <div className="text-left">
                    <p><strong>کد رهگیری:</strong> <span className="font-mono text-2xl font-bold">{formatTrackingCode(transfer.createdAt)}</span></p>
                    <p><strong>تاریخ ثبت:</strong> {new Date(transfer.createdAt).toLocaleString('fa-IR')}</p>
                </div>
            </header>

            <main className="my-8 space-y-6 text-lg">
                <div className="border border-black p-4">
                    <h2 className="text-xl font-bold mb-2">جزئیات دریافت وجه</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <p><strong>از طرف:</strong></p><p className="font-semibold">{initiatorName}</p>
                        <p><strong>مبلغ دریافتی:</strong></p><p className="font-mono text-left">{new Intl.NumberFormat('fa-IR').format(transfer.amount)} {transfer.currency}</p>
                        <p><strong>از حساب مبدأ:</strong></p><p className="font-mono text-left">{transfer.sourceAccountNumber}</p>
                        <p><strong>به حساب مقصد ما:</strong></p><p className="text-left">{receivedIntoAccount?.bankName} - {receivedIntoAccount?.accountHolder}</p>
                    </div>
                </div>

                {transfer.status !== 'PendingDepositApproval' && (
                    <div className="border border-black p-4">
                        <h2 className="text-xl font-bold mb-2">جزئیات پرداخت نهایی</h2>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <p><strong>مبلغ نهایی پرداخت:</strong></p><p className="font-mono font-bold text-left">{new Intl.NumberFormat('fa-IR').format(transfer.finalAmountPaid || 0)} {transfer.currency}</p>
                            <p><strong>مبلغ کمیسیون:</strong></p><p className="font-mono text-left">{new Intl.NumberFormat('fa-IR').format(transfer.commissionAmount || 0)} {transfer.currency}</p>
                            <p><strong>به حساب مقصد:</strong></p><p className="font-mono text-left">{transfer.destinationAccountNumber}</p>
                            <p><strong>از حساب مبدأ ما:</strong></p><p className="text-left">{paidFromAccount?.bankName} - {paidFromAccount?.accountHolder}</p>
                             <p className="col-span-2 pt-2 mt-2 border-t"><strong>تاریخ اجرا:</strong> {transfer.completedAt ? new Date(transfer.completedAt).toLocaleString('fa-IR') : '-'}</p>
                        </div>
                    </div>
                )}
                
                <div className="border border-black p-4 bg-gray-100 font-bold text-center">
                    وضعیت نهایی: {commissionTransferStatusTranslations[transfer.status]}
                </div>

            </main>

            <footer className="pt-16">
                <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">امضای مشتری</p>
                    </div>
                     <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">مهر و امضای صرافی</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CommissionTransferPrintView;
