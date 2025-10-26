
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, PartnerAccount, CustomerTransaction, PartnerTransaction, Currency, InternalExchange } from '../types';
import { CURRENCIES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

type Transaction = CustomerTransaction | PartnerTransaction;

const PortalStatementPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const api = useApi();

    const [processedTransactions, setProcessedTransactions] = useState<(Transaction & { balanceAfter: number })[]>([]);
    const [exchangeHistory, setExchangeHistory] = useState<InternalExchange[]>([]);

    const fetchData = useCallback(async () => {
        if (!user || user.userType === 'internal') {
            navigate('/');
            return;
        }

        let txData: Transaction[] = [];
        if (user.userType === 'customer') {
            const [customerTxData, customerExchangeData] = await Promise.all([
                api.getTransactionsForCustomer(user.entity.id),
                api.getInternalExchangesForCustomer(user.entity.id)
            ]);
            txData = customerTxData;
            setExchangeHistory(customerExchangeData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else if (user.userType === 'partner') {
            txData = await api.getTransactionsForPartner(user.entity.id);
            setExchangeHistory([]); // Partners don't have exchanges
        }
        
        const runningBalances: { [key in Currency]?: number } = {};
        const processed = txData
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Oldest first
            .map(tx => {
                const balance = runningBalances[tx.currency] || 0;
                const newBalance = balance + (tx.type === 'credit' ? tx.amount : -tx.amount);
                runningBalances[tx.currency] = newBalance;
                return { ...tx, balanceAfter: newBalance };
            });
        setProcessedTransactions(processed.reverse()); // Newest first for display
        
    }, [api, user, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!user || user.userType === 'internal') {
        return null; // or a loading spinner, redirect is handled in fetchData
    }
    
    const entity = user.entity;

    const getBalanceStyle = (balance: number) => {
        if (balance < 0) return 'text-red-400';
        if (balance > 0) return 'text-green-400';
        return 'text-slate-300';
    };

    return (
        <div style={{ direction: 'rtl' }} className="space-y-12">
             <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">صورتحساب شما</h1>
                    <div className="mt-2 text-3xl font-mono text-cyan-300">
                        {user.userType === 'customer' ? `کد: ${user.entity.code}` : `ولایت: ${user.entity.province}`}
                    </div>
                </div>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی حسابات</h3>
                    {CURRENCIES.map(currency => {
                        const balance = entity.balances[currency] || 0;
                        if (balance === 0 && !processedTransactions.some(tx => tx.currency === currency)) return null; 
                        return (
                            <div key={currency} className={`text-3xl font-mono font-bold ${getBalanceStyle(balance)}`}>
                                {new Intl.NumberFormat('fa-IR-u-nu-latn').format(balance)} {currency}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                                <th scope="col" className="px-6 py-4 font-medium">رسیدن (بستانکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بردان (بدهکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium text-left">مانده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">
                                        {tx.type === 'credit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                     <td className="px-6 py-4 font-mono text-left text-red-400">
                                        {tx.type === 'debit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-left whitespace-nowrap ${getBalanceStyle(tx.balanceAfter)}`}>
                                        {new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.balanceAfter)} {tx.currency}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {user.userType === 'customer' && exchangeHistory.length > 0 && (
                 <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                    <div className="p-6 border-b-2 border-cyan-400/20">
                        <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تاریخچه تبادلات ارزی</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                    <th scope="col" className="px-6 py-4 font-medium text-left">از</th>
                                    <th scope="col" className="px-6 py-4 font-medium text-left">به</th>
                                    <th scope="col" className="px-6 py-4 font-medium">نرخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchangeHistory.map(ex => (
                                    <tr key={ex.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                        <td className="px-6 py-4">{new Date(ex.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                        <td className="px-6 py-4 font-mono text-left text-red-400">
                                            {new Intl.NumberFormat('fa-IR-u-nu-latn').format(ex.fromAmount)} {ex.fromCurrency}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-left text-green-400">
                                            {new Intl.NumberFormat('fa-IR-u-nu-latn').format(ex.toAmount)} {ex.toCurrency}
                                        </td>
                                        <td className="px-6 py-4 font-mono">{ex.rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalStatementPage;
