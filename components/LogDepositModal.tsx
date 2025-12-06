
import React, { useState, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import { useDedicatedAccounts } from '../contexts/DedicatedAccountContext';
import { useToast } from '../contexts/ToastContext';
import { persianToEnglishNumber } from '../utils/translations';

interface LogDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accountId: string;
}

const LogDepositModal: React.FC<LogDepositModalProps> = ({ isOpen, onClose, onSuccess, accountId }) => {
    const { addTransaction } = useDedicatedAccounts();
    const { addToast } = useToast();

    const [amount, setAmount] = useState('');
    const [sourceBank, setSourceBank] = useState('');
    const [sourceAccount, setSourceAccount] = useState('');
    const [sourceCardDigits, setSourceCardDigits] = useState('');
    const [receiptSerial, setReceiptSerial] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
            type: 'deposit',
            amount: numericAmount,
            commission_amount: 0,
            total_deducted: numericAmount,
            timestamp: new Date(),
            source_bank: sourceBank,
            source_account: sourceAccount,
            source_card_last_digits: sourceCardDigits,
            receipt_serial: receiptSerial,
        });

        setIsLoading(false);
        addToast('واریزی با موفقیت ثبت شد.', 'success');
        onSuccess();
    };
    
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-green-500/30 shadow-[0_0_40px_rgba(74,222,128,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-green-500/20"><h2 className="text-4xl font-bold text-green-300 tracking-wider">ثبت واریزی جدید (رسید)</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ واریزی" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <input value={sourceBank} onChange={e => setSourceBank(e.target.value)} placeholder="نام بانک مبدأ" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <input value={sourceAccount} onChange={e => setSourceAccount(e.target.value)} placeholder="شماره حساب/کارت مبدأ" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={sourceCardDigits} onChange={e => setSourceCardDigits(e.target.value)} placeholder="۴ رقم آخر کارت" maxLength={4} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                            <input value={receiptSerial} onChange={e => setReceiptSerial(e.target.value)} placeholder="شماره سریال رسید" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        </div>
                    </div>
                     <div className="px-8 py-5 bg-black/30 border-t-2 border-green-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت واریزی'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default LogDepositModal;
