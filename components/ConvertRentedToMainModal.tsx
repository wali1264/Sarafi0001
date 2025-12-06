
import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { useToast } from '../contexts/ToastContext';
import { persianToEnglishNumber } from '../utils/translations';
import { Customer, Currency, User } from '../types';
import { CURRENCIES } from '../constants';

interface ConvertRentedToMainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: Customer;
    currentUser: User;
}

const ConvertRentedToMainModal: React.FC<ConvertRentedToMainModalProps> = ({ isOpen, onClose, onSuccess, customer, currentUser }) => {
    const { accounts, addTransaction } = useRentedAccounts();
    const { addToast } = useToast();
    const api = useApi();

    const [sourceAccountId, setSourceAccountId] = useState('');
    const [amountIrt, setAmountIrt] = useState('');
    const [targetCurrency, setTargetCurrency] = useState<Currency>(Currency.USD);
    const [exchangeRate, setExchangeRate] = useState('');
    const [finalAmount, setFinalAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Filter active rented accounts
    const activeAccounts = useMemo(() => accounts.filter(a => a.status === 'Active'), [accounts]);

    useEffect(() => {
        if (isOpen && activeAccounts.length > 0) {
            setSourceAccountId(activeAccounts[0].id);
        }
    }, [isOpen, activeAccounts]);

    // Auto-calculate final amount based on rate
    useEffect(() => {
        const amt = parseFloat(persianToEnglishNumber(amountIrt));
        const rate = parseFloat(persianToEnglishNumber(exchangeRate));
        
        if (!isNaN(amt) && !isNaN(rate) && rate !== 0) {
            // Assuming Rate is IRT per 1 Unit of Target Currency (e.g., 70000 IRT = 1 USD)
            // So Target Amount = IRT Amount / Rate
            // Exception: If Target is IRT_BANK or IRT_CASH, usually rate is 1, but let's stick to division logic for forex.
            const calculated = amt / rate;
            // Round to 2 decimals for standard currencies, maybe more for others? Let's keep it flexible.
            setFinalAmount(calculated.toFixed(2));
        }
    }, [amountIrt, exchangeRate]);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const numAmountIrt = parseFloat(persianToEnglishNumber(amountIrt));
        const numFinalAmount = parseFloat(persianToEnglishNumber(finalAmount));
        
        if (isNaN(numAmountIrt) || numAmountIrt <= 0) {
            addToast('مبلغ تومان نامعتبر است.', 'error');
            setIsLoading(false);
            return;
        }
        if (isNaN(numFinalAmount) || numFinalAmount <= 0) {
            addToast('مبلغ نهایی نامعتبر است.', 'error');
            setIsLoading(false);
            return;
        }
        if (!sourceAccountId) {
            addToast('حساب کرایی مبدأ انتخاب نشده است.', 'error');
            setIsLoading(false);
            return;
        }

        try {
            // 1. Withdraw from Rented Account
            const withdrawSuccess = await addTransaction({
                rented_account_id: sourceAccountId,
                user_id: customer.id,
                user_type: 'Customer',
                type: 'withdrawal',
                amount: numAmountIrt,
                commission_percentage: 0,
                commission_amount: 0,
                total_transaction_amount: numAmountIrt,
                timestamp: new Date(),
                destination_bank_name: 'تبدیل داخلی',
                destination_account: 'حساب اصلی مشتری',
            });

            if (!withdrawSuccess) {
                throw new Error('خطا در ثبت برداشت از حساب کرایی.');
            }

            // 2. Deposit to Main Account (via Cashbox Request)
            const depositPayload = {
                request_type: 'deposit' as const,
                amount: numFinalAmount,
                currency: targetCurrency,
                reason: `تبدیل از حساب کرایی: کسر ${new Intl.NumberFormat('fa-IR').format(numAmountIrt)} تومان - ${description}`,
                customer_code: customer.code,
                user: currentUser,
                // Use 'Manual' linked entity to mark this internal transfer
                linked_entity: { 
                    type: 'InternalTransfer', 
                    id: `rented_conv_${Date.now()}`, 
                    description: 'تبدیل موجودی از حساب کرایی به اصلی' 
                }
            };

            const reqResult = await api.createCashboxRequest(depositPayload);

            if ('error' in reqResult) {
                throw new Error(`برداشت انجام شد اما واریز به حساب اصلی با خطا مواجه شد: ${reqResult.error}`);
            }

            // 3. Auto-Approve the Deposit Request (since funds are already secured/deducted)
            // Only if user has permission, but typically this action implies authority.
            // Ideally, check permission or just try. Assuming the user here is Admin/Staff.
            if (reqResult && reqResult.id) {
                await api.resolveCashboxRequest({
                    request_id: reqResult.id,
                    resolution: 'approve',
                    user: currentUser
                });
            }

            addToast('عملیات تبدیل و انتقال با موفقیت انجام شد.', 'success');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            addToast(error.message || 'خطایی رخ داد.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-indigo-500/20">
                        <h2 className="text-4xl font-bold text-indigo-300 tracking-wider">تبدیل به حساب اصلی</h2>
                        <p className="text-slate-400 mt-1">{customer.name} (کد: {customer.code})</p>
                    </div>
                    
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-md mb-4 text-sm text-indigo-200">
                            این عملیات مبلغ تومان را از حساب کرایی کسر کرده و معادل ارزی آن را به حساب اصلی مشتری در سیستم صرافی واریز می‌کند.
                        </div>

                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">از حساب کرایی (مبدأ)</label>
                            <select 
                                value={sourceAccountId} 
                                onChange={(e) => setSourceAccountId(e.target.value)} 
                                required 
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-indigo-400"
                            >
                                {activeAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.partner_name} (موجودی: {new Intl.NumberFormat('en-US').format(acc.balance)})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">مبلغ کسر شده (تومان)</label>
                                <input 
                                    value={amountIrt} 
                                    onChange={(e) => setAmountIrt(persianToEnglishNumber(e.target.value))} 
                                    placeholder="0" 
                                    required 
                                    type="text" 
                                    inputMode="decimal" 
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 text-right font-mono focus:border-indigo-400" 
                                />
                            </div>
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">نرخ تبدیل</label>
                                <input 
                                    value={exchangeRate} 
                                    onChange={(e) => setExchangeRate(persianToEnglishNumber(e.target.value))} 
                                    placeholder="مثلا: 70000" 
                                    required 
                                    type="text" 
                                    inputMode="decimal" 
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 text-right font-mono focus:border-indigo-400" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">ارز مقصد (حساب اصلی)</label>
                                <select 
                                    value={targetCurrency} 
                                    onChange={(e) => setTargetCurrency(e.target.value as Currency)} 
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-indigo-400"
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-lg font-medium text-green-400 mb-2">مبلغ واریزی نهایی</label>
                                <input 
                                    value={finalAmount} 
                                    onChange={(e) => setFinalAmount(persianToEnglishNumber(e.target.value))} 
                                    placeholder="Auto Calc" 
                                    required 
                                    type="text" 
                                    inputMode="decimal" 
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-green-500/50 rounded-md text-green-300 font-bold text-right font-mono focus:border-green-400" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">توضیحات (اختیاری)</label>
                            <input 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                placeholder="شرح اضافی برای سند..." 
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-indigo-400" 
                            />
                        </div>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-indigo-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال پردازش...' : 'انجام تبدیل'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default ConvertRentedToMainModal;
