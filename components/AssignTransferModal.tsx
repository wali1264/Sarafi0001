import React, { useState, FormEvent, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { User, Customer, AccountTransfer, ReassignTransferPayload } from '../types';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface AssignTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    transfer: AccountTransfer;
}

const AssignTransferModal: React.FC<AssignTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser, transfer }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [customerQuery, setCustomerQuery] = useState('');
    const [finalCustomer, setFinalCustomer] = useState<Customer | null | undefined>(undefined);
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const checkCustomer = useCallback(debounce(async (query: string) => {
        if (!query) {
            setFinalCustomer(undefined);
            return;
        }
        setIsCheckingCode(true);
        const result = await api.findCustomerByCodeOrName(query);
        setFinalCustomer(result || null);
        setIsCheckingCode(false);
    }, 500), [api]);

    const handleQueryChange = (query: string) => {
        setCustomerQuery(query);
        checkCustomer(query);
    };

    if (!isOpen) return null;
    
    const resetForm = () => {
        setCustomerQuery('');
        setFinalCustomer(undefined);
    }

    const handleClose = () => {
        resetForm();
        onClose();
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!finalCustomer) {
            addToast("لطفاً یک مشتری معتبر وارد کنید.", 'error');
            return;
        }

        setIsLoading(true);

        const payload: ReassignTransferPayload = {
            transfer_id: transfer.id,
            final_customer_code: finalCustomer.code,
            user: currentUser,
        };

        const result = await api.reassignPendingTransfer(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("حواله با موفقیت تخصیص داده شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">تخصیص حواله در انتظار</h2>
                        <p className="text-lg text-slate-400 mt-1">
                            مبلغ <span className="font-mono text-cyan-300">{new Intl.NumberFormat('fa-IR').format(transfer.amount)} {transfer.currency}</span>
                        </p>
                    </div>
                    <div className="p-8 space-y-6">
                        
                        <div>
                            <label htmlFor="customerQuery" className="block text-lg font-medium text-cyan-300 mb-2">کد یا نام مشتری نهایی</label>
                            <input 
                                type="text"
                                id="customerQuery"
                                value={customerQuery} 
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder="کد یا نام مشتری گیرنده را وارد کنید..."
                                required
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                            />
                             {isCheckingCode && <div className="text-sm text-slate-400 mt-1">در حال بررسی...</div>}
                             {finalCustomer && <div className="text-sm text-green-400 mt-1">✓ {finalCustomer.name} (کد: {finalCustomer.code})</div>}
                             {finalCustomer === null && customerQuery && !isCheckingCode && <div className="text-sm text-red-400 mt-1">مشتری یافت نشد.</div>}
                        </div>
                        <p className="text-yellow-400 text-base">با تایید، این مبلغ از حساب معلق کسر و به حساب مشتری انتخاب شده واریز خواهد شد.</p>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading || !finalCustomer} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'تایید و تخصیص'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignTransferModal;