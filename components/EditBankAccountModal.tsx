import React, { useState, FormEvent, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { UpdateBankAccountPayload, User, BankAccount } from '../types';
import { useToast } from '../contexts/ToastContext';

interface EditBankAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    bankAccount: BankAccount;
}

const EditBankAccountModal: React.FC<EditBankAccountModalProps> = ({ isOpen, onClose, onSuccess, currentUser, bankAccount }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        account_holder: '',
        bank_name: '',
        account_number: '',
        card_to_card_number: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if(bankAccount) {
            setFormData({
                account_holder: bankAccount.account_holder,
                bank_name: bankAccount.bank_name,
                account_number: bankAccount.account_number,
                card_to_card_number: bankAccount.card_to_card_number || '',
            });
        }
    }, [bankAccount]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload: UpdateBankAccountPayload = {
            id: bankAccount.id,
            account_holder: formData.account_holder,
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            card_to_card_number: formData.card_to_card_number || undefined,
            user: currentUser,
        };
        const result = await api.updateBankAccount(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("اطلاعات حساب بانکی با موفقیت ویرایش شد.", 'success');
            onSuccess();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ویرایش حساب بانکی</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <input name="account_holder" value={formData.account_holder} onChange={handleChange} placeholder="نام صاحب حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="نام بانک" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="account_number" value={formData.account_number} onChange={handleChange} placeholder="شماره حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="card_to_card_number" value={formData.card_to_card_number} onChange={handleChange} placeholder="شماره کارت (اختیاری)" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                         <p className="text-sm text-slate-400 mt-2">توجه: موجودی حساب از این بخش قابل ویرایش نیست و تنها از طریق تراکنش‌ها تغییر می‌کند.</p>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105 disabled:opacity-50">
                            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default EditBankAccountModal;
