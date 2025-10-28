import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateCashboxRequestPayload, Currency, User, Customer, BankAccount } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface CreateCashboxRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const CreateCashboxRequestModal: React.FC<CreateCashboxRequestModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        requestType: 'withdrawal' as 'withdrawal' | 'deposit',
        amount: '',
        currency: Currency.USD,
        reason: '',
        customerIdentifier: '',
        bankAccountId: '',
        sourceAccountNumber: '',
        destinationAccountNumber: '',
    });
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    
    const isBankTransaction = formData.currency === Currency.IRT_BANK;
    
    useEffect(() => {
        if (isOpen) {
            const fetchBankAccounts = async () => {
                const accounts = await api.getBankAccounts();
                const activeIrtAccounts = accounts.filter(a => a.status === 'Active' && a.currency === Currency.IRT_BANK);
                setBankAccounts(activeIrtAccounts);
                if (activeIrtAccounts.length > 0) {
                    setFormData(prev => ({ ...prev, bankAccountId: activeIrtAccounts[0].id }));
                }
            };
            fetchBankAccounts();
        }
    }, [isOpen, api]);


    const checkCustomer = useCallback(debounce(async (query: string) => {
        if (!query) {
            setCustomerInfo(null);
            return;
        }
        setIsCheckingCustomer(true);
        const result = await api.findCustomerByCodeOrName(query);
        setCustomerInfo(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    useEffect(() => {
        checkCustomer(formData.customerIdentifier);
    }, [formData.customerIdentifier, checkCustomer]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (['amount', 'sourceAccountNumber', 'destinationAccountNumber'].includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        if(formData.customerIdentifier && !customerInfo) {
            addToast("کد یا نام مشتری وارد شده معتبر نیست.", 'error');
            setIsLoading(false);
            return;
        }
        if (isBankTransaction && !formData.bankAccountId) {
            addToast("لطفاً یک حساب بانکی برای انجام تراکنش انتخاب کنید.", 'error');
            setIsLoading(false);
            return;
        }
        const payload: CreateCashboxRequestPayload = {
            request_type: formData.requestType,
            amount: parseFloat(formData.amount) || 0,
            currency: formData.currency,
            reason: formData.reason,
            customer_code: customerInfo?.code, // Use the code from the found customer
            user: currentUser,
            bank_account_id: isBankTransaction ? formData.bankAccountId : undefined,
            source_account_number: isBankTransaction && formData.requestType === 'deposit' ? formData.sourceAccountNumber : undefined,
            destination_account_number: isBankTransaction && formData.requestType === 'withdrawal' ? formData.destinationAccountNumber : undefined,
        };

        const result = await api.createCashboxRequest(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست با موفقیت ثبت شد.", 'success');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت رسید/برد جدید</h2></div>
                    <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="requestType" className="block text-lg font-medium text-cyan-300 mb-2">نوع تراکنش</label>
                                <select name="requestType" value={formData.requestType} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    <option value="withdrawal">{isBankTransaction ? 'برد (پرداخت بانکی)' : 'برد (برداشت نقدی)'}</option>
                                    <option value="deposit">{isBankTransaction ? 'رسید (دریافت بانکی)' : 'رسید (واریز نقدی)'}</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2">مبلغ</label>
                                <input type="text" inputMode="decimal" name="amount" value={formData.amount} onChange={handleChange} placeholder="5000" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        {isBankTransaction && (
                            <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md space-y-4 animate-fadeIn">
                                <h4 className="text-xl font-bold text-cyan-300">جزئیات تراکنش بانکی</h4>
                                {formData.requestType === 'deposit' ? (
                                    <>
                                        <input name="sourceAccountNumber" value={formData.sourceAccountNumber} onChange={handleChange} placeholder="شماره حساب/کارت مبدأ (فرستنده)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                        <select name="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                            <option value="" disabled>-- واریز به حساب بانکی ما --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder}</option>)}
                                        </select>
                                    </>
                                ) : ( // withdrawal
                                    <>
                                        <select name="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                            <option value="" disabled>-- برداشت از حساب بانکی ما --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder} (موجودی: {new Intl.NumberFormat().format(b.balance)})</option>)}
                                        </select>
                                        <input name="destinationAccountNumber" value={formData.destinationAccountNumber} onChange={handleChange} placeholder="شماره حساب/کارت مقصد (گیرنده)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                    </>
                                )}
                            </div>
                        )}

                        <div>
                            <label htmlFor="customerIdentifier" className="block text-lg font-medium text-cyan-300 mb-2">کد یا نام مشتری (اختیاری)</label>
                            <input type="text" name="customerIdentifier" value={formData.customerIdentifier} onChange={handleChange} placeholder="کد یا بخشی از نام مشتری را وارد کنید..." className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال بررسی...</p>}
                            {customerInfo && <p className="text-sm text-green-400 mt-1">✓ مشتری یافت شد: {customerInfo.name} (کد: {customerInfo.code})</p>}
                            {customerInfo === null && formData.customerIdentifier && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری با این کد یا نام یافت نشد.</p>}
                             <p className="text-sm text-yellow-400 mt-2">توجه: وارد کردن کد مشتری باعث ثبت این تراکنش در دفتر حساب او خواهد شد.</p>
                        </div>
                        <div>
                            <label htmlFor="reason" className="block text-lg font-medium text-cyan-300 mb-2">شرح / توضیحات</label>
                            <textarea name="reason" value={formData.reason} onChange={handleChange} placeholder="توضیحات مربوط به تراکنش..." required rows={3} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت تراکنش'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCashboxRequestModal;