import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PartnerAccount, Currency } from '../types';
import { CURRENCIES } from '../constants';

const BalanceSummary: React.FC<{ balances: PartnerAccount['balances'] }> = ({ balances }) => {
    const nonZeroBalances = CURRENCIES
        .map(currency => ({ currency, amount: balances[currency] || 0 }))
        .filter(b => b.amount !== 0);

    if (nonZeroBalances.length === 0) {
        return <span className="text-slate-400">بی حساب</span>;
    }

    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-lg font-mono">
            {nonZeroBalances.map(({ currency, amount }) => (
                <span key={currency} className={amount < 0 ? 'text-red-400' : 'text-green-400'}>
                    {`${new Intl.NumberFormat('en-US').format(amount)} ${currency}`}
                </span>
            ))}
        </div>
    );
};


const PartnerAccountsPage: React.FC = () => {
    const api = useApi();
    const navigate = useNavigate();
    const [partners, setPartners] = useState<PartnerAccount[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await api.getPartnerAccounts();
            setPartners(data);
        };
        fetchData();
    }, [api]);

    return (
        <div style={{ direction: 'rtl' }}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">حساب همکاران</h1>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">لیست صرافان همکار</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">نام صراف</th>
                                <th scope="col" className="px-6 py-4 font-medium">موجودی‌ها</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 text-2xl font-semibold text-slate-100">{p.name}</td>
                                    <td className="px-6 py-4 text-left">
                                        <BalanceSummary balances={p.balances} />
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        <button 
                                            onClick={() => navigate(`/partner-accounts/${p.id}`)}
                                            className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                                        >
                                            مشاهده جزئیات
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartnerAccountsPage;