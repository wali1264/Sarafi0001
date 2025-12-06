import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { ExecuteCommissionTransferPayload, User, BankAccount, CommissionTransfer } from '../types';
import { useToast } from '../contexts/ToastContext';
import { persianToEnglishNumber } from '../utils/translations';

interface ExecuteCommissionTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    transfer: CommissionTransfer;
}

const ExecuteCommissionTransferModal: React.FC<ExecuteCommissionTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser, transfer }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [paidFromBankAccountId, setPaidFromBankAccountId] = useState('');
    const [destinationAccountNumber, setDestinationAccountNumber] = useState('');
    const [executionReceiptSerial, setExecutionReceiptSerial] = useState('');
    const [executionDestinationCardDigits, setExecutionDestinationCardDigits] = useState('');
    
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            api.getBankAccounts().then(accounts => {
                const activeAccounts = accounts.filter(a => a.status === 'Active' && a.currency === transfer.currency);
                setBankAccounts(activeAccounts);
                if (activeAccounts.length > 0) {
                    setPaidFromBankAccountId(activeAccounts[0].id);
                }
            });
        }
    }, [isOpen, api, transfer.currency]);
    
    const commissionAmount = useMemo(() => transfer.amount * (transfer.commission_percentage / 100), [transfer]);
    const finalAmountPaid = useMemo(() => transfer.amount - commissionAmount, [transfer, commissionAmount]);

    if (!isOpen) return null;
    
    const handleClose = () => {
        setPaidFromBankAccountId(bankAccounts[0]?.id || '');
        setDestinationAccountNumber('');
        setExecutionReceiptSerial('');
        setExecutionDestinationCardDigits('');
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload: ExecuteCommissionTransferPayload = {
            transfer_id: transfer.id,
            paid_from_bank_account_id: paidFromBankAccountId,
            destination_account_number: destinationAccountNumber,
            execution_receipt_serial: executionReceiptSerial,
            execution_destination_card_digits: executionDestinationCardDigits,
            user: currentUser,
        };

        const result = await api.executeCommissionTransfer(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("دستور پرداخت به صندوق ارسال شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">اجرای دستور پرداخت</h2>
                        <p className="text-lg text-slate-400 mt-1">شناسه: {transfer.id}</p>
                    </div>
                    <div className="p-8 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                            <div className="bg-slate-800/50 p-3 rounded">
                                <h4 className="text-lg text-slate-400">مبلغ اصلی</h4>
                                <p className="text-2xl font-mono text-slate-200">{new Intl.NumberFormat().format(transfer.amount)} {transfer.currency}</p>
                            </div>
                             <div className="bg-slate-800/50 p-3 rounded">
                                <h4 className="text-lg text-slate-400">کمیسیون ({transfer.commission_percentage}%)</h4>
                                <p className="text-2xl font-mono text-amber-400">{new Intl.NumberFormat().format(commissionAmount)} {transfer.currency}</p>
                            </div>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded text-center">
                             <h4 className="text-xl text-slate-300">مبلغ نهایی پرداخت</h4>
                            <p className="text-4xl font-bold font-mono text-green-300">{new Intl.NumberFormat().format(finalAmountPaid)} {transfer.currency}</p>
                        </div>

                        <select value={paidFromBankAccountId} onChange={e => setPaidFromBankAccountId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="" disabled>-- پرداخت از حساب بانکی --</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder} (موجودی: {new Intl.NumberFormat().format(b.balance)})</option>)}
                        </select>
                        
                        <input value={destinationAccountNumber} onChange={e => setDestinationAccountNumber(e.target.value)} placeholder="شماره حساب / کارت مقصد" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <input value={executionReceiptSerial} onChange={e => setExecutionReceiptSerial(persianToEnglishNumber(e.target.value))} placeholder="شماره سریال رسید پرداخت" required type="text" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                             <input value={executionDestinationCardDigits} onChange={e => setExecutionDestinationCardDigits(persianToEnglishNumber(e.target.value))} placeholder="چهار رقم آخر کارت مقصد" required type="text" maxLength={4} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال اجرا...' : 'تایید و پرداخت'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default ExecuteCommissionTransferModal;