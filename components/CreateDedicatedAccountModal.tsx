

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { useDedicatedAccounts } from '../contexts/DedicatedAccountContext';
import { Customer, PartnerAccount } from '../types';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface CreateDedicatedAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateDedicatedAccountModal: React.FC<CreateDedicatedAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const api = useApi();
    const { addAccount } = useDedicatedAccounts();
    const { addToast } = useToast();
    
    // Form State
    const [ownerType, setOwnerType] = useState<'Customer' | 'Partner'>('Customer');
    const [customerQuery, setCustomerQuery] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [cardNumber, setCardNumber] = useState('');

    // Data & Control State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

    useEffect(() => {
        if (isOpen) {
            api.getCustomers().then(setCustomers);
            api.getPartnerAccounts().then(p => setPartners(p.filter(acc => acc.status === 'Active')));
        }
    }, [isOpen, api]);
    
    const checkCustomer = useCallback(debounce(async (query: string) => {
        if (!query) {
            setFoundCustomer(null);
            return;
        }
        setIsCheckingCustomer(true);
        const result = await api.findCustomerByCodeOrName(query);
        setFoundCustomer(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    const handleCustomerQueryChange = (query: string) => {
        setCustomerQuery(query);
        checkCustomer(query);
    };

    const handleOwnerTypeChange = (type: 'Customer' | 'Partner') => {
        setOwnerType(type);
        setCustomerQuery('');
        setFoundCustomer(null);
        setPartnerId('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        let owner_id = '';
        let owner_name = '';

        if (ownerType === 'Customer') {
            if (!foundCustomer) {
                addToast('لطفا یک مشتری معتبر انتخاب کنید.', 'error');
                setIsLoading(false);
                return;
            }
            owner_id = foundCustomer.id;
            owner_name = foundCustomer.name;
        } else { // Partner
            const selectedPartner = partners.find(p => p.id === partnerId);
            if (!selectedPartner) {
                addToast('لطفا یک همکار معتبر انتخاب کنید.', 'error');
                setIsLoading(false);
                return;
            }
            owner_id = selectedPartner.id;
            owner_name = selectedPartner.name;
        }

        // FIX: Add the 'status' property, as it is required by the 'DedicatedAccount' type.
        // New accounts should default to 'Active'.
        addAccount({
            owner_id,
            owner_type: ownerType,
            owner_name,
            bank_name: bankName,
            account_holder: accountHolder,
            account_number: accountNumber,
            card_number: cardNumber || undefined,
            status: 'Active',
        });

        setIsLoading(false);
        addToast('حساب اختصاصی با موفقیت ایجاد شد.', 'success');
        onSuccess();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
         <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ایجاد حساب اختصاصی جدید</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md">
                            <label className="block text-xl font-bold text-cyan-300 mb-3">این حساب برای چه کسی است؟</label>
                            <div className="flex gap-x-4">
                                <label className={`flex-1 text-center text-lg p-2 rounded-md cursor-pointer transition-colors ${ownerType === 'Customer' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700/50 text-slate-300'}`}>
                                    <input type="radio" name="ownerType" value="Customer" checked={ownerType === 'Customer'} onChange={() => handleOwnerTypeChange('Customer')} className="hidden" />
                                    مشتری
                                </label>
                                <label className={`flex-1 text-center text-lg p-2 rounded-md cursor-pointer transition-colors ${ownerType === 'Partner' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700/50 text-slate-300'}`}>
                                    <input type="radio" name="ownerType" value="Partner" checked={ownerType === 'Partner'} onChange={() => handleOwnerTypeChange('Partner')} className="hidden" />
                                    همکار
                                </label>
                            </div>
                            <div className="mt-4">
                                {ownerType === 'Customer' ? (
                                    <div>
                                        <input value={customerQuery} onChange={e => handleCustomerQueryChange(e.target.value)} placeholder="کد یا نام مشتری را جستجو کنید" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                                        {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال بررسی...</p>}
                                        {foundCustomer && <p className="text-sm text-green-400 mt-1">✓ مشتری یافت شد: {foundCustomer.name}</p>}
                                        {foundCustomer === null && customerQuery && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری یافت نشد.</p>}
                                    </div>
                                ) : (
                                    <select value={partnerId} onChange={e => setPartnerId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                                        <option value="" disabled>-- یک همکار را انتخاب کنید --</option>
                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>

                        <input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="نام صاحب حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="نام بانک (مثلا: ملت)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="شماره حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                            <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="شماره کارت (اختیاری)" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
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

export default CreateDedicatedAccountModal;
