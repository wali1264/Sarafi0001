import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { LogCommissionTransferPayload, Currency, User, BankAccount, PartnerAccount, Customer } from '../types';
import { AFGHANISTAN_PROVINCES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface LogCommissionTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const LogCommissionTransferModal: React.FC<LogCommissionTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [initiatorType, setInitiatorType] = useState<'Customer' | 'Partner'>('Customer');
    const [customerQuery, setCustomerQuery] = useState('');
    const [province, setProvince] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [amount, setAmount] = useState('');
    const [sourceAccountNumber, setSourceAccountNumber] = useState('');
    const [receiptSerial, setReceiptSerial] = useState('');
    const [sourceCardLastDigits, setSourceCardLastDigits] = useState('');
    const [receivedIntoBankAccountId, setReceivedIntoBankAccountId] = useState('');
    const [commissionPercentage, setCommissionPercentage] = useState('');

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

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

    const handleCustomerQueryChange = (query: string) => {
        setCustomerQuery(query);
        checkCustomer(query);
    };

    const filteredPartners = partners.filter(p => p.province === province);
    const filteredBankAccounts = bankAccounts.filter(b => b.currency === Currency.IRT_BANK);


    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                const [accountsData, partnersData] = await Promise.all([
                    api.getBankAccounts(),
                    api.getPartnerAccounts(),
                ]);
                const activeAccounts = accountsData.filter(a => a.status === 'Active');
                setBankAccounts(activeAccounts);
                setPartners(partnersData.filter(p => p.status === 'Active'));

                const defaultBankAccount = activeAccounts.find(b => b.currency === Currency.IRT_BANK);
                if (defaultBankAccount) {
                    setReceivedIntoBankAccountId(defaultBankAccount.id);
                }
            };
            fetchData();
        }
    }, [isOpen, api]);

    useEffect(() => {
        // Reset partner selection when province changes
        setPartnerId('');
    }, [province]);

    if (!isOpen) return null;
    
    const resetForm = () => {
        setInitiatorType('Customer');
        setCustomerQuery('');
        setProvince('');
        setPartnerId('');
        setAmount('');
        setSourceAccountNumber('');
        setReceiptSerial('');
        setSourceCardLastDigits('');
        setReceivedIntoBankAccountId('');
        setCommissionPercentage('');
        setCustomerInfo(null);
        setIsCheckingCustomer(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        if (initiatorType === 'Customer' && !customerInfo) {
            addToast("کد یا نام مشتری وارد شده معتبر نیست.", 'error');
            setIsLoading(false);
            return;
        }

        const payload: LogCommissionTransferPayload = {
            initiator_type: initiatorType,
            customer_code: initiatorType === 'Customer' ? customerInfo?.code : undefined,
            partner_id: initiatorType === 'Partner' ? partnerId : undefined,
            amount: parseFloat(persianToEnglishNumber(amount)) || 0,
            source_account_number: sourceAccountNumber,
            received_into_bank_account_id: receivedIntoBankAccountId,
            commission_percentage: parseFloat(persianToEnglishNumber(commissionPercentage)) || 0,
            receipt_serial: receiptSerial,
            source_card_last_digits: sourceCardLastDigits,
            user: currentUser,
        };

        const result = await api.logCommissionTransfer(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست ورود وجه به صندوق ارسال شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ورودی مشخصات پرنت حساب بانکی</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                        <div className="flex gap-x-6 bg-slate-900/50 border-2 border-slate-600/50 p-2 rounded-md">
                           <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${initiatorType === 'Customer' ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                               <input type="radio" name="initiatorType" value="Customer" checked={initiatorType === 'Customer'} onChange={() => setInitiatorType('Customer')} className="hidden" />
                               از طرف مشتری
                            </label>
                             <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${initiatorType === 'Partner' ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                               <input type="radio" name="initiatorType" value="Partner" checked={initiatorType === 'Partner'} onChange={() => setInitiatorType('Partner')} className="hidden" />
                               از طرف همکار
                            </label>
                        </div>
                        
                        {initiatorType === 'Customer' ? (
                            <div>
                                <input value={customerQuery} onChange={e => handleCustomerQueryChange(e.target.value)} placeholder="کد یا نام مشتری" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                                {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال بررسی...</p>}
                                {customerInfo && <p className="text-sm text-green-400 mt-1">✓ مشتری یافت شد: {customerInfo.name} (کد: {customerInfo.code})</p>}
                                {customerInfo === null && customerQuery && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری با این کد یا نام یافت نشد.</p>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <select value={province} onChange={e => setProvince(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                                    <option value="" disabled>-- انتخاب ولایت --</option>
                                    {AFGHANISTAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select value={partnerId} onChange={e => setPartnerId(e.target.value)} required disabled={!province} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 disabled:bg-slate-800">
                                     <option value="" disabled>-- انتخاب همکار --</option>
                                     {filteredPartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input value={amount} onChange={e => setAmount(persianToEnglishNumber(e.target.value))} placeholder="مبلغ ورودی (تومان)" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input value={sourceAccountNumber} onChange={e => setSourceAccountNumber(persianToEnglishNumber(e.target.value))} placeholder="شماره حساب/کارت مبدأ" required type="text" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <input value={receiptSerial} onChange={e => setReceiptSerial(persianToEnglishNumber(e.target.value))} placeholder="شماره سریال رسید" required type="text" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                             <input value={sourceCardLastDigits} onChange={e => setSourceCardLastDigits(persianToEnglishNumber(e.target.value))} placeholder="چهار رقم آخر کارت" required type="text" maxLength={4} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        
                        <select value={receivedIntoBankAccountId} onChange={e => setReceivedIntoBankAccountId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="" disabled>-- واریز به حساب بانکی شما --</option>
                             {filteredBankAccounts.length > 0 ? (
                                filteredBankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder}</option>)
                            ) : (
                                <option disabled>هیچ حساب بانکی (IRT_BANK) یافت نشد</option>
                            )}
                        </select>
                        
                        <input value={commissionPercentage} onChange={e => setCommissionPercentage(persianToEnglishNumber(e.target.value))} placeholder="فیصدی کمیسیون (مثلا: 1.5)" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت ورود وجه'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default LogCommissionTransferModal;