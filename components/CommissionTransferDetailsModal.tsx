
import React from 'react';
import ReactDOM from 'react-dom';
import { CommissionTransfer, BankAccount } from '../types';
import { commissionTransferStatusTranslations } from '../utils/translations';
import { formatTrackingCode } from '../utils/idGenerator';

interface CommissionTransferDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: CommissionTransfer;
    initiatorName: string;
    bankAccountsMap: Map<string, BankAccount>;
}

const DetailRow: React.FC<{ label: string, value?: string | number | null }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="py-3 px-4 grid grid-cols-3 gap-4 border-b border-slate-700/50">
            <dt className="font-semibold text-slate-400">{label}</dt>
            <dd className="col-span-2 text-slate-200 font-mono">{String(value)}</dd>
        </div>
    );
};

const CommissionTransferDetailsModal: React.FC<CommissionTransferDetailsModalProps> = ({ isOpen, onClose, transfer, initiatorName, bankAccountsMap }) => {
    if (!isOpen) return null;

    const receivedIntoAccount = bankAccountsMap.get(transfer.received_into_bank_account_id);
    const paidFromAccount = transfer.paid_from_bank_account_id ? bankAccountsMap.get(transfer.paid_from_bank_account_id) : null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">جزئیات کامل حواله کمیشن‌کاری</h2>
                    <p className="text-2xl text-slate-400 mt-1 font-mono">{formatTrackingCode(transfer.created_at)}</p>
                </div>
                <div className="p-8 flex-grow overflow-y-auto space-y-8 text-xl">
                    
                    {/* General Section */}
                    <section>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-3 pb-2 border-b-2 border-cyan-400/20">مشخصات کلی</h3>
                        <dl className="bg-slate-800/30 rounded-lg">
                            <DetailRow label="از طرف" value={`${initiatorName} (${transfer.initiator_type === 'Customer' ? 'مشتری' : 'همکار'})`} />
                            <DetailRow label="وضعیت فعلی" value={commissionTransferStatusTranslations[transfer.status]} />
                            <DetailRow label="ثبت کننده" value={transfer.created_by} />
                            <DetailRow label="تاریخ ثبت" value={new Date(transfer.created_at).toLocaleString('fa-IR-u-nu-latn')} />
                        </dl>
                    </section>

                    {/* Deposit Section */}
                    <section>
                        <h3 className="text-2xl font-bold text-green-400 mb-3 pb-2 border-b-2 border-green-400/20">مرحله ورود وجه</h3>
                        <dl className="bg-slate-800/30 rounded-lg">
                             <DetailRow label="مبلغ ورودی" value={`${new Intl.NumberFormat('fa-IR').format(transfer.amount)} ${transfer.currency}`} />
                             <DetailRow label="از حساب/کارت مبدأ" value={transfer.source_account_number} />
                             <DetailRow label="چهار رقم آخر کارت مبدأ" value={transfer.source_card_last_digits} />
                             <DetailRow label="شماره سریال رسید" value={transfer.receipt_serial} />
                             <DetailRow label="واریز به حساب ما" value={receivedIntoAccount ? `${receivedIntoAccount.bank_name} - ${receivedIntoAccount.account_holder}` : 'نامشخص'} />
                             <DetailRow label="شناسه درخواست صندوق" value={transfer.deposit_request_id} />
                        </dl>
                    </section>
                    
                    {/* Execution Section */}
                    {transfer.status !== 'PendingDepositApproval' && (
                        <section>
                            <h3 className="text-2xl font-bold text-red-400 mb-3 pb-2 border-b-2 border-red-400/20">مرحله پرداخت وجه</h3>
                            <dl className="bg-slate-800/30 rounded-lg">
                                <DetailRow label="فیصدی کمیسیون" value={`${transfer.commission_percentage}%`} />
                                <DetailRow label="مبلغ کمیسیون" value={transfer.commission_amount ? `${new Intl.NumberFormat('fa-IR').format(transfer.commission_amount)} ${transfer.currency}` : '-'} />
                                <DetailRow label="مبلغ نهایی پرداخت" value={transfer.final_amount_paid ? `${new Intl.NumberFormat('fa-IR').format(transfer.final_amount_paid)} ${transfer.currency}` : '-'} />
                                <DetailRow label="پرداخت از حساب ما" value={paidFromAccount ? `${paidFromAccount.bank_name} - ${paidFromAccount.account_holder}` : '-'} />
                                <DetailRow label="به حساب/کارت مقصد" value={transfer.destination_account_number} />
                                <DetailRow label="چهار رقم آخر کارت مقصد" value={transfer.execution_destination_card_digits} />
                                <DetailRow label="شماره سریال پرداخت" value={transfer.execution_receipt_serial} />
                                <DetailRow label="شناسه درخواست صندوق" value={transfer.withdrawal_request_id} />
                                <DetailRow label="تاریخ تکمیل" value={transfer.completed_at ? new Date(transfer.completed_at).toLocaleString('fa-IR-u-nu-latn') : '-'} />
                            </dl>
                        </section>
                    )}

                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default CommissionTransferDetailsModal;
