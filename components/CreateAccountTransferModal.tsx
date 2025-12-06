import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateAccountTransferPayload, Currency, User, Customer } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

const SUSPENSE_ACCOUNT_CODE = 'SUSPENSE';

interface CreateAccountTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const CustomerField: React.FC<{
    label: string;
    query: string;
    customer: Customer | null | undefined; // undefined for initial, null for not found
    onQueryChange: (query: string) => void;
    isLoading: boolean;
    disabled?: boolean;
}> = ({ label, query, customer, onQueryChange, isLoading, disabled = false }) => (
    <div>
        <label className="block text-lg font-medium text-cyan-300 mb-2">{label}</label>
        <input 
            type="text" 
            value={query} 
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="کد یا نام مشتری..."
            required
            disabled={disabled}
            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
        />
        {isLoading && <div className="text-sm text-slate-400 mt-1">در حال بررسی...</div>}
        {customer && <div className="text-sm text-green-400 mt-1">✓ {customer.name} (کد: {customer.code})</div>}
        {customer === null && query && !isLoading && <div className="text-sm text-red-400 mt-1">مشتری یافت نشد.</div>}
    </div>
);


const CreateAccountTransferModal: React.FC<CreateAccountTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [isPendingAssignment, setIsPendingAssignment] = useState(false);
    const [fromCustomer, setFromCustomer] = useState<Customer | null | undefined>(undefined);
    const [toCustomer, setToCustomer] = useState<Customer | null | undefined>(undefined);
    const [fromLoading, setFromLoading] = useState(false);
    const [toLoading, setToLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.USD);
    const [description, setDescription] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const checkCustomer = useCallback(debounce(async (query: string, setter: React.Dispatch<React.SetStateAction<Customer | null | undefined>>, loadingSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
        if (!query) {
            setter(undefined);
            return;
        }
        loadingSetter(true);
        const result = await api.findCustomerByCodeOrName(query);
        setter(result || null);
        loadingSetter(false);
    }, 500), [api]);

    useEffect(() => {
        if(isPendingAssignment) {
            setToQuery(SUSPENSE_ACCOUNT_CODE);
            checkCustomer(SUSPENSE_ACCOUNT_CODE, setToCustomer, setToLoading);
        } else {
            setToQuery('');
            setToCustomer(undefined);
        }
    }, [isPendingAssignment, checkCustomer]);

    const handleFromChange = (query: string) => {
        setFromQuery(query);
        checkCustomer(query, setFromCustomer, setFromLoading);
    }
    const handleToChange = (query: string) => {
        setToQuery(query);
        checkCustomer(query, setToCustomer, setToLoading);
    }

    if (!isOpen) return null;
    
    const resetForm = () => {
        setFromQuery('');
        setToQuery('');
        setIsPendingAssignment(false);
        setFromCustomer(undefined);
        setToCustomer(undefined);
        setAmount('');
        setCurrency(Currency.USD);
        setDescription('');
    }

    const handleClose = () => {
        resetForm();
        onClose();
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!fromCustomer || !toCustomer) {
            addToast("لطفا از صحت اطلاعات مشتری مبدا و مقصد اطمینان حاصل کنید.", 'error');
            return;
        }

        setIsLoading(true);

        const payload: CreateAccountTransferPayload = {
            from_customer_code: fromCustomer.code,
            to_customer_code: toCustomer.code,
            amount: parseFloat(persianToEnglishNumber(amount)) || 0,
            currency,
            description,
            user: currentUser,
            is_pending_assignment: isPendingAssignment,
        };

        const result = await api.createAccountTransfer(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("انتقال با موفقیت ثبت شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">انتقال وجه بین دو حساب</h2></div>
                    <div className="p-8 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CustomerField label="برد از حساب:" query={fromQuery} customer={fromCustomer} onQueryChange={handleFromChange} isLoading={fromLoading} />
                            <CustomerField label="رسید به حساب:" query={toQuery} customer={toCustomer} onQueryChange={handleToChange} isLoading={toLoading} disabled={isPendingAssignment} />
                        </div>

                        <div className="flex items-center">
                             <input type="checkbox" id="isPendingAssignment" checked={isPendingAssignment} onChange={e => setIsPendingAssignment(e.target.checked)} className="w-5 h-5 rounded bg-slate-700 border-slate-500 text-cyan-400 focus:ring-cyan-500" />
                             <label htmlFor="isPendingAssignment" className="mr-3 text-lg text-slate-200">گیرنده نامشخص است (ارسال به حساب معلق)</label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">مبلغ</label>
                                <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(persianToEnglishNumber(e.target.value))} placeholder="5000" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">شرح / توضیحات</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="توضیحات مربوط به انتقال..." required rows={3} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading || !fromCustomer || !toCustomer} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت انتقال'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAccountTransferModal;