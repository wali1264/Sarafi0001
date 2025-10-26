import React, { useState, FormEvent, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { InitiateForeignExchangePayload, User, Asset } from '../types';
import { persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface InitiateExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    assets: Asset[];
}

const InitiateExchangeModal: React.FC<InitiateExchangeModalProps> = ({ isOpen, onClose, onSuccess, currentUser, assets }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        from_asset_id: '',
        from_amount: '',
        description: '',
    });
    
    const [isLoading, setIsLoading] = useState(false);
    
    const fromAsset = useMemo(() => assets.find(a => a.id === formData.from_asset_id), [assets, formData.from_asset_id]);

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({ from_asset_id: '', from_amount: '', description: '' });
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'from_amount') {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload: InitiateForeignExchangePayload = {
            description: formData.description,
            from_asset_id: formData.from_asset_id,
            from_amount: parseFloat(formData.from_amount) || 0,
            user: currentUser,
        };
        
        const result = await api.initiateForeignExchange(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست برد برای تبادله به صندوق ارسال شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">شروع تبادله جدید</h2></div>
                
                <form onSubmit={handleSubmit}>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">شرح تبادله</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="مثلا: تبدیل دالر به افغانی برای بازار" required rows={2} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>

                        <div className="p-4 border-2 border-red-500/20 bg-red-500/10 rounded-md space-y-4">
                            <h3 className="text-2xl font-bold text-red-300">برد وجه جهت تبادله</h3>
                            <div>
                                <label className="block text-lg font-medium text-slate-200 mb-2">کدام دارایی را خارج می‌کنید؟ (مبدا)</label>
                                <select name="from_asset_id" value={formData.from_asset_id} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-red-400 text-right">
                                    <option value="">-- انتخاب دارایی --</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                 <label className="block text-lg font-medium text-slate-200 mb-2">چه مبلغی خارج می‌کنید؟ ({fromAsset?.currency})</label>
                                 <input name="from_amount" value={formData.from_amount} onChange={handleChange} placeholder="0.00" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-red-400 text-right font-mono" />
                            </div>
                        </div>
                        <p className="text-yellow-400 text-base">توجه: با ثبت این فرم، یک درخواست برداشت (برد) به صندوق ارسال می‌شود. پس از تایید صندوقدار، می‌توانید مرحله بعدی (ثبت رسید) را انجام دهید.</p>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ارسال...' : 'شروع تبادله'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InitiateExchangeModal;