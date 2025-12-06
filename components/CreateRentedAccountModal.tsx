
import React, { useState, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { useToast } from '../contexts/ToastContext';

interface CreateRentedAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateRentedAccountModal: React.FC<CreateRentedAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { addAccount } = useRentedAccounts();
    const { addToast } = useToast();
    
    const [partnerName, setPartnerName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        await addAccount({
            partner_name: partnerName,
            bank_name: bankName,
            account_holder: accountHolder,
            account_number: accountNumber,
            card_number: cardNumber || undefined,
            status: status,
        });

        setIsLoading(false);
        // Toast is now handled inside addAccount
        onSuccess();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
         <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">افزودن حساب کرایی جدید</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="نام صاحب اصلی حساب (کرایه از)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="نام صاحب حساب در بانک (صرافی)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="نام بانک (مثلا: ملت)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="شماره حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                            <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="شماره کارت (اختیاری)" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">وضعیت</label>
                            <select value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                <option value="Active">فعال</option>
                                <option value="Inactive">غیرفعال</option>
                            </select>
                        </div>
                    </div>
                     <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ایجاد...' : 'ایجاد حساب'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default CreateRentedAccountModal;
      