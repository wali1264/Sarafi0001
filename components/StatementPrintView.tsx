
import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Customer, PartnerAccount, CustomerTransaction, PartnerTransaction, Currency } from '../types';

interface StatementPrintViewProps {
    entityId: string;
    type: 'customer' | 'partner';
}

type Transaction = (CustomerTransaction | PartnerTransaction) & { balanceAfter: number };

const StatementPrintView: React.FC<StatementPrintViewProps> = ({ entityId, type }) => {
    const api = useApi();
    const [entity, setEntity] = useState<Customer | PartnerAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            if (!entityId) {
                setError("شناسه مورد نیاز ارائه نشده است.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                let entityData: Customer | PartnerAccount | undefined;
                let txData: (CustomerTransaction[] | PartnerTransaction[]) = [];
                
                if (type === 'customer') {
                    entityData = await api.getCustomerById(entityId);
                    if (entityData) txData = await api.getTransactionsForCustomer(entityId);
                } else {
                    entityData = await api.getPartnerAccountById(entityId);
                    if (entityData) txData = await api.getTransactionsForPartner(entityId);
                }

                if (!entityData) throw new Error("موجودیت یافت نشد");
                setEntity(entityData);

                const runningBalances: { [key in Currency]?: number } = {};
                const processedTxs: Transaction[] = txData
                    .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map(tx => {
                        const balance = runningBalances[tx.currency] || 0;
                        const newBalance = balance + (tx.type === 'credit' ? tx.amount : -tx.amount);
                        runningBalances[tx.currency] = newBalance;
                        return { ...(tx as any), balanceAfter: newBalance };
                    });
                setTransactions(processedTxs.reverse());

            } catch (err) {
                console.error("Error fetching statement data:", err);
                setError("خطا در دریافت اطلاعات صورتحساب.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [entityId, type, api]);


    if (isLoading) return <div className="text-center p-10 text-gray-500">در حال آماده سازی صورتحساب...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
    if (!entity) return <div className="text-center p-10 text-gray-500">اطلاعات مورد نظر یافت نشد.</div>;

    const isCustomer = (e: Customer | PartnerAccount): e is Customer => 'code' in e;

    return (
        <div id="printable-area" className="bg-white text-black p-8 font-[sans-serif]" style={{ direction: 'rtl', width: '21cm', minHeight: '29.7cm', margin: 'auto' }}>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-8">
                <div>
                    <h1 className="text-4xl font-bold" style={{ fontFamily: "'Times New Roman', serif" }}>صرافی الشیخ</h1>
                    <p className="text-xl text-gray-600 mt-1">صورتحساب {type === 'customer' ? 'مشتری' : 'همکار'}</p>
                </div>
                <div className="text-left text-sm text-gray-700">
                    <p><strong>نام:</strong> {entity.name}</p>
                    {isCustomer(entity) && <p><strong>کد:</strong> {entity.code}</p>}
                    <p><strong>تاریخ گزارش:</strong> {new Date().toLocaleDateString('fa-IR')}</p>
                </div>
            </header>

            <main>
                <table className="w-full text-base border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-3 font-bold text-right border-gray-300 border">تاریخ</th>
                            <th className="p-3 font-bold text-right border-gray-300 border">شرح</th>
                            <th className="p-3 font-bold text-left border-gray-300 border">رسید / بستانکار</th>
                            <th className="p-3 font-bold text-left border-gray-300 border">برد / بدهکار</th>
                            <th className="p-3 font-bold text-left border-gray-300 border">مانده</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length > 0 ? transactions.map(tx => (
                            <tr key={tx.id} className="odd:bg-white even:bg-gray-50">
                                <td className="p-3 border-gray-300 border whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR')}</td>
                                <td className="p-3 border-gray-300 border">{tx.description}</td>
                                <td className="p-3 border-gray-300 border text-left font-mono text-green-700">
                                    {tx.type === 'credit' ? new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount) : '---'}
                                </td>
                                <td className="p-3 border-gray-300 border text-left font-mono text-red-700">
                                    {tx.type === 'debit' ? new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount) : '---'}
                                </td>
                                <td className={`p-3 border-gray-300 border text-left font-mono font-bold whitespace-nowrap ${(tx.balanceAfter as number) >= 0 ? 'text-gray-800' : 'text-red-700'}`}>
                                    {new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.balanceAfter as number)} {tx.currency}
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={5} className="text-center p-6 text-gray-500 border">هیچ تراکنشی برای نمایش وجود ندارد.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
            
             <footer className="mt-10 pt-6 border-t-2 border-gray-800 text-left">
                 <h3 className="text-xl font-bold mb-3 text-right">خلاصه موجودی نهایی</h3>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-md ml-auto text-lg">
                    {Object.entries(entity.balances).map(([currency, balance]) => {
                        if (balance === 0 && !transactions.some(tx => tx.currency === currency as Currency)) return null;
                        return (
                            <React.Fragment key={currency}>
                                <span className="font-bold text-right">{currency}:</span>
                                <span className={`font-bold text-xl font-mono ${(Number(balance) || 0) >= 0 ? 'text-black' : 'text-red-700'}`}>
                                    {new Intl.NumberFormat('fa-IR-u-nu-latn').format(Number(balance) || 0)}
                                </span>
                            </React.Fragment>
                        )
                    })}
                </div>
            </footer>
        </div>
    );
};

export default StatementPrintView;
