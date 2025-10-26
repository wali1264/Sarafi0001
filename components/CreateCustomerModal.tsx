

import React, { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateCustomerPayload, Currency, User } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const api = useApi();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        whatsappNumber: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ name: '', code: '', whatsappNumber: '' });
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!user || user.userType !== 'internal') {
            addToast("Authentication error. Please log in again.", 'error');
            setIsLoading(false);
            return;
        }

        const payload: CreateCustomerPayload = { 
            name: formData.name,
            code: formData.code,
            whatsapp_number: formData.whatsappNumber,
            user 
        };
        const result = await api.createCustomer(payload);

        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("مشتری جدید با موفقیت ثبت شد.", 'success');
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت مشتری جدید</h2></div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        
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
                        <p className="text-yellow-400 text-base pt-4 border-t border-cyan-400/20">
                            توجه: مشتری با موجودی صفر ثبت خواهد شد. برای ثبت موجودی اولیه، لطفاً از بخش «صندوق» یک تراکنش «رسید» برای این مشتری ثبت کنید.
                        </p>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} 
                                className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت مشتری'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerModal;