import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateDomesticTransferPayload, Currency, User, PartnerAccount, Customer } from '../types';
import { CURRENCIES, AFGHANISTAN_PROVINCES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface CreateOutgoingTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; type?: string; inputMode?: "decimal" | "text"; required?: boolean; disabled?: boolean; }> = 
({ label, name, value, onChange, placeholder, type = 'text', inputMode = 'text', required = true, disabled = false }) => (
    <div className="relative">
        <label htmlFor={name} className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            inputMode={inputMode}
            disabled={disabled}
            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300 disabled:bg-slate-800 disabled:cursor-not-allowed"
        />
    </div>
);

const CreateOutgoingTransferModal: React.FC<CreateOutgoingTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        senderName: '',
        senderTazkereh: '',
        receiverName: '',
        receiverTazkereh: '',
        amount: '',
        currency: Currency.USD,
        commission: '',
        destinationProvince: '',
        partnerSarraf: '',
        isCashPayment: true,
        customerIdentifier: '',
    });
    const [allPartners, setAllPartners] = useState<PartnerAccount[]>([]);
    const [filteredPartners, setFilteredPartners] = useState<PartnerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    const [balanceWarning, setBalanceWarning] = useState<string | null>(null);

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
        if (!formData.isCashPayment && formData.customerIdentifier) {
            checkCustomer(formData.customerIdentifier);
        } else {
            setCustomerInfo(null);
        }
    }, [formData.customerIdentifier, formData.isCashPayment, checkCustomer]);

    useEffect(() => {
        if (!formData.isCashPayment && customerInfo) {
            setFormData(prev => ({
                ...prev,
                senderName: customerInfo.name,
                senderTazkereh: '-', // Placeholder as it's not relevant for customer accounts
            }));
        }
    }, [customerInfo, formData.isCashPayment]);


    useEffect(() => {
        if (formData.isCashPayment || !customerInfo) {
            setBalanceWarning(null);
            return;
        }

        const amount = parseFloat(formData.amount) || 0;
        const commission = parseFloat(formData.commission) || 0;
        const totalDeduction = amount + commission;
        const currency = formData.currency as Currency;
        const balance = customerInfo.balances[currency] || 0;

        if (totalDeduction > 0) {
            if (balance < totalDeduction) {
                if (balance < 0) {
                     setBalanceWarning(`هشدار: این مشتری در حال حاضر ${new Intl.NumberFormat('fa-IR').format(Math.abs(balance))} ${currency} بدهکار است. با ثبت این حواله، بدهی او افزایش خواهد یافت.`);
                } else {
                    setBalanceWarning(`توجه: موجودی ${currency} این مشتری کافی نیست. با ثبت این حواله، مشتری بدهکار خواهد شد.`);
                }
            } else {
                setBalanceWarning(null);
            }
        } else {
             setBalanceWarning(null);
        }

    }, [customerInfo, formData.amount, formData.commission, formData.currency, formData.isCashPayment]);
    
    useEffect(() => {
        if (isOpen) {
            const fetchPartners = async () => {
                const partnersData = await api.getPartnerAccounts();
                setAllPartners(partnersData.filter(p => p.status === 'Active'));
            };
            fetchPartners();
        } else {
            setFormData({
                senderName: '', senderTazkereh: '', receiverName: '', receiverTazkereh: '',
                amount: '', currency: Currency.USD, commission: '', destinationProvince: '',
                partnerSarraf: '', isCashPayment: true, customerIdentifier: '',
            });
            setFilteredPartners([]);
            setBalanceWarning(null);
            setCustomerInfo(null);
        }
    }, [isOpen, api]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        }
        else if (name === 'isCashPayment') {
             setFormData(prev => ({ ...prev, [name]: value === 'true' }));
        } else {
            const numericFields = ['amount', 'commission'];
            if (numericFields.includes(name)) {
                setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
    };
    
    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProvince = e.target.value;
        setFormData(prev => ({
            ...prev,
            destinationProvince: selectedProvince,
            partnerSarraf: '' // Reset partner when province changes
        }));

        const partnersInProvince = allPartners.filter(p => p.province === selectedProvince);
        setFilteredPartners(partnersInProvince);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        if (!formData.isCashPayment && !customerInfo) {
            addToast("لطفاً یک مشتری معتبر انتخاب کنید.", 'error');
            setIsLoading(false);
            return;
        }

        const payload: CreateDomesticTransferPayload = {
            sender_name: formData.senderName,
            sender_tazkereh: formData.senderTazkereh,
            receiver_name: formData.receiverName,
            receiver_tazkereh: formData.receiverTazkereh,
            amount: parseFloat(formData.amount) || 0,
            commission: parseFloat(formData.commission) || 0,
            currency: formData.currency as Currency,
            destination_province: formData.destinationProvince,
            partner_sarraf: formData.partnerSarraf,
            is_cash_payment: formData.isCashPayment,
            customer_code: formData.isCashPayment ? undefined : customerInfo?.code,
            partner_reference: undefined, // Explicitly undefined for outgoing
            user: currentUser,
        };

        const result = await api.createDomesticTransfer(payload);

        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            const successMessage = formData.isCashPayment
                ? "درخواست حواله به صندوق ارسال شد."
                : "حواله خروجی با موفقیت ثبت شد.";
            addToast(successMessage, 'success');
            onSuccess();
        }
    };

    const isSenderInfoDisabled = !formData.isCashPayment && !!customerInfo;

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت حواله خروجی (برای مشتری)</h2>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-3 text-right tracking-wider">نوع پرداخت</label>
                            <div className="flex gap-x-6 bg-slate-900/50 border-2 border-slate-600/50 p-2 rounded-md">
                               <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${formData.isCashPayment ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                                   <input type="radio" name="isCashPayment" value="true" checked={formData.isCashPayment} onChange={handleChange} className="hidden" />
                                   پرداخت نقدی (مشتری گذری)
                                </label>
                                 <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${!formData.isCashPayment ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                                   <input type="radio" name="isCashPayment" value="false" checked={!formData.isCashPayment} onChange={handleChange} className="hidden" />
                                   کسر از حساب مشتری
                                </label>
                            </div>
                        </div>

                        {!formData.isCashPayment && (
                             <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md animate-fadeIn">
                                <InputField name="customerIdentifier" label="کد یا نام مشتری" value={formData.customerIdentifier} onChange={handleChange} placeholder="کد یا نام مشتری ثبت شده را وارد کنید" required={!formData.isCashPayment} />
                                {isCheckingCustomer && <p className="text-sm text-slate-400 mt-2">در حال بررسی...</p>}
                                {customerInfo && !isCheckingCustomer && <p className="text-sm text-green-400 mt-2">✓ مشتری: {customerInfo.name} (کد: {customerInfo.code})</p>}
                                {customerInfo === null && formData.customerIdentifier && !isCheckingCustomer && <p className="text-sm text-red-400 mt-2">مشتری با این کد یا نام یافت نشد.</p>}
                                {balanceWarning && !isCheckingCustomer && <p className="text-md text-yellow-300 font-bold mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">{balanceWarning}</p>}
                             </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputField name="senderName" label="نام فرستنده" value={formData.senderName} onChange={handleChange} placeholder="مثلا: احمد احمدی" disabled={isSenderInfoDisabled} />
                           <InputField name="senderTazkereh" label="شماره تذکره فرستنده" value={formData.senderTazkereh} onChange={handleChange} placeholder="123456789" disabled={isSenderInfoDisabled}/>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputField name="receiverName" label="نام گیرنده" value={formData.receiverName} onChange={handleChange} placeholder="مثلا: محمود محمودی" />
                           <InputField name="receiverTazkereh" label="شماره تذکره گیرنده" value={formData.receiverTazkereh} onChange={handleChange} placeholder="987654321" />
                        </div>
                        <hr className="border-cyan-400/20" />
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField name="amount" label="مبلغ" value={formData.amount} onChange={handleChange} placeholder="1000" type="text" inputMode="decimal" />
                            <div>
                                <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">واحد پولی</label>
                                <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {CURRENCIES.filter(c => c !== Currency.IRT_BANK).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <InputField name="commission" label="کارمزد" value={formData.commission} onChange={handleChange} placeholder="20" type="text" inputMode="decimal" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="destinationProvince" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">ولایت مقصد</label>
                                <select 
                                    id="destinationProvince" 
                                    name="destinationProvince" 
                                    value={formData.destinationProvince} 
                                    onChange={handleProvinceChange} 
                                    required 
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
                                >
                                    <option value="" disabled>-- انتخاب ولایت --</option>
                                    {AFGHANISTAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="partnerSarraf" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">صراف همکار</label>
                                <select 
                                    id="partnerSarraf" 
                                    name="partnerSarraf" 
                                    value={formData.partnerSarraf} 
                                    onChange={handleChange} 
                                    required 
                                    disabled={!formData.destinationProvince}
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300 disabled:bg-slate-800 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>{formData.destinationProvince ? '-- انتخاب همکار --' : 'ابتدا ولایت را انتخاب کنید'}</option>
                                    {filteredPartners.length > 0 ? (
                                        filteredPartners.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                                    ) : (
                                        formData.destinationProvince && <option value="" disabled>هیچ همکاری در این ولایت یافت نشد</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} 
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                             style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت حواله خروجی'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOutgoingTransferModal;