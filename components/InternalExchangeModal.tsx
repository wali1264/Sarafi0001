
import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { InternalCustomerExchangePayload, Currency, User, Customer } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface InternalExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    customer: Customer;
}

const InternalExchangeModal: React.FC<InternalExchangeModalProps> = ({ isOpen, onClose, onSuccess, currentUser, customer }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        fromAmount: '',
        fromCurrency: (Object.keys(customer.balances).find(c => (customer.balances[c as Currency] || 0) > 0) as Currency) || CURRENCIES[0],
        toCurrency: CURRENCIES[1] || CURRENCIES[0],
        rate: '',
    });
    
    // New state for calculation mode: true = Multiply (X), false = Divide (/)
    const [isMultiply, setIsMultiply] = useState(true);
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Ensure 'from' and 'to' currencies are different
        if (formData.fromCurrency === formData.toCurrency) {
            const newToCurrency = CURRENCIES.find(c => c !== formData.fromCurrency) || CURRENCIES[0];
            setFormData(prev => ({ ...prev, toCurrency: newToCurrency }));
        }
    }, [formData.fromCurrency, formData.toCurrency]);


    const toAmount = useMemo(() => {
        const from = parseFloat(formData.fromAmount);
        const rate = parseFloat(formData.rate);
        if (!isNaN(from) && !isNaN(rate) && from > 0 && rate > 0) {
            if (isMultiply) {
                return (from * rate).toFixed(2);
            } else {
                return (from / rate).toFixed(2);
            }
        }
        return '0.00';
    }, [formData.fromAmount, formData.rate, isMultiply]);

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            fromAmount: '',
            fromCurrency: (Object.keys(customer.balances).find(c => (customer.balances[c as Currency] || 0) > 0) as Currency) || CURRENCIES[0],
            toCurrency: CURRENCIES[1] || CURRENCIES[0],
            rate: '',
        });
        setIsMultiply(true); // Reset to default multiply mode
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['fromAmount', 'rate'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Calculate the effective rate to store in DB
        // If dividing, the mathematical rate is 1 / inputRate
        const inputRate = parseFloat(formData.rate) || 0;
        const effectiveRate = isMultiply ? inputRate : (inputRate !== 0 ? 1 / inputRate : 0);

        // FIX: Changed payload keys to snake_case to match the API definition.
        const payload: InternalCustomerExchangePayload = {
            customer_id: customer.id,
            from_currency: formData.fromCurrency as Currency,
            from_amount: parseFloat(formData.fromAmount) || 0,
            to_currency: formData.toCurrency as Currency,
            to_amount: parseFloat(toAmount) || 0,
            rate: effectiveRate, // Send the effective mathematical rate
            user: currentUser,
        };
        
        if(payload.from_amount <= 0 || payload.to_amount <= 0) {
            addToast("مبالغ باید بزرگتر از صفر باشند.", 'error');
            setIsLoading(false);
            return;
        }

        const result = await api.performInternalCustomerExchange(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("تبدیل ارز با موفقیت انجام شد.", 'success');
            onSuccess();
            handleClose();
        }
    };
    
    // FIX: Fix for TS error on line 107. Explicitly cast value to Number to handle 'unknown' type.
    const availableFromCurrencies = Object.entries(customer.balances)
        .filter(([, balance]) => (Number(balance) || 0) > 0)
        .map(([currency]) => currency as Currency);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">تبدیل ارز داخلی حساب</h2>
                        <p className="text-lg text-slate-400 mt-1">{customer.name}</p>
                    </div>
                    
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <p className="text-base text-yellow-400">این عملیات فقط موجودی حساب مشتری را تغییر می‌دهد و بر موجودی صندوق یا حساب‌های بانکی صرافی تأثیری ندارد (چون تبادله به صورت فیزیکی خارج از سیستم انجام شده است).</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">از واحد پولی</label>
                                <select name="fromCurrency" value={formData.fromCurrency} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {availableFromCurrencies.length > 0 ? (
                                        availableFromCurrencies.map(c => <option key={c} value={c}>{c}</option>)
                                    ) : (
                                        <option disabled>موجودی مثبت یافت نشد</option>
                                    )}
                                </select>
                                <span className="text-sm text-slate-400">موجودی: {new Intl.NumberFormat().format(customer.balances[formData.fromCurrency as Currency] || 0)}</span>
                            </div>
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">مبلغ تبدیل</label>
                                <input name="fromAmount" value={formData.fromAmount} onChange={handleChange} placeholder="0.00" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300 font-mono" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">به واحد پولی</label>
                                <select name="toCurrency" value={formData.toCurrency} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">نرخ تبادله</label>
                                <div className="relative">
                                    <input 
                                        name="rate" 
                                        value={formData.rate} 
                                        onChange={handleChange} 
                                        placeholder="0.00" 
                                        required 
                                        type="text" 
                                        inputMode="decimal" 
                                        className="w-full text-xl px-3 py-2 pl-12 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300 font-mono" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsMultiply(!isMultiply)}
                                        className={`absolute left-1 top-1 bottom-1 px-3 rounded flex items-center justify-center transition-colors ${isMultiply ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-amber-500 text-slate-900 hover:bg-amber-400'}`}
                                        title={isMultiply ? "حالت ضرب (پیش‌فرض)" : "حالت تقسیم (فعال)"}
                                    >
                                        {isMultiply ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12.75H5a.75.75 0 0 1 0-1.5h14a.75.75 0 0 1 0 1.5Zm0-6.75H5a.75.75 0 0 1 0-1.5h14a.75.75 0 0 1 0 1.5Zm0 13.5H5a.75.75 0 0 1 0-1.5h14a.75.75 0 0 1 0 1.5Z" /><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
                                        )}
                                    </button>
                                </div>
                                <span className="text-xs text-slate-400 mt-1 block">
                                    {isMultiply ? 'حالت محاسبه: ضرب (مبلغ × نرخ)' : 'حالت محاسبه: تقسیم (مبلغ ÷ نرخ)'}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 border-2 border-green-500/30 bg-green-500/10 rounded-md text-center">
                            <h4 className="text-lg text-slate-300">مبلغ دریافتی مشتری:</h4>
                            <p className="text-3xl font-bold font-mono text-green-300">{new Intl.NumberFormat().format(parseFloat(toAmount))} {formData.toCurrency}</p>
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال اجرا...' : 'اجرای تبدیل'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default InternalExchangeModal;
