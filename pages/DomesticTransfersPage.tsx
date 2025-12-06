
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, TransferStatus, User, Currency, PartnerAccount } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateOutgoingTransferModal from '../components/CreateOutgoingTransferModal';
import CreateIncomingTransferModal from '../components/CreateIncomingTransferModal';
import UpdateTransferStatusModal from '../components/UpdateTransferStatusModal';
import { statusTranslations } from '../utils/translations';
import { AFGHANISTAN_PROVINCES, CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import ProcessIncomingTransferModal from '../components/ProcessIncomingTransferModal';
import TransferPrintView from '../components/TransferPrintView';
import { supabase } from '../services/supabaseClient';
import ShareButton from '../components/ShareButton';
import { formatTrackingCode } from '../utils/idGenerator';

interface TransferPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: DomesticTransfer | null;
    partnerProvince?: string;
}

const TransferPrintPreviewModal: React.FC<TransferPrintPreviewModalProps> = ({ isOpen, onClose, transfer, partnerProvince }) => {
    const printableAreaId = useMemo(() => `printable-transfer-${transfer?.id}`, [transfer]);

    if (!isOpen || !transfer) return null;

    const handlePrint = () => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <TransferPrintView transfer={transfer} partnerProvince={partnerProvince} id={printableAreaId} />,
                container,
                () => {
                    setTimeout(() => {
                        // The print CSS will target the class, not the ID.
                        const printableElement = document.getElementById(printableAreaId);
                        if(printableElement) {
                           const tempContainer = document.createElement('div');
                           tempContainer.appendChild(printableElement.cloneNode(true));
                           document.body.appendChild(tempContainer);
                           
                           Array.from(tempContainer.children).forEach(child => {
                               if (child.classList.contains('printable-area')) {
                                   (child as HTMLElement).style.visibility = 'visible';
                               }
                           });
                           
                           window.print();
                           document.body.removeChild(tempContainer);
                        }
                         ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl h-[90vh] flex flex-col border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پیش‌نمایش چاپ رسید</h2>
                </div>
                <div className="p-8 flex-grow overflow-y-auto bg-gray-600/20">
                    <div className="bg-white rounded shadow-lg mx-auto">
                         <TransferPrintView transfer={transfer} partnerProvince={partnerProvince} id={printableAreaId} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <ShareButton printableAreaId={printableAreaId} fileName={`transfer-${transfer.id}`} />
                    <button
                        onClick={handlePrint}
                        className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}
                    >
                        چاپ نهایی
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};


const PrintIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 01-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 01-2 2" />
    </svg>
);

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);


const DomesticTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<DomesticTransfer[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const initialFilters = {
        trackingCode: '',
        senderName: '',
        receiverName: '',
        province: 'all',
        partnerSarraf: '',
        minAmount: '',
        maxAmount: '',
        currency: 'all',
        startDate: '',
        endDate: '',
    };

    const [filters, setFilters] = useState(initialFilters);
    const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);

    // Modal States
    const [isOutgoingModalOpen, setOutgoingModalOpen] = useState(false);
    const [isIncomingModalOpen, setIncomingModalOpen] = useState(false);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
    const [isPayoutModalOpen, setPayoutModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<DomesticTransfer | null>(null);
    
    const partnersMap = useMemo(() => new Map(partners.map(p => [p.name, p])), [partners]);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [transferData, partnerData] = await Promise.all([
            api.getDomesticTransfers(),
            api.getPartnerAccounts(),
        ]);
        setTransfers(transferData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setPartners(partnerData);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const channel = supabase
            .channel('domestic-transfers-page-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'domestic_transfers' }, () => fetchData())
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);
    
    const handleSuccess = () => {
        setOutgoingModalOpen(false);
        setIncomingModalOpen(false);
        setUpdateModalOpen(false);
        setPayoutModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
        setStatusFilter('all');
    };

    const handleUpdateClick = (transfer: DomesticTransfer) => {
        if (transfer.status === TransferStatus.Executed || transfer.status === TransferStatus.Cancelled || transfer.status === TransferStatus.RejectedByCashbox) {
            return;
        }
        setSelectedTransfer(transfer);
        setUpdateModalOpen(true);
    };

    const handleInitiatePrint = (transfer: DomesticTransfer) => {
        setSelectedTransfer(transfer);
        setPrintModalOpen(true);
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => {
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            
            const matchesTrackingCode = !filters.trackingCode || 
                t.id.toLowerCase().includes(filters.trackingCode.toLowerCase()) || 
                (t.partner_reference && t.partner_reference.toLowerCase().includes(filters.trackingCode.toLowerCase())) ||
                formatTrackingCode(t.created_at).includes(filters.trackingCode);
            
            const matchesSender = !filters.senderName || t.sender.name.toLowerCase().includes(filters.senderName.toLowerCase());
            const matchesReceiver = !filters.receiverName || t.receiver.name.toLowerCase().includes(filters.receiverName.toLowerCase());
            const matchesPartner = !filters.partnerSarraf || t.partner_sarraf.toLowerCase().includes(filters.partnerSarraf.toLowerCase());
            const matchesProvince = filters.province === 'all' || t.destination_province === filters.province;
            const matchesCurrency = filters.currency === 'all' || t.currency === filters.currency;

            const matchesMinAmount = !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);
            
            const createdAt = new Date(t.created_at);
            createdAt.setHours(0,0,0,0);
            
            const matchesStartDate = !filters.startDate || createdAt >= new Date(filters.startDate);
            const matchesEndDate = !filters.endDate || createdAt <= new Date(filters.endDate);


            return matchesStatus && matchesTrackingCode && matchesSender && matchesReceiver && matchesPartner &&
                   matchesProvince && matchesCurrency && matchesMinAmount && matchesMaxAmount &&
                   matchesStartDate && matchesEndDate;
        });
    }, [transfers, statusFilter, filters]);

    const getStatusStyle = (status: TransferStatus) => {
        switch (status) {
            case TransferStatus.Executed:
                return 'bg-green-500/20 text-green-300';
            case TransferStatus.Unexecuted:
                return 'bg-yellow-500/20 text-yellow-300';
            case TransferStatus.PendingCashbox:
                return 'bg-amber-500/20 text-amber-300';
            case TransferStatus.Cancelled:
            case TransferStatus.RejectedByCashbox:
                return 'bg-red-500/20 text-red-300';
            default:
                return 'bg-slate-600/20 text-slate-300';
        }
    };


    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت حواله‌جات داخلی</h1>
                <div className="flex gap-4">
                    {hasPermission('domesticTransfers', 'process') && (
                        <button onClick={() => setPayoutModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(34, 197, 94, 0.5)'}}>
                            پرداخت حواله ورودی
                        </button>
                    )}
                    {hasPermission('domesticTransfers', 'create') && (
                        <>
                            <button onClick={() => setIncomingModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(234, 179, 8, 0.5)'}}>
                                + ثبت حواله ورودی
                            </button>
                            <button onClick={() => setOutgoingModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                                + ثبت حواله خروجی
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                    <input 
                        type="text"
                        name="trackingCode"
                        placeholder="جستجو بر اساس کد رهگیری / کد همکار..."
                        value={filters.trackingCode}
                        onChange={handleFilterChange}
                        className="flex-grow text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                     <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                        <option value="all">همه وضعیت‌ها</option>
                        {Object.values(TransferStatus).map(s => <option key={s} value={s}>{statusTranslations[s as TransferStatus]}</option>)}
                    </select>
                    <button onClick={() => setAdvancedSearchOpen(prev => !prev)} className="flex items-center text-lg px-4 py-2 bg-slate-700/50 border-2 border-slate-600/50 rounded-md text-cyan-300 hover:bg-slate-700">
                        <FilterIcon />
                        {isAdvancedSearchOpen ? 'بستن جستجوی پیشرفته' : 'جستجوی پیشرفته'}
                    </button>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out ${isAdvancedSearchOpen ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" name="senderName" placeholder="نام فرستنده..." value={filters.senderName} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400" />
                        <input type="text" name="receiverName" placeholder="نام گیرنده..." value={filters.receiverName} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400" />
                        <input type="text" name="partnerSarraf" placeholder="صراف همکار..." value={filters.partnerSarraf} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400" />
                        <select name="province" value={filters.province} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ولایت‌ها</option>
                            {AFGHANISTAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="text" inputMode="decimal" name="minAmount" placeholder="حداقل مبلغ" value={filters.minAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <input type="text" inputMode="decimal" name="maxAmount" placeholder="حداکثر مبلغ" value={filters.maxAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        <select name="currency" value={filters.currency} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="all">همه ارزها</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div />
                         <div>
                            <label className="text-sm text-slate-400">از تاریخ:</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400">تا تاریخ:</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        </div>
                        <div className="col-span-full text-left">
                            <button onClick={handleResetFilters} className="text-lg px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md">پاک کردن فیلترها</button>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">کد / تاریخ</th>
                                <th className="px-6 py-4 font-medium">فرستنده</th>
                                <th className="px-6 py-4 font-medium">گیرنده</th>
                                <th className="px-6 py-4 font-medium">مقصد / مبدا</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-cyan-300 font-bold text-2xl">{formatTrackingCode(t.created_at)}</div>
                                        {t.partner_reference && <div className="font-mono text-xs text-amber-400">همکار: {t.partner_reference}</div>}
                                        <div className="text-sm text-slate-400">{new Date(t.created_at).toLocaleDateString('fa-IR-u-nu-latn')}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-100 font-semibold">{t.sender.name}</td>
                                    <td className="px-6 py-4 text-slate-100 font-semibold">{t.receiver.name}</td>
                                    <td className="px-6 py-4">
                                        <div>{t.destination_province}</div>
                                        <div className="text-sm text-slate-400">
                                            {t.partner_sarraf} {partnersMap.get(t.partner_sarraf) ? `(${partnersMap.get(t.partner_sarraf)?.province})` : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(t.status)}`}>
                                            {statusTranslations[t.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left whitespace-nowrap space-x-2 space-x-reverse">
                                        {hasPermission('domesticTransfers', 'edit') && (t.status === TransferStatus.Unexecuted || t.status === TransferStatus.PendingCashbox) && !t.partner_reference && (
                                            <button onClick={() => handleUpdateClick(t)} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                                                تغییر وضعیت
                                            </button>
                                        )}
                                        <button onClick={() => handleInitiatePrint(t)} className="p-2 rounded-full text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors" aria-label="چاپ رسید">
                                            <PrintIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>

            {isOutgoingModalOpen && user && (
                <CreateOutgoingTransferModal 
                    isOpen={isOutgoingModalOpen}
                    onClose={() => setOutgoingModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
             {isIncomingModalOpen && user && (
                <CreateIncomingTransferModal 
                    isOpen={isIncomingModalOpen}
                    onClose={() => setIncomingModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
            {isUpdateModalOpen && user && selectedTransfer && (
                <UpdateTransferStatusModal
                    isOpen={isUpdateModalOpen}
                    onClose={() => setUpdateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    transfer={selectedTransfer}
                />
            )}
             {isPayoutModalOpen && user && (
                <ProcessIncomingTransferModal
                    isOpen={isPayoutModalOpen}
                    onClose={() => setPayoutModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
            <TransferPrintPreviewModal
                isOpen={isPrintModalOpen}
                onClose={() => setPrintModalOpen(false)}
                transfer={selectedTransfer}
                partnerProvince={selectedTransfer ? partnersMap.get(selectedTransfer.partner_sarraf)?.province : undefined}
            />
        </div>
    );
};

export default DomesticTransfersPage;
