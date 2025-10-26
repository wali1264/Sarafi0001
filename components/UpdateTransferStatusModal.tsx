import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, TransferStatus, UpdateTransferStatusPayload, User } from '../types';
import { statusTranslations } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface UpdateTransferStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    transfer: DomesticTransfer;
}

const UpdateTransferStatusModal: React.FC<UpdateTransferStatusModalProps> = ({ isOpen, onClose, onSuccess, currentUser, transfer }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [newStatus, setNewStatus] = useState<TransferStatus | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        // Reset status when a new transfer is selected
        setNewStatus('');
    }, [transfer]);
    
    if (!isOpen) return null;

    const availableStatuses = [
        { value: TransferStatus.Executed, label: statusTranslations[TransferStatus.Executed] },
    ].filter(status => {
        // Can only move from Unexecuted to Executed
        return transfer.status === TransferStatus.Unexecuted;
    });

    const canBeCancelled = transfer.status === TransferStatus.Unexecuted;

    const handleUpdate = async (statusToUpdate: TransferStatus) => {
        setIsLoading(true);

        const payload: UpdateTransferStatusPayload = {
            transfer_id: transfer.id,
            new_status: statusToUpdate,
            user: currentUser,
        };

        const result = await api.updateTransferStatus(payload);
        setIsLoading(false);

        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast("وضعیت حواله با موفقیت به‌روزرسانی شد.", 'success');
            onSuccess();
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!newStatus) {
            addToast("لطفاً یک وضعیت جدید انتخاب کنید.", 'error');
            return;
        }
        handleUpdate(newStatus as TransferStatus);
    };

    const handleCancelTransfer = () => {
        if (!canBeCancelled) return;

        const isCashPaidOutgoing = !transfer.customer_id && !transfer.partner_reference;
        const totalAmount = transfer.amount + transfer.commission;

        let confirmMessage = "آیا از لغو این حواله اطمینان دارید؟ این عمل قابل بازگشت نیست.";

        if (isCashPaidOutgoing) {
            confirmMessage = `آیا از لغو این حواله اطمینان دارید؟\n\nدر صورت تایید، مبلغ ${new Intl.NumberFormat('fa-IR').format(totalAmount)} ${transfer.currency} به صورت خودکار از صندوق کسر خواهد شد تا به مشتری بازگردانده شود.`;
        } else if (transfer.customer_id) {
             confirmMessage = `آیا از لغو این حواله اطمینان دارید؟\n\nدر صورت تایید، مبلغ ${new Intl.NumberFormat('fa-IR').format(totalAmount)} ${transfer.currency} به صورت خودکار به حساب مشتری بازگردانده خواهد شد.`;
        }
        
        if (window.confirm(confirmMessage)) {
             handleUpdate(TransferStatus.Cancelled);
        }
    };


    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">به‌روزرسانی وضعیت حواله</h2>
                        <p className="text-lg text-slate-400 font-mono mt-1">{transfer.id}</p>
                    </div>
                    <div className="p-8 space-y-6">
                        
                        <div className="text-xl">
                            <span className="font-medium text-slate-400">وضعیت فعلی: </span>
                            <span className="font-bold text-slate-100">{statusTranslations[transfer.status]}</span>
                        </div>

                        <div>
                            <label htmlFor="newStatus" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">وضعیت جدید</label>
                            <select 
                                id="newStatus"
                                name="newStatus"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as TransferStatus)}
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
                                disabled={availableStatuses.length === 0}
                            >
                                <option value="" disabled>-- انتخاب کنید --</option>
                                {availableStatuses.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            {availableStatuses.length === 0 && (
                                <p className="text-base text-yellow-400 mt-2">این حواله به وضعیت نهایی خود رسیده است.</p>
                            )}
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-between items-center">
                        <button 
                            type="button" 
                            onClick={handleCancelTransfer} 
                            disabled={!canBeCancelled || isLoading}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            لغو حواله
                        </button>
                        <div className="space-x-4 space-x-reverse">
                            <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">بستن</button>
                            <button type="submit" disabled={isLoading || availableStatuses.length === 0} 
                                    className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                        boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                    }}>
                                {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateTransferStatusModal;