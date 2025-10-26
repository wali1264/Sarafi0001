import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateDomesticTransferPayload, Currency, User, PartnerAccount } from '../types';
import { CURRENCIES, AFGHANISTAN_PROVINCES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface CreateIncomingTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; type?: string; inputMode?: "decimal" | "text"; required?: boolean }> = 
({ label, name, value, onChange, placeholder, type = 'text', inputMode = 'text', required = true }) => (
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
            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
        />
    </div>
);

const CreateIncomingTransferModal: React.FC<CreateIncomingTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        receiverName: '',
        receiverTazkereh: '',
        amount: '',
        currency: Currency.USD,
        destinationProvince: '',
        partnerSarraf: '',
        partnerReference: '',
    });
    const [allPartners, setAllPartners] = useState<PartnerAccount[]>([]);
    const [filteredPartners, setFilteredPartners] = useState<PartnerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            const fetchPartners = async () => {
                const partnersData = await api.getPartnerAccounts();
                setAllPartners(partnersData.filter(p => p.status === 'Active'));
            };
            fetchPartners();
        } else {
             // Reset form state when modal closes
            setFormData({
                receiverName: '', receiverTazkereh: '', amount: '', currency: Currency.USD, 
                destinationProvince: '', partnerSarraf: '', partnerReference: '',
            });
            setFilteredPartners([]);
        }
    }, [isOpen, api]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['amount'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
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

        const payload: CreateDomesticTransferPayload = {
            sender_name: formData.partnerSarraf, // For incoming, sender is the partner
            sender_tazkereh: '-', // Placeholder as it's not relevant
            receiver_name: formData.receiverName,
            receiver_tazkereh: formData.receiverTazkereh,
            amount: parseFloat(formData.amount) || 0,
            commission: 0, // No commission for incoming transfers between partners
            currency: formData.currency as Currency,
            destination_province: formData.destinationProvince,
            partner_sarraf: formData.partnerSarraf,
            partner_reference: formData.partnerReference,
            is_cash_payment: false, // This value is ignored by the DB function when partner_reference is set, but kept for type consistency.
            user: currentUser,
        };

        const result = await api.createDomesticTransfer(payload);

        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("حواله ورودی با موفقیت ثبت شد.", 'success');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-amber-500/30 shadow-[0_0_40px_rgba(234,179,8,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-amber-500/20">
                        <h2 className="text-4xl font-bold text-amber-300 tracking-wider">ثبت حواله ورودی (از طرف همکار)</h2>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="destinationProvince" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">ولایت مبدا (همکار)</label>
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
                                <label htmlFor="partnerSarraf" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">صراف همکار (فرستنده)</label>
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
                        <hr className="border-cyan-400/20" />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputField name="receiverName" label="نام گیرنده" value={formData.receiverName} onChange={handleChange} placeholder="مثلا: محمود محمودی" />
                           <InputField name="receiverTazkereh" label="شماره تذکره گیرنده" value={formData.receiverTazkereh} onChange={handleChange} placeholder="987654321" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField name="amount" label="مبلغ" value={formData.amount} onChange={handleChange} placeholder="1000" type="text" inputMode="decimal" />
                            <div>
                                <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">واحد پولی</label>
                                <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {CURRENCIES.filter(c => c !== Currency.IRT_BANK).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <InputField name="partnerReference" label="کد رهگیری همکار (اجباری)" value={formData.partnerReference} onChange={handleChange} placeholder="کد ارائه شده توسط همکار" required={true} />
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-amber-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} 
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                             style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(234, 179, 8, 0.5)'
                            }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت حواله ورودی'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateIncomingTransferModal;