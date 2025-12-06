
import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { UpdateCustomerPayload, Customer, User, CustomerTransaction, Currency } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: Customer;
    currentUser: User;
}

interface OpeningBalanceRow {
    transactionId?: string; // If undefined, it's a new row (not yet saved)
    amount: string;
    currency: Currency;
    type: 'credit' | 'debit';
    isDeleted?: boolean; // For UI state tracking
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, onSuccess, customer, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    
    // Basic Info State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        whatsappNumber: '',
    });

    // Opening Balance State
    const [openingBalances, setOpeningBalances] = useState<OpeningBalanceRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingOB, setIsLoadingOB] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                code: customer.code,
                whatsappNumber: customer.whatsapp_number || '',
            });
            fetchOpeningBalances();
        }
    }, [customer]);

    const fetchOpeningBalances = async () => {
        setIsLoadingOB(true);
        const txs = await api.getOpeningBalanceTransactions(customer.id);
        const rows: OpeningBalanceRow[] = txs.map(tx => ({
            transactionId: tx.id,
            amount: String(tx.amount),
            currency: tx.currency,
            type: tx.type, // 'credit' (deposit/rasid) or 'debit' (withdrawal/bard)
        }));
        setOpeningBalances(rows);
        setIsLoadingOB(false);
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Opening Balance Handlers ---

    const addOpeningBalanceRow = () => {
        setOpeningBalances(prev => [
            ...prev,
            {
                amount: '',
                currency: Currency.USD,
                type: 'credit', // Default to credit (Rasid/Asset from customer perspective is liability for us? No wait. 
                                // In CustomerTransaction: credit = deposit = Liability for Sarrafi (We owe them). 
                                // debit = withdrawal = Asset for Sarrafi (They owe us).
                                // Let's keep labels consistent with Create Modal: "رسید (طلب)" vs "برد (بدهی)"
            }
        ]);
    };

    const updateOpeningBalanceRow = (index: number, field: keyof OpeningBalanceRow, value: any) => {
        setOpeningBalances(prev => prev.map((row, i) => {
            if (i === index) {
                if (field === 'amount') {
                    return { ...row, [field]: persianToEnglishNumber(value) };
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const removeOpeningBalanceRow = (index: number) => {
        const row = openingBalances[index];
        if (row.transactionId) {
            // Mark for deletion if it exists in DB
            setOpeningBalances(prev => prev.map((r, i) => i === index ? { ...r, isDeleted: true } : r));
        } else {
            // Just remove from state if it's new
            setOpeningBalances(prev => prev.filter((_, i) => i !== index));
        }
    };

    // --- Submission ---

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // 1. Update Basic Info
        const payload: UpdateCustomerPayload = { 
            id: customer.id, 
            name: formData.name,
            code: formData.code,
            whatsapp_number: formData.whatsappNumber,
            user: currentUser 
        };
        
        const customerResult = await api.updateCustomer(payload);
        if ('error' in customerResult) {
            addToast(customerResult.error, 'error');
            setIsLoading(false);
            return;
        }

        // 2. Process Opening Balances
        const errors: string[] = [];
        
        for (const row of openingBalances) {
            // Handle Deleted Rows
            if (row.isDeleted) {
                if (row.transactionId) {
                    const delResult = await api.deleteOpeningBalance({
                        transactionId: row.transactionId,
                        customerId: customer.id,
                        user: currentUser
                    });
                    if (!delResult.success) errors.push(`خطا در حذف موجودی ${row.currency}: ${delResult.error}`);
                }
                continue;
            }

            // Handle New or Updated Rows
            const numAmount = parseFloat(row.amount);
            if (!numAmount || numAmount <= 0) {
                // Ignore empty or invalid rows unless it was an update to 0? 
                // We'll enforce > 0. If they want 0, they should delete.
                continue; 
            }

            // Optimization: If it has ID and nothing changed, skip? 
            // Hard to tell without deep comparison. Safe to Upsert.
            
            const upsertResult = await api.upsertOpeningBalance({
                transactionId: row.transactionId,
                customerId: customer.id,
                currency: row.currency,
                amount: numAmount,
                type: row.type,
                user: currentUser
            });

            if (!upsertResult.success) {
                errors.push(`خطا در ذخیره موجودی ${row.currency}: ${upsertResult.error}`);
            }
        }

        setIsLoading(false);
        if (errors.length > 0) {
            addToast("اطلاعات اصلی ویرایش شد اما برخی موجودی‌ها ثبت نشدند:\n" + errors.join('\n'), 'error');
        } else {
            addToast("اطلاعات مشتری و موجودی‌های اولیه با موفقیت ویرایش شد.", 'success');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)] flex flex-col max-h-[90vh]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ویرایش کامل اطلاعات مشتری</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
                    <div className="p-8 space-y-6 flex-grow overflow-y-auto">
                        
                        {/* Basic Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">اطلاعات هویتی</h3>
                            <div>
                                <label htmlFor="name" className="block text-lg font-medium text-cyan-300 mb-2">اسم مشتری</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="code" className="block text-lg font-medium text-cyan-300 mb-2">کد مشتری</label>
                                    <input type="text" id="code" name="code" value={formData.code} onChange={handleChange} required
                                        className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                                </div>
                                <div>
                                    <label htmlFor="whatsappNumber" className="block text-lg font-medium text-cyan-300 mb-2">شماره واتس‌اپ</label>
                                    <input type="text" id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} required
                                        className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left font-mono" />
                                </div>
                            </div>
                        </div>

                        {/* Opening Balance Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <h3 className="text-xl font-bold text-slate-200">تنظیم موجودی اول دوره (طلب سابقه)</h3>
                                <button type="button" onClick={addOpeningBalanceRow} className="text-sm bg-cyan-600/30 text-cyan-300 px-3 py-1 rounded hover:bg-cyan-600/50 transition-colors">
                                    + افزودن ارز جدید
                                </button>
                            </div>
                            
                            {isLoadingOB ? (
                                <p className="text-center text-slate-400">در حال بارگذاری سوابق...</p>
                            ) : openingBalances.filter(r => !r.isDeleted).length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-700 rounded">
                                    هیچ موجودی اولیه‌ای (طلب سابقه) برای این مشتری ثبت نشده است.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {openingBalances.map((row, index) => {
                                        if (row.isDeleted) return null;
                                        return (
                                            <div key={index} className="bg-slate-800/30 p-4 rounded-md border border-slate-700 flex flex-wrap gap-4 items-center">
                                                <div className="w-32 flex-shrink-0">
                                                    <select 
                                                        value={row.type} 
                                                        onChange={(e) => updateOpeningBalanceRow(index, 'type', e.target.value)}
                                                        className={`w-full text-lg p-2 rounded-md border-2 focus:outline-none ${row.type === 'credit' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}
                                                    >
                                                        <option value="credit">رسید (طلب مشتری)</option>
                                                        <option value="debit">برد (بدهی مشتری)</option>
                                                    </select>
                                                </div>

                                                <div className="flex-grow min-w-[120px]">
                                                    <input 
                                                        type="text" 
                                                        inputMode="decimal"
                                                        placeholder="مبلغ"
                                                        value={row.amount}
                                                        onChange={(e) => updateOpeningBalanceRow(index, 'amount', e.target.value)}
                                                        className="w-full text-lg p-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white focus:border-cyan-400 font-mono"
                                                    />
                                                </div>

                                                <div className="w-28 flex-shrink-0">
                                                    <select 
                                                        value={row.currency} 
                                                        onChange={(e) => updateOpeningBalanceRow(index, 'currency', e.target.value)}
                                                        className="w-full text-lg p-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white focus:border-cyan-400"
                                                    >
                                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>

                                                <button type="button" onClick={() => removeOpeningBalanceRow(index)} className="text-red-400 hover:text-red-300 p-2 ml-auto" title="حذف این موجودی">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-xs text-yellow-500/80 mt-2">
                                * تغییر در موجودی اول دوره مستقیماً روی مانده حساب مشتری تأثیر می‌گذارد، اما تراکنشی در صندوق ایجاد نمی‌کند.
                            </p>
                        </div>

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse flex-shrink-0">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} 
                                className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105 disabled:opacity-50"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                }}>
                            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCustomerModal;
