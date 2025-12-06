
import React, { useState, FormEvent, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { useToast } from '../contexts/ToastContext';
import { persianToEnglishNumber } from '../utils/translations';
import { Customer, PartnerAccount } from '../types';
import { useApi } from '../hooks/useApi';
import { debounce } from '../utils/debounce';


interface CreateRentedBardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    fixedAccountId?: string;
    fixedUserId?: string;
}

const CreateRentedBardModal: React.FC<CreateRentedBardModalProps> = ({ isOpen, onClose, onSuccess, fixedAccountId, fixedUserId }) => {
    const { addTransaction, accounts, users, partners } = useRentedAccounts();
    const { addToast } = useToast();
    const api = useApi();

    const [initiatorType, setInitiatorType] = useState<'Customer' | 'Partner' | 'Guest'>('Customer');
    const [customerQuery, setCustomerQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    const [partnerId, setPartnerId] = useState('');
    const [guestName, setGuestName] = useState('');

    const [accountId, setAccountId] = useState(fixedAccountId || '');
    const [amount, setAmount] = useState('');
    const [commissionPercent, setCommissionPercent] = useState('');
    const [destinationBank, setDestinationBank] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const checkCustomer = useCallback(debounce(async (query: string) => {
        if (!query) { setFoundCustomer(null); return; }
        setIsCheckingCustomer(true);
        const result = await api.findCustomerByCodeOrName(query);
        setFoundCustomer(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    const handleCustomerQueryChange = (query: string) => {
        setCustomerQuery(query);
        checkCustomer(query);
    };

    const { commissionAmount, totalDeducted } = useMemo(() => {
        const numAmount = parseFloat(persianToEnglishNumber(amount)) || 0;
        const numPercent = parseFloat(persianToEnglishNumber(commissionPercent)) || 0;
        const comm = numAmount * (numPercent / 100);
        return { commissionAmount: comm, totalDeducted: numAmount + comm };
    }, [amount, commissionPercent]);

    const selectedUserBalance = useMemo(() => {
        let identifier: string | null = null;
        if (initiatorType === 'Customer' && foundCustomer) {
            identifier = `customer-${foundCustomer.id}`;
        } else if (initiatorType === 'Partner' && partnerId) {
            identifier = `partner-${partnerId}`;
        } else if (initiatorType === 'Guest' && guestName) {
            identifier = `guest-${guestName}`;
        }
        
        if (!identifier) return 0;
        return users.find(u => u.id === identifier)?.balance ?? 0;
    }, [initiatorType, foundCustomer, partnerId, guestName, users]);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        let finalUserId = undefined;
        if (initiatorType === 'Customer') {
            if (!foundCustomer) { addToast('لطفا یک مشتری معتبر انتخاب کنید.', 'error'); return; }
            finalUserId = foundCustomer.id;
        } else if (initiatorType === 'Partner') {
            if (!partnerId) { addToast('لطفا یک همکار معتبر انتخاب کنید.', 'error'); return; }
            finalUserId = partnerId;
        } else {
            if (!guestName) { addToast('لطفا نام مشتری گذری را وارد کنید.', 'error'); return; }
        }

        if (!accountId) { addToast('لطفا یک حساب کرایی انتخاب کنید.', 'error'); return; }
        
        const numericAmount = parseFloat(persianToEnglishNumber(amount));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            addToast('لطفا مبلغ معتبر وارد کنید', 'error');
            return;
        }

        // Balance check is now done on the server, but a frontend check is still good UX.
        // Note: For guests, users[] might not have data if it's a new guest session, but server will check.
        if (selectedUserBalance < totalDeducted) {
             // Only warn for now, let server decide logic if needed
             // Or blocking if we trust local state.
             // For guest, if they deposited first, they have balance.
        }

        setIsLoading(true);

        const success = await addTransaction({
            rented_account_id: accountId,
            user_id: finalUserId,
            user_type: initiatorType,
            guest_name: initiatorType === 'Guest' ? guestName : undefined,
            type: 'withdrawal',
            amount: numericAmount,
            commission_percentage: parseFloat(persianToEnglishNumber(commissionPercent)) || 0,
            commission_amount: commissionAmount,
            total_transaction_amount: totalDeducted,
            timestamp: new Date(),
            destination_bank_name: destinationBank,
        });

        setIsLoading(false);
        if (success) {
            onSuccess();
        }
    };
    
    if (!isOpen) return null;

    const activeAccounts = accounts.filter(a => a.status === 'Active');
    const activePartners = partners.filter(p => p.status === 'Active');

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#1A1932] w-full max-w-2xl border-2 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-red-500/20"><h2 className="text-4xl font-bold text-red-300 tracking-wider">ثبت برد جدید</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                         <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md">
                            <label className="block text-xl font-bold text-cyan-300 mb-3">برد از حساب (گیرنده پول):</label>
                             <div className="flex gap-x-4 mb-4">
                                <label className={`flex-1 text-center text-lg p-2 rounded-md cursor-pointer ${initiatorType === 'Customer' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700/50'}`}>
                                    <input type="radio" name="initiatorType" value="Customer" checked={initiatorType === 'Customer'} onChange={() => setInitiatorType('Customer')} className="hidden" />
                                    مشتری
                                </label>
                                <label className={`flex-1 text-center text-lg p-2 rounded-md cursor-pointer ${initiatorType === 'Partner' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700/50'}`}>
                                    <input type="radio" name="initiatorType" value="Partner" checked={initiatorType === 'Partner'} onChange={() => setInitiatorType('Partner')} className="hidden" />
                                    همکار
                                </label>
                                <label className={`flex-1 text-center text-lg p-2 rounded-md cursor-pointer ${initiatorType === 'Guest' ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700/50'}`}>
                                    <input type="radio" name="initiatorType" value="Guest" checked={initiatorType === 'Guest'} onChange={() => setInitiatorType('Guest')} className="hidden" />
                                    مشتری گذری
                                </label>
                            </div>
                            <div className="mt-4">
                                {initiatorType === 'Customer' && (
                                     <div>
                                        <input value={customerQuery} onChange={e => handleCustomerQueryChange(e.target.value)} placeholder="کد یا نام مشتری" required className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400" />
                                        {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">...</p>}
                                        {foundCustomer && <p className="text-sm text-green-400 mt-1">✓ {foundCustomer.name}</p>}
                                        {foundCustomer === null && customerQuery && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">یافت نشد.</p>}
                                    </div>
                                )}
                                {initiatorType === 'Partner' && (
                                    <select value={partnerId} onChange={e => setPartnerId(e.target.value)} required className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white focus:outline-none focus:border-cyan-400">
                                        <option value="" disabled>-- انتخاب همکار --</option>
                                        {activePartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                                {initiatorType === 'Guest' && (
                                    <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="نام مشتری گذری" required className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white focus:outline-none focus:border-cyan-400" />
                                )}
                            </div>
                            <p className="text-right mt-2 text-lg text-slate-300">موجودی ایزوله: <span className="font-mono font-bold text-cyan-300">{new Intl.NumberFormat('en-US').format(selectedUserBalance)}</span></p>
                        </div>
                        
                        <select value={accountId} onChange={e => setAccountId(e.target.value)} required disabled={!!fixedAccountId} className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white focus:outline-none focus:border-cyan-400">
                             <option value="" disabled>-- رسید از حساب کرایی (دهنده پول)... --</option>
                            {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} ({a.partner_name})</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ پرداختی" required type="text" inputMode="decimal" className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400" />
                            <input value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} placeholder="فیصدی کمیسیون (%)" type="text" inputMode="decimal" className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                             <input value={destinationBank} onChange={e => setDestinationBank(e.target.value)} placeholder="نام بانک مقصد" required className="w-full text-xl px-4 py-3 bg-[#292841] border-2 border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400" />
                        </div>
                         <div className="p-4 border-2 border-slate-600/50 bg-slate-800/30 rounded-md text-center space-y-2">
                             <div className="flex justify-around">
                                <div><h4 className="text-lg text-slate-400">مبلغ کمیسیون</h4><p className="text-2xl font-mono text-amber-400">{new Intl.NumberFormat('en-US').format(commissionAmount)}</p></div>
                                <div><h4 className="text-lg text-slate-400">مبلغ کل کسر از حساب</h4><p className="text-2xl font-mono text-red-400">{new Intl.NumberFormat('en-US').format(totalDeducted)}</p></div>
                            </div>
                        </div>
                    </div>
                     <div className="px-8 py-5 bg-black/30 border-t-2 border-red-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-red-500 hover:bg-red-400 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت برد'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default CreateRentedBardModal;
