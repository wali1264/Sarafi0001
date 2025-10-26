import React, { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateExpensePayload, Currency, User, ExpenseCategory } from '../types';
import { CURRENCIES } from '../constants';
import { expenseCategoryTranslations, persianToEnglishNumber } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        category: ExpenseCategory.Other,
        amount: '',
        currency: Currency.USD,
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
             setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload: CreateExpensePayload = {
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            currency: formData.currency as Currency,
            category: formData.category as ExpenseCategory,
            user: currentUser,
        };

        const result = await api.createExpense(payload);

        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("درخواست مصرف به صندوق ارسال شد.", 'success');
            setFormData({
                category: ExpenseCategory.Other,
                amount: '',
                currency: Currency.USD,
                description: '',
            });
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت مصرف جدید</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="category" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">دسته‌بندی</label>
                                <select id="category" name="category" value={formData.category} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {Object.values(ExpenseCategory).map(c => (
                                        <option key={c} value={c}>{expenseCategoryTranslations[c]}</option>
                                    ))}
                                </select>
                            </div>
                           
                            <div>
                                <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">مبلغ</label>
                                <input type="text" inputMode="decimal" id="amount" name="amount" value={formData.amount} onChange={handleChange} placeholder="مثلا: 500" required
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300" />
                            </div>
                        </div>

                        <div>
                             <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">واحد پولی</label>
                                <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                        </div>
                        
                        <div>
                             <label htmlFor="description" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">توضیحات</label>
                             <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="توضیحات مربوط به این هزینه..." required rows={3}
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
                             ></textarea>
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
                            {isLoading ? 'در حال ثبت...' : 'ثبت مصرف'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateExpenseModal;