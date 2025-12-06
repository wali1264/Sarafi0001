import React, { useState, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { CreatePartnerPayload, Currency, User } from '../types';
import { CURRENCIES, AFGHANISTAN_PROVINCES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface AddPartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        province: AFGHANISTAN_PROVINCES[0],
        whatsappNumber: ''
    });
    
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const payload: CreatePartnerPayload = {
            name: formData.name,
            province: formData.province,
            whatsapp_number: formData.whatsappNumber,
            user: currentUser,
        };

        const result = await api.createPartner(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("همکار جدید با موفقیت ثبت شد.", 'success');
            onSuccess();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت همکار جدید</h2>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
                        <div>
                             <label htmlFor="name" className="block text-lg font-medium text-cyan-300 mb-2">نام کامل همکار</label>
                            <input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleFormChange}
                                placeholder="مثلا: صرافی اعتماد - هرات"
                                required
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="province" className="block text-lg font-medium text-cyan-300 mb-2">ولایت</label>
                                <select id="province" name="province" value={formData.province} onChange={handleFormChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    {AFGHANISTAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="whatsappNumber" className="block text-lg font-medium text-cyan-300 mb-2">شماره واتس‌اپ</label>
                                <input id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleFormChange} placeholder="+93799123456" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left font-mono" />
                            </div>
                        </div>
                         <p className="text-yellow-400 text-base pt-4 border-t border-cyan-400/20">
                            توجه: همکار با موجودی صفر ثبت خواهد شد. برای ثبت موجودی اولیه، لطفاً از بخش «حساب همکاران» و گزینه «دریافت وجه از همکار» استفاده کنید.
                        </p>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            {isLoading ? 'در حال ثبت...' : 'ثبت همکار'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default AddPartnerModal;
