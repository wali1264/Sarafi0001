import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { PayToPartnerPayload, ReceiveFromPartnerPayload, User, PartnerAccount, Currency, BankAccount } from '../types';
import { persianToEnglishNumber } from '../utils/translations';
import { CURRENCIES } from '../constants';
import { useToast } from '../contexts/ToastContext';

interface PartnerSettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    partner: PartnerAccount;
    type: 'receive' | 'pay';
}

const PartnerSettlementModal: React.FC<PartnerSettlementModalProps> = ({ isOpen, onClose, onSuccess, currentUser, partner, type }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
    const [bankAccountId, setBankAccountId] = useState('');
    const [sourceAccountNumber, setSourceAccountNumber] = useState('');
    const [destinationAccountNumber, setDestinationAccountNumber] = useState('');
    
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const isBankTransaction = currency === Currency.IRT_BANK;
    
    useEffect(() => {
        if (isOpen && isBankTransaction) {
            const fetchBankAccounts = async () => {
                const accounts = await api.getBankAccounts();
                const activeIrtAccounts = accounts.filter(a => a.status === 'Active' && a.currency === Currency.IRT_BANK);
                setBankAccounts(activeIrtAccounts);
                if (activeIrtAccounts.length > 0) {
                    setBankAccountId(activeIrtAccounts[0].id);
                }
            };
            fetchBankAccounts();
        }
    }, [isOpen, isBankTransaction, api]);

    if (!isOpen) return null;

    const isReceive = type === 'receive';
    const modalTitle = isReceive ? "دریافت وجه از همکار" : "پرداخت وجه به همکار";
    const amountLabel = isReceive ? "مبلغ دریافتی" : "مبلغ پرداختی";
    const buttonText = isReceive ? "ثبت دریافت" : "ثبت پرداخت";
    const buttonColor = isReceive ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (['amount', 'sourceAccountNumber', 'destinationAccountNumber'].includes(name)) {
             const setter = {
                amount: setAmount,
                sourceAccountNumber: setSourceAccountNumber,
                destinationAccountNumber: setDestinationAccountNumber,
            }[name];
            setter(persianToEnglishNumber(value));
        } else if (name === 'currency') {
            setCurrency(value as Currency);
        } else if (name === 'bankAccountId') {
            setBankAccountId(value);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const numericAmount = parseFloat(amount) || 0;
        if (numericAmount <= 0) {
            addToast("مبلغ باید یک عدد مثبت باشد.", 'error');
            setIsLoading(false);
            return;
        }
        if (isBankTransaction && !bankAccountId) {
            addToast("لطفاً یک حساب بانکی برای انجام تراکنش انتخاب کنید.", 'error');
            setIsLoading(false);
            return;
        }

        let result;
        if (isReceive) {
            const payload: ReceiveFromPartnerPayload = {
                partner_id: partner.id,
                amount: numericAmount,
                currency: currency,
                user: currentUser,
                bank_account_id: isBankTransaction ? bankAccountId : undefined,
                source_account_number: isBankTransaction ? sourceAccountNumber : undefined,
            };
            result = await api.receiveFromPartner(payload);
        } else {
            const payload: PayToPartnerPayload = {
                partner_id: partner.id,
                amount: numericAmount,
                currency: currency,
                user: currentUser,
                bank_account_id: isBankTransaction ? bankAccountId : undefined,
                destination_account_number: isBankTransaction ? destinationAccountNumber : undefined,
            };
            result = await api.payToPartner(payload);
        }

        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست تسویه حساب به صندوق ارسال شد.", 'success');
            setAmount('');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">{modalTitle}</h2>
                        <p className="text-lg text-slate-400 mt-1">برای {partner.name}</p>
                    </div>
                    <div className="p-8 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2">
                                    {amountLabel}
                                </label>
                                <input type="text" id="amount" name="amount" value={amount} onChange={handleChange} placeholder="مبلغ را وارد کنید" required inputMode="decimal"
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"/>
                            </div>
                            <div>
                                <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                                <select id="currency" name="currency" value={currency} onChange={handleChange}
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {isBankTransaction && (
                             <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md space-y-4 animate-fadeIn">
                                 <h4 className="text-xl font-bold text-cyan-300">جزئیات تراکنش بانکی</h4>
                                {isReceive ? (
                                     <>
                                        <input name="sourceAccountNumber" value={sourceAccountNumber} onChange={handleChange} placeholder="شماره حساب/کارت مبدأ (همکار)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                        <select name="bankAccountId" value={bankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                            <option value="" disabled>-- واریز به حساب بانکی ما --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder}</option>)}
                                        </select>
                                    </>
                                ) : ( // Pay
                                    <>
                                        <select name="bankAccountId" value={bankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                            <option value="" disabled>-- برداشت از حساب بانکی ما --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder} (موجودی: {new Intl.NumberFormat().format(b.balance)})</option>)}
                                        </select>
                                        <input name="destinationAccountNumber" value={destinationAccountNumber} onChange={handleChange} placeholder="شماره حساب/کارت مقصد (همکار)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                    </>
                                )}
                            </div>
                        )}

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} 
                                className={`px-8 py-3 text-xl font-bold tracking-wider text-slate-900 ${buttonColor} focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                }}>
                            {isLoading ? 'در حال ثبت...' : buttonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PartnerSettlementModal;