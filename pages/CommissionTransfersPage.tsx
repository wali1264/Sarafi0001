import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { CommissionTransfer, User, BankAccount, CommissionTransferStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LogCommissionTransferModal from '../components/LogCommissionTransferModal';
import ExecuteCommissionTransferModal from '../components/ExecuteCommissionTransferModal';
import { persianToEnglishNumber, commissionTransferStatusTranslations } from '../utils/translations';
import CommissionTransferPrintView from '../components/CommissionTransferPrintView';
import BankAccountLedger from '../components/BankAccountLedger';
import CommissionTransferDetailsModal from '../components/CommissionTransferDetailsModal';
import ShareButton from '../components/ShareButton';


interface CommissionTransferPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: CommissionTransfer | null;
    initiatorName: string;
    bankAccountsMap: Map<string, BankAccount>;
}

const CommissionTransferPrintPreviewModal: React.FC<CommissionTransferPrintPreviewModalProps> = ({ isOpen, onClose, transfer, initiatorName, bankAccountsMap }) => {
    const printableAreaId = useMemo(() => `printable-commission-transfer-${transfer?.id}`, [transfer]);

    if (!isOpen || !transfer) return null;

    const handlePrint = () => {
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <CommissionTransferPrintView transfer={transfer} initiatorName={initiatorName} bankAccountsMap={bankAccountsMap} id={printableAreaId} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
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
                         <CommissionTransferPrintView transfer={transfer} initiatorName={initiatorName} bankAccountsMap={bankAccountsMap} id={printableAreaId} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <ShareButton printableAreaId={printableAreaId} fileName={`commission_transfer_${transfer.id}`} />
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

const DetailsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

type StatusFilter = 'Pending' | 'Ready' | 'Completed' | 'Rejected' | 'Income' | 'BankLedger';


const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
            active ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
    >
        {children}
    </button>
);

const CommissionIncomeView: React.FC<{ 
    transfers: CommissionTransfer[];
    initiatorsMap: Map<string, {name: string}>;
}> = ({ transfers, initiatorsMap }) => {
    const completedTransfers = useMemo(() => transfers.filter(t => t.status === 'Completed'), [transfers]);

    const totalCommission = useMemo(() => 
        completedTransfers.reduce((sum, t) => sum + (t.commission_amount || 0), 0),
        [completedTransfers]
    );

    return (
        <div className="space-y-8">
            <div className="bg-[#12122E]/80 p-6 border-2 border-green-400/20 text-center shadow-[0_0_20px_rgba(74,222,128,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <h3 className="text-2xl font-semibold text-slate-300 tracking-wider">مجموع کل درآمد از کمیسیون</h3>
                <p className="mt-2 text-5xl font-bold font-mono text-green-300 whitespace-nowrap overflow-hidden text-ellipsis">
                    {new Intl.NumberFormat('fa-IR-u-nu-latn').format(totalCommission)} <span className="text-3xl text-slate-400">IRT_BANK</span>
                </p>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">جزئیات درآمد کمیسیون‌ها</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ اجرا</th>
                                <th className="px-6 py-4 font-medium">شناسه حواله</th>
                                <th className="px-6 py-4 font-medium">از طرف</th>
                                <th className="px-6 py-4 font-medium">مبلغ کل</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ کمیسیون</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedTransfers.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{t.completed_at ? new Date(t.completed_at).toLocaleString('fa-IR-u-nu-latn') : '-'}</td>
                                    <td className="px-6 py-4 font-mono text-cyan-300">{t.id}</td>
                                    <td className="px-6 py-4 font-semibold">{initiatorsMap.get(t.initiator_id)?.name || 'ناشناس'}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400 font-bold">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.commission_amount || 0)} {t.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const CommissionTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<CommissionTransfer[]>([]);
    const [initiatorsMap, setInitiatorsMap] = useState<Map<string, {name: string}>>(new Map());
    const [bankAccountsMap, setBankAccountsMap] = useState<Map<string, BankAccount>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('Ready');

    const initialFilters = {
        initiatorName: '',
        sourceAccount: '',
        destinationAccount: '',
        receiptSerial: '',
        sourceCardLastDigits: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    };
    const [filters, setFilters] = useState(initialFilters);
    const [isAdvancedSearchOpen, setAdvancedSearchOpen] = useState(false);

    // Modal States
    const [isLogModalOpen, setLogModalOpen] = useState(false);
    const [isExecuteModalOpen, setExecuteModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<CommissionTransfer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [data, customersData, partnersData, bankAccountsData] = await Promise.all([
            api.getCommissionTransfers(),
            api.getCustomers(),
            api.getPartnerAccounts(),
            api.getBankAccounts(),
        ]);
        
        const newInitiatorsMap = new Map<string, {name: string}>();
        customersData.forEach(c => newInitiatorsMap.set(c.id, { name: c.name }));
        partnersData.forEach(p => newInitiatorsMap.set(p.id, { name: p.name }));
        
        setTransfers(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setInitiatorsMap(newInitiatorsMap);
        setBankAccountsMap(new Map(bankAccountsData.map(b => [b.id, b])));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setLogModalOpen(false);
        setExecuteModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };

    const handleExecuteClick = (transfer: CommissionTransfer) => {
        setSelectedTransfer(transfer);
        setExecuteModalOpen(true);
    };

    const handleInitiatePrint = (transfer: CommissionTransfer) => {
        setSelectedTransfer(transfer);
        setPrintModalOpen(true);
    };

    const handleDetailsClick = (transfer: CommissionTransfer) => {
        setSelectedTransfer(transfer);
        setDetailsModalOpen(true);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const filteredTransfers = useMemo(() => {
        if (statusFilter === 'Income' || statusFilter === 'BankLedger') return [];
        
        const statusMap: Record<Exclude<StatusFilter, 'Income' | 'BankLedger'>, CommissionTransferStatus[]> = {
            'Pending': [CommissionTransferStatus.PendingDepositApproval, CommissionTransferStatus.PendingWithdrawalApproval],
            'Ready': [CommissionTransferStatus.PendingExecution],
            'Completed': [CommissionTransferStatus.Completed],
            'Rejected': [CommissionTransferStatus.Rejected],
        };

        const targetStatuses = statusMap[statusFilter];

        return transfers.filter(t => {
            const matchesStatus = targetStatuses.includes(t.status);
            const initiatorName = initiatorsMap.get(t.initiator_id)?.name || '';
            const matchesInitiator = !filters.initiatorName || initiatorName.toLowerCase().includes(filters.initiatorName.toLowerCase());
            const matchesSource = !filters.sourceAccount || t.source_account_number.includes(filters.sourceAccount);
            const matchesDestination = !filters.destinationAccount || (t.destination_account_number && t.destination_account_number.includes(filters.destinationAccount));
            const matchesReceiptSerial = !filters.receiptSerial || (t.receipt_serial && t.receipt_serial.includes(filters.receiptSerial));
            const matchesCardDigits = !filters.sourceCardLastDigits || (t.source_card_last_digits && t.source_card_last_digits.includes(filters.sourceCardLastDigits));
            const matchesMinAmount = !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
            const matchesMaxAmount = !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);

            const txDate = new Date(t.created_at);
            const matchesStartDate = !filters.startDate || txDate >= new Date(filters.startDate);
            let matchesEndDate = true;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                matchesEndDate = txDate <= endDate;
            }

            return matchesStatus && matchesInitiator && matchesSource && matchesDestination && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate && matchesReceiptSerial && matchesCardDigits;
        });
    }, [transfers, statusFilter, filters, initiatorsMap]);
    
    const getStatusStyle = (status: CommissionTransferStatus) => {
        switch (status) {
            case CommissionTransferStatus.Completed: return 'bg-green-500/20 text-green-300';
            case CommissionTransferStatus.PendingExecution: return 'bg-sky-500/20 text-sky-300';
            case CommissionTransferStatus.PendingDepositApproval:
            case CommissionTransferStatus.PendingWithdrawalApproval:
                return 'bg-yellow-500/20 text-yellow-300';
            case CommissionTransferStatus.Rejected: return 'bg-red-500/20 text-red-300';
            default: return 'bg-slate-600/20 text-slate-300';
        }
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">حواله‌جات کمیشن‌کاری</h1>
                {hasPermission('commissionTransfers', 'create') && (
                    <button onClick={() => setLogModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت ورود وجه جدید
                    </button>
                )}
            </div>
            
            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={statusFilter === 'Ready'} onClick={() => setStatusFilter('Ready')}>آماده اجرا</TabButton>
                <TabButton active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')}>در انتظار تایید</TabButton>
                <TabButton active={statusFilter === 'Completed'} onClick={() => setStatusFilter('Completed')}>تکمیل شده</TabButton>
                <TabButton active={statusFilter === 'Rejected'} onClick={() => setStatusFilter('Rejected')}>رد شده</TabButton>
                <TabButton active={statusFilter === 'Income'} onClick={() => setStatusFilter('Income')}>درآمد کمیسیون‌ها</TabButton>
                <TabButton active={statusFilter === 'BankLedger'} onClick={() => setStatusFilter('BankLedger')}>دفتر حسابات بانکی</TabButton>
            </div>

            {statusFilter === 'BankLedger' ? (
                <BankAccountLedger />
            ) : statusFilter === 'Income' ? (
                <CommissionIncomeView transfers={transfers} initiatorsMap={initiatorsMap} />
            ) : (
                <>
                <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                    <div className="p-4 border-b-2 border-cyan-400/20 flex flex-wrap gap-4 items-center">
                        <input type="text" name="initiatorName" placeholder="جستجو بر اساس نام مشتری/همکار..." value={filters.initiatorName} onChange={handleFilterChange} className="flex-grow text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100"/>
                        <button onClick={() => setAdvancedSearchOpen(prev => !prev)} className="flex items-center text-lg px-4 py-2 bg-slate-700/50 border-2 border-slate-600/50 rounded-md text-cyan-300 hover:bg-slate-700">
                            <FilterIcon /> {isAdvancedSearchOpen ? 'بستن' : 'پیشرفته'}
                        </button>
                    </div>
                    <div className={`transition-all duration-500 ease-in-out ${isAdvancedSearchOpen ? 'max-h-[500px]' : 'max-h-0'} overflow-hidden`}>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <input type="text" name="receiptSerial" placeholder="شماره سریال رسید..." value={filters.receiptSerial} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input type="text" name="sourceCardLastDigits" placeholder="چهار رقم آخر کارت..." value={filters.sourceCardLastDigits} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input type="text" name="sourceAccount" placeholder="شماره حساب مبدا..." value={filters.sourceAccount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input type="text" name="destinationAccount" placeholder="شماره حساب مقصد..." value={filters.destinationAccount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input type="text" inputMode="decimal" name="minAmount" placeholder="حداقل مبلغ" value={filters.minAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <input type="text" inputMode="decimal" name="maxAmount" placeholder="حداکثر مبلغ" value={filters.maxAmount} onChange={handleFilterChange} className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <div><label className="text-sm text-slate-400">از تاریخ:</label><input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" /></div>
                            <div><label className="text-sm text-slate-400">تا تاریخ:</label><input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full text-lg px-4 py-1 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" /></div>
                            <div className="col-span-full text-left"><button onClick={handleResetFilters} className="text-lg px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md">پاک کردن</button></div>
                        </div>
                    </div>
                </div>
            
                <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">تاریخ / سریال</th>
                                    <th className="px-6 py-4 font-medium">از طرف</th>
                                    <th className="px-6 py-4 font-medium">مبلغ ورودی</th>
                                    <th className="px-6 py-4 font-medium">جزئیات پرداخت</th>
                                    <th className="px-6 py-4 font-medium">وضعیت</th>
                                    <th className="px-6 py-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={8} className="text-center p-8 text-slate-400">در حال بارگذاری...</td></tr>
                                ) : filteredTransfers.map(t => {
                                    return (
                                    <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>{new Date(t.created_at).toLocaleString('fa-IR-u-nu-latn')}</div>
                                            {t.receipt_serial && <div className="text-sm text-slate-400 font-mono">سریال: {t.receipt_serial}</div>}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-100">
                                            <div>{initiatorsMap.get(t.initiator_id)?.name || 'ناشناس'}</div>
                                            <div className="text-sm text-slate-400">{t.initiator_type === 'Customer' ? 'مشتری' : 'همکار'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-left text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</div>
                                            <div className="text-sm text-slate-400 text-left">از: {t.source_account_number}</div>
                                            {t.source_card_last_digits && <div className="text-sm text-slate-400 text-left">کارت: **** {t.source_card_last_digits}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.status === 'Completed' || t.status === 'PendingWithdrawalApproval' || t.status === 'Rejected' ? (
                                                <>
                                                    <div className="font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.final_amount_paid || 0)} {t.currency}</div>
                                                    <div className="text-sm text-slate-400 text-left">به: {t.destination_account_number}</div>
                                                    {t.execution_receipt_serial && <div className="text-xs text-slate-500 text-left font-mono">سریال پرداخت: {t.execution_receipt_serial}</div>}
                                                    {t.execution_destination_card_digits && <div className="text-xs text-slate-500 text-left font-mono">کارت مقصد: **** {t.execution_destination_card_digits}</div>}
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(t.status)}`}>
                                                {commissionTransferStatusTranslations[t.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-left whitespace-nowrap space-x-2 space-x-reverse">
                                            {t.status === 'PendingExecution' && hasPermission('commissionTransfers', 'process') && (
                                                <button onClick={() => handleExecuteClick(t)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded text-base font-bold">
                                                    اجرای دستور پرداخت
                                                </button>
                                            )}
                                            <button onClick={() => handleDetailsClick(t)} className="p-2 rounded-full text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors" aria-label="جزئیات">
                                                <DetailsIcon />
                                            </button>
                                            <button onClick={() => handleInitiatePrint(t)} className="p-2 rounded-full text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors" aria-label="چاپ رسید">
                                                <PrintIcon />
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )}


            {isLogModalOpen && user && (
                <LogCommissionTransferModal
                    isOpen={isLogModalOpen}
                    onClose={() => setLogModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
             {isExecuteModalOpen && user && selectedTransfer && (
                <ExecuteCommissionTransferModal
                    isOpen={isExecuteModalOpen}
                    onClose={() => setExecuteModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    transfer={selectedTransfer}
                />
            )}
            <CommissionTransferPrintPreviewModal 
                isOpen={isPrintModalOpen}
                onClose={() => setPrintModalOpen(false)}
                transfer={selectedTransfer}
                initiatorName={selectedTransfer ? (initiatorsMap.get(selectedTransfer.initiator_id)?.name || 'ناشناس') : ''}
                bankAccountsMap={bankAccountsMap}
            />
            {isDetailsModalOpen && selectedTransfer && (
                <CommissionTransferDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setDetailsModalOpen(false)}
                    transfer={selectedTransfer}
                    initiatorName={initiatorsMap.get(selectedTransfer.initiator_id)?.name || 'ناشناس'}
                    bankAccountsMap={bankAccountsMap}
                />
            )}
        </div>
    );
};

export default CommissionTransfersPage;
