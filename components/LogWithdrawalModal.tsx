
import React, { useState, FormEvent, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useDedicatedAccounts } from '../contexts/DedicatedAccountContext';
import { useToast } from '../contexts/ToastContext';
import { persianToEnglishNumber } from '../utils/translations';

interface LogWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accountId: string;
}

const LogWithdrawalModal: React.FC<LogWithdrawalModalProps> = ({ isOpen, onClose, onSuccess, accountId }) => {
    const { addTransaction } = useDedicatedAccounts();
    const { addToast } = useToast();

    const [amount, setAmount] = useState('');
    const [commissionPercent, setCommissionPercent] = useState('');
    const [destinationAccount, setDestinationAccount] = useState('');
    const [receiptSerial, setReceiptSerial] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { commissionAmount, totalDeducted } = useMemo(() => {
        const numAmount = parseFloat(persianToEnglishNumber(amount)) || 0;
        const numPercent = parseFloat(persianToEnglishNumber(commissionPercent)) || 0;
        const comm = numAmount * (numPercent / 100);
        return {
            commissionAmount: comm,
            totalDeducted: numAmount + comm,
        };
    }, [amount, commissionPercent]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const numericAmount = parseFloat(persianToEnglishNumber(amount));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            addToast('لطفا مبلغ معتبر وارد کنید', 'error');
            setIsLoading(false);
            return;
        }

        addTransaction({
            account_id: accountId,
            type: 'withdrawal',
            amount: numericAmount,
            commission_amount: commissionAmount,
            total_deducted: totalDeducted,
            timestamp: new Date(),
            destination_account: destinationAccount,
            receipt_serial: receiptSerial,
        });

        setIsLoading(false);
        addToast('برداشتی با موفقیت ثبت شد.', 'success');
        onSuccess();
    };
    
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-red-500/20"><h2 className="text-4xl font-bold text-red-300 tracking-wider">ثبت برداشتی جدید (پرداخت)</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ برداشتی" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                            <input value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} placeholder="فیصدی کمیسیون (%)" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={destinationAccount} onChange={e => setDestinationAccount(e.target.value)} placeholder="شماره حساب/کارت مقصد" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                            <input value={receiptSerial} onChange={e => setReceiptSerial(e.target.value)} placeholder="شماره سریال رسید" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        </div>
                         <div className="p-4 border-2 border-slate-600/50 bg-slate-800/30 rounded-md text-center space-y-2">
                            <div className="flex justify-around">
                                <div>
                                    <h4 className="text-lg text-slate-400">مبلغ کمیسیون</h4>
                                    <p className="text-2xl font-mono text-amber-400">{new Intl.NumberFormat('fa-IR').format(commissionAmount)}</p>
                                </div>
                                <div>
                                    <h4 className="text-lg text-slate-400">مبلغ نهایی کسر از حساب</h4>
                                    <p className="text-2xl font-mono text-red-400">{new Intl.NumberFormat('fa-IR').format(totalDeducted)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="px-8 py-5 bg-black/30 border-t-2 border-red-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-red-500 hover:bg-red-400 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت برداشتی'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default LogWithdrawalModal;
