
import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateCustomerPayload, Currency, User, CreateCashboxRequestPayload, BankAccount } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface InitialBalanceRow {
    id: number;
    type: 'deposit' | 'withdrawal';
    amount: string;
    currency: Currency;
    bankAccountId: string; // Only relevant for IRT_BANK
    isOpeningBalance: boolean; // NEW: Checkbox state for bypassing cashbox
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const api = useApi();
    const { user } = useAuth();
    const { addToast } = useToast();
    
    // Basic Customer Info
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        whatsappNumber: '',
    });

    // Initial Balances State
    const [initialBalances, setInitialBalances] = useState<InitialBalanceRow[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch active bank accounts for the dropdown
            api.getBankAccounts().then(accounts => {
                setBankAccounts(accounts.filter(a => a.status === 'Active' && a.currency === Currency.IRT_BANK));
            });
        }
    }, [isOpen, api]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ name: '', code: '', whatsappNumber: '' });
        setInitialBalances([]);
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // --- Initial Balance Logic ---

    const addBalanceRow = () => {
        setInitialBalances(prev => [
            ...prev,
            {
                id: Date.now(),
                type: 'deposit',
                amount: '',
                currency: Currency.USD,
                bankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
                isOpeningBalance: false,
            }
        ]);
    };

    const removeBalanceRow = (id: number) => {
        setInitialBalances(prev => prev.filter(row => row.id !== id));
    };

    const updateBalanceRow = (id: number, field: keyof InitialBalanceRow, value: any) => {
        setInitialBalances(prev => prev.map(row => {
            if (row.id === id) {
                if (field === 'amount') {
                    return { ...row, [field]: persianToEnglishNumber(value) };
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    // --- Submission ---

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!user || user.userType !== 'internal') {
            addToast("خطای احراز هویت. لطفا مجددا وارد شوید.", 'error');
            setIsLoading(false);
            return;
        }

        // 1. Create the Customer
        const customerPayload: CreateCustomerPayload = { 
            name: formData.name,
            code: formData.code,
            whatsapp_number: formData.whatsappNumber,
            user 
        };
        
        const customerResult = await api.createCustomer(customerPayload);

        if ('error' in customerResult) {
            addToast(customerResult.error, 'error');
            setIsLoading(false);
            return;
        }
        
        const customerId = customerResult.id; // We need ID for opening balance logic

        // 2. Process Initial Balances (if any)
        if (initialBalances.length > 0) {
            const errors: string[] = [];
            
            // We process them sequentially to ensure order
            for (const balance of initialBalances) {
                const amount = parseFloat(balance.amount);
                if (!amount || amount <= 0) continue; // Skip empty rows

                if (balance.isOpeningBalance) {
                    // Logic for Opening Balance (bypass Cashbox)
                    const openingBalanceResult = await api.createOpeningBalanceTransaction({
                        customerId: customerId,
                        amount: amount,
                        currency: balance.currency,
                        type: balance.type === 'deposit' ? 'credit' : 'debit', // credit = rasid (liability), debit = bard (asset)
                        user: user
                    });
                    
                    if (!openingBalanceResult.success) {
                        errors.push(`خطا در ثبت طلب سابقه ${balance.currency}: ${openingBalanceResult.error}`);
                    }

                } else {
                    // Standard Logic (via Cashbox)
                    // Validate Bank Account selection for IRT_BANK
                    if (balance.currency === Currency.IRT_BANK && !balance.bankAccountId) {
                        errors.push(`برای موجودی تومان بانکی (صندوق)، انتخاب حساب بانکی الزامی است.`);
                        continue;
                    }

                    const requestPayload: CreateCashboxRequestPayload = {
                        request_type: balance.type,
                        amount: amount,
                        currency: balance.currency,
                        reason: 'موجودی اولیه افتتاح حساب',
                        customer_code: formData.code, // Use the code we just registered
                        user: user,
                        // Link to bank account if it's IRT_BANK
                        bank_account_id: balance.currency === Currency.IRT_BANK ? balance.bankAccountId : undefined,
                    };

                    const reqResult = await api.createCashboxRequest(requestPayload);
                    if ('error' in reqResult) {
                        errors.push(`خطا در ثبت موجودی ${balance.currency} در صندوق: ${reqResult.error}`);
                    }
                }
            }

            if (errors.length > 0) {
                addToast("مشتری ایجاد شد اما برخی موجودی‌های اولیه ثبت نشدند:\n" + errors.join('\n'), 'error');
            } else {
                addToast("مشتری و موجودی‌های اولیه با موفقیت ثبت شدند.", 'success');
            }
        } else {
            addToast("مشتری جدید با موفقیت ثبت شد.", 'success');
        }

        setIsLoading(false);
        onSuccess();
        handleClose();
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)] flex flex-col max-h-[90vh]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت مشتری جدید</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
                    <div className="p-8 space-y-6 flex-grow overflow-y-auto">
                        
                        {/* Identity Section */}
                        <div>
                            <label htmlFor="name" className="block text-lg font-medium text-cyan-300 mb-2">اسم مشتری</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="مثلا: احمد جوینی" required
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="code" className="block text-lg font-medium text-cyan-300 mb-2">کد مشتری</label>
                                <input type="text" id="code" name="code" value={formData.code} onChange={handleChange} placeholder="مثلا: 001 یا 201" required
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                             <div>
                                <label htmlFor="whatsappNumber" className="block text-lg font-medium text-cyan-300 mb-2">شماره واتس‌اپ</label>
                                <input type="text" id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} placeholder="+93799123456" required
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left font-mono" />
                            </div>
                        </div>

                        <hr className="border-cyan-400/20 my-4" />

                        {/* Initial Balance Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-slate-200">موجودی‌های اولیه (اختیاری)</h3>
                                <button type="button" onClick={addBalanceRow} className="text-sm bg-cyan-600/30 text-cyan-300 px-3 py-1 rounded hover:bg-cyan-600/50 transition-colors">
                                    + افزودن موجودی
                                </button>
                            </div>

                            {initialBalances.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-2 border border-dashed border-slate-700 rounded">
                                    هیچ موجودی اولیه‌ای تعریف نشده است. (مشتری با موجودی صفر ایجاد می‌شود)
                                </p>
                            )}

                            <div className="space-y-4">
                                {initialBalances.map((row) => (
                                    <div key={row.id} className="bg-slate-800/30 p-4 rounded-md border border-slate-700 animate-fadeIn">
                                        <div className="flex flex-wrap gap-4 items-center">
                                            <div className="w-32 flex-shrink-0">
                                                <select 
                                                    value={row.type} 
                                                    onChange={(e) => updateBalanceRow(row.id, 'type', e.target.value)}
                                                    className={`w-full text-lg p-2 rounded-md border-2 focus:outline-none ${row.type === 'deposit' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}
                                                >
                                                    <option value="deposit">رسید (طلب)</option>
                                                    <option value="withdrawal">برد (بدهی)</option>
                                                </select>
                                            </div>

                                            <div className="flex-grow min-w-[120px]">
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    placeholder="مبلغ"
                                                    value={row.amount}
                                                    onChange={(e) => updateBalanceRow(row.id, 'amount', e.target.value)}
                                                    className="w-full text-lg p-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white focus:border-cyan-400"
                                                />
                                            </div>

                                            <div className="w-28 flex-shrink-0">
                                                <select 
                                                    value={row.currency} 
                                                    onChange={(e) => updateBalanceRow(row.id, 'currency', e.target.value)}
                                                    className="w-full text-lg p-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white focus:border-cyan-400"
                                                >
                                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>

                                            {/* Bank Account Selector (Only for IRT_BANK AND NOT Opening Balance) */}
                                            {!row.isOpeningBalance && row.currency === Currency.IRT_BANK && (
                                                <div className="w-48 flex-shrink-0">
                                                    <select 
                                                        value={row.bankAccountId} 
                                                        onChange={(e) => updateBalanceRow(row.id, 'bankAccountId', e.target.value)}
                                                        className="w-full text-base p-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white focus:border-cyan-400"
                                                        required
                                                    >
                                                        {bankAccounts.length === 0 && <option value="" disabled>حسابی یافت نشد</option>}
                                                        {bankAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.bank_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <button type="button" onClick={() => removeBalanceRow(row.id)} className="text-red-400 hover:text-red-300 p-2 ml-auto">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        
                                        {/* Opening Balance Checkbox Row */}
                                        <div className="mt-3 flex items-center">
                                            <label className="flex items-center cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={row.isOpeningBalance} 
                                                    onChange={(e) => updateBalanceRow(row.id, 'isOpeningBalance', e.target.checked)} 
                                                    className="hidden"
                                                />
                                                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center mr-2 transition-colors ${row.isOpeningBalance ? 'bg-amber-500 border-amber-500' : 'border-slate-500 group-hover:border-amber-400'}`}>
                                                    {row.isOpeningBalance && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className={`text-base select-none ${row.isOpeningBalance ? 'text-amber-400 font-bold' : 'text-slate-400 group-hover:text-amber-300'}`}>
                                                    ثبت به عنوان طلب سابقه (بدون درگیری صندوق)
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                    
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse flex-shrink-0">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} 
                                className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                }}>
                            {isLoading ? 'در حال پردازش...' : 'ثبت مشتری'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerModal;
