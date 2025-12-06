import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDedicatedAccounts } from '../contexts/DedicatedAccountContext';
import LogDepositModal from '../components/LogDepositModal';
import LogWithdrawalModal from '../components/LogWithdrawalModal';

const DedicatedAccountDetailPage: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { accounts, transactions } = useDedicatedAccounts();

    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

    const account = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);
    const accountTransactions = useMemo(() => transactions.filter(t => t.account_id === accountId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [transactions, accountId]);

    if (!account) {
        return (
            <div className="text-center p-10">
                <h2 className="text-3xl text-red-400">حساب یافت نشد</h2>
                <button onClick={() => navigate('/dedicated-accounts')} className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded">بازگشت به لیست</button>
            </div>
        );
    }

    return (
        <div style={{ direction: 'rtl' }} className="space-y-12">
            <button onClick={() => navigate('/dedicated-accounts')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست حسابات
            </button>

            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{account.account_holder}</h1>
                    <div className="mt-2 text-2xl text-cyan-300">{account.bank_name} - {account.account_number}</div>
                    <div className="text-xl text-slate-400">مالک: {account.owner_name} ({account.owner_type === 'Customer' ? 'مشتری' : 'همکار'})</div>
                </div>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی فعلی</h3>
                    <div className="text-5xl font-mono font-bold text-cyan-300">
                        {new Intl.NumberFormat('fa-IR').format(account.balance)} {account.currency}
                    </div>
                </div>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">صورت حساب</h2>
                     <div className="flex gap-4">
                         <button onClick={() => setDepositModalOpen(true)} className="px-5 py-2 bg-green-600/50 text-green-200 hover:bg-green-500/50 text-lg transition-colors border border-green-500/50 rounded">
                            + ثبت واریزی
                        </button>
                        <button onClick={() => setWithdrawalModalOpen(true)} className="px-5 py-2 bg-red-600/50 text-red-200 hover:bg-red-500/50 text-lg transition-colors border border-red-500/50 rounded">
                            - ثبت برداشتی
                        </button>
                     </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">نوع / شرح</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ</th>
                                <th className="px-6 py-4 font-medium text-left">کمیسیون</th>
                                <th className="px-6 py-4 font-medium text-left">تغییر در موجودی</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accountTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">
                                        <div>{tx.type === 'deposit' ? 'واریزی' : 'برداشتی'}</div>
                                        <div className="text-sm text-slate-400">{tx.receipt_serial}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR').format(tx.amount)}</td>
                                    <td className="px-6 py-4 font-mono text-left text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('fa-IR').format(tx.commission_amount) : '-'}</td>
                                    <td className={`px-6 py-4 font-mono text-left font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'}{new Intl.NumberFormat('fa-IR').format(tx.total_deducted)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDepositModalOpen && (
                <LogDepositModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} onSuccess={() => setDepositModalOpen(false)} accountId={account.id} />
            )}
             {isWithdrawalModalOpen && (
                <LogWithdrawalModal isOpen={isWithdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} onSuccess={() => setWithdrawalModalOpen(false)} accountId={account.id} />
            )}
        </div>
    );
};

export default DedicatedAccountDetailPage;
