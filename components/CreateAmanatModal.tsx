import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateAmanatPayload, Currency, User, BankAccount } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface CreateAmanatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const CreateAmanatModal: React.FC<CreateAmanatModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        customerName: '',
        amount: '',
        currency: Currency.USD,
        notes: '',
        bankAccountId: '',
    });
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const isBankTransaction = formData.currency === Currency.IRT_BANK;

    useEffect(() => {
        if (isOpen) {
            api.getBankAccounts().then(accounts => {
                const activeIrtAccounts = accounts.filter(a => a.status === 'Active' && a.currency === Currency.IRT_BANK);
                setBankAccounts(activeIrtAccounts);
                if (activeIrtAccounts.length > 0) {
                    setFormData(prev => ({ ...prev, bankAccountId: activeIrtAccounts[0].id }));
                }
            });
        }
    }, [isOpen, api]);


    if (!isOpen) return null;
    
    const resetForm = () => {
        setFormData({
            customerName: '',
            amount: '',
            currency: Currency.USD,
            notes: '',
            bankAccountId: bankAccounts.find(b => b.currency === Currency.IRT_BANK)?.id || '',
        });
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // FIX: Changed payload keys to snake_case to match the API definition.
        const payload: CreateAmanatPayload = {
            customer_name: formData.customerName,
            amount: parseFloat(formData.amount) || 0,
            currency: formData.currency,
            notes: formData.notes,
            user: currentUser,
            bank_account_id: isBankTransaction ? formData.bankAccountId : undefined,
        };

        const result = await api.createAmanat(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست ثبت امانت به صندوق ارسال شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت امانت جدید</h2></div>
                    <div className="p-8 space-y-6">
                        
                        <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            placeholder="نام مشتری"
                            required
                            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2">مبلغ</label>
                                <input type="text" inputMode="decimal" id="amount" name="amount" value={formData.amount} onChange={handleChange} placeholder="5000" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                             <div>
                                <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                                <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                         {isBankTransaction && (
                            <div className="animate-fadeIn">
                                <label htmlFor="bankAccountId" className="block text-lg font-medium text-cyan-300 mb-2">واریز به حساب بانکی</label>
                                <select id="bankAccountId" name="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required={isBankTransaction} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                                    <option value="" disabled>-- انتخاب حساب --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label htmlFor="notes" className="block text-lg font-medium text-cyan-300 mb-2">یادداشت</label>
                            <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} placeholder="توضیحات مربوط به امانت..." required rows={3} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>
                        <p className="text-yellow-400 text-base">توجه: با ثبت این امانت، یک درخواست واریز به صندوق (یا حساب بانکی) به صورت خودکار ایجاد خواهد شد.</p>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت امانت'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAmanatModal;