
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { Currency } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import AccountingPrintView from '../components/AccountingPrintView';
import { useToast } from '../contexts/ToastContext';
import { useFinancialPulse } from '../contexts/FinancialPulseContext'; // Import Context

type AnalysisResult = {
    grossAssets: number;
    netWorth: number;
    liquidNetWorth: number;
    breakdown: {
        liquidAssets: { [key in Currency]?: number };
        receivables: { [key in Currency]?: number };
        liabilities: { [key in Currency]?: number };
        commissionLiability: { [key in Currency]?: number };
        usdTotals: {
            totalLiquidAssetsUSD: number;
            totalReceivablesUSD: number;
            totalLiabilitiesUSD: number;
            totalCommissionLiabilityUSD: number;
        }
    }
};

const SettingsCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, actions }) => (
    <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
            <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
            <div>{actions}</div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const ResultCard: React.FC<{ title: string, value: number, description: string }> = ({ title, value, description }) => (
     <div className="bg-slate-800/50 p-6 rounded-lg text-center border border-cyan-400/20">
        <h3 className="text-2xl text-slate-400">{title}</h3>
        <p className="text-5xl font-bold font-mono text-cyan-300 my-3">
            ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
        </p>
        <p className="text-base text-slate-500">{description}</p>
    </div>
);

const AccountingPage: React.FC = () => {
    const api = useApi();
    const { addToast } = useToast();
    const { rates: liveRates, updateRate } = useFinancialPulse(); // Use context rates
    
    const [localRates, setLocalRates] = useState<{ [key: string]: string }>({});
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [highlightedCurrencies, setHighlightedCurrencies] = useState<string[]>([]);

    // Sync context rates to local state on mount/update
    useEffect(() => {
        const stringRates: {[key:string]: string} = {};
        Object.keys(liveRates).forEach(k => stringRates[k] = String(liveRates[k]));
        setLocalRates(stringRates);
    }, [liveRates]);

    const handleRateChange = (currency: Currency, value: string) => {
        const sanitized = persianToEnglishNumber(value);
        setLocalRates(prev => ({ ...prev, [currency]: sanitized }));
    };

    const handleRateBlur = (currency: Currency) => {
        const val = localRates[currency];
        if (val) {
            updateRate(currency, val);
        }
    };

    const fetchLiveRates = async () => {
        setIsFetchingRates(true);
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!response.ok) throw new Error('خطا در دریافت نرخ‌های جهانی');
            const data = await response.json();
            const updatedCurrencies: string[] = [];

            ['EUR', 'PKR', 'AFN'].forEach(currency => {
                if (data.rates[currency]) {
                    const rateStr = String(data.rates[currency]);
                    updateRate(currency, rateStr);
                    updatedCurrencies.push(currency);
                }
            });

            setHighlightedCurrencies(updatedCurrencies);
            addToast("نرخ‌های جهانی با موفقیت به‌روز و ذخیره شد.", 'success');

        } catch (error: any) {
            console.error("Failed to fetch exchange rates:", error);
            addToast(error.message || "خطا در دریافت نرخ‌های ارز.", 'error');
        } finally {
            setIsFetchingRates(false);
            setTimeout(() => setHighlightedCurrencies([]), 2500);
        }
    };

    const handleCalculate = useCallback(async () => {
        setIsLoading(true);
        setAnalysis(null);

        const numericRates = liveRates; // Use rates from context directly

        // Fetch ALL necessary financial data including Bank Accounts and Rented Accounts
        const [cashboxBalances, bankAccounts, rentedData, customers, partners, commissionTransfers] = await Promise.all([
            api.getCashboxBalances(),
            api.getBankAccounts(),
            api.getRentedAccountsData(),
            api.getCustomers(),
            api.getPartnerAccounts(),
            api.getCommissionTransfers(),
        ]);
        
        const breakdown = {
            liquidAssets: {} as { [key in Currency]?: number },
            receivables: {} as { [key in Currency]?: number },
            liabilities: {} as { [key in Currency]?: number },
            commissionLiability: {} as { [key in Currency]?: number },
        };
        const addToBreakdown = (category: keyof typeof breakdown, currency: Currency, amount: number) => {
            breakdown[category][currency] = (breakdown[category][currency] || 0) + amount;
        };

        // 1. Cashbox Balances
        cashboxBalances.forEach(bal => addToBreakdown('liquidAssets', bal.currency, bal.balance));

        // 2. Bank Accounts (NEW)
        bankAccounts.forEach(acc => {
            if (acc.status === 'Active' && acc.balance > 0) {
                addToBreakdown('liquidAssets', acc.currency, acc.balance);
            }
        });

        // 3. Rented Accounts (NEW)
        rentedData.accounts.forEach(acc => {
            if (acc.status === 'Active' && acc.balance > 0) {
                // Rented accounts are typically IRT_BANK
                addToBreakdown('liquidAssets', Currency.IRT_BANK, acc.balance);
            }
        });

        // 4. Customers
        customers.forEach(c => {
            for (const key in c.balances) {
                const currency = key as Currency;
                const balance = c.balances[currency] || 0;
                if (balance > 0) addToBreakdown('liabilities', currency, balance);
                else if (balance < 0) addToBreakdown('receivables', currency, Math.abs(balance));
            }
        });

        // 5. Partners
        partners.forEach(p => {
            for (const key in p.balances) {
                const currency = key as Currency;
                const balance = p.balances[currency] || 0;
                if (balance > 0) addToBreakdown('liabilities', currency, balance);
                else if (balance < 0) addToBreakdown('receivables', currency, Math.abs(balance));
            }
        });
        
        // 6. Commission Transfers
        const pendingCommission = commissionTransfers.filter(t => ['PendingExecution', 'PendingWithdrawalApproval'].includes(t.status));
        pendingCommission.forEach(t => {
            const commissionAmount = t.amount * (t.commission_percentage / 100);
            const liabilityAmount = t.amount - commissionAmount;
            addToBreakdown('commissionLiability', t.currency, liabilityAmount);
            addToBreakdown('receivables', t.currency, commissionAmount);
        });

        const convertToUsd = (currency: Currency, amount: number) => {
            const rate = numericRates[currency];
            if (!rate || rate === 0) return 0; // Prevent division by zero
            return amount / rate;
        };
        
        let totals = {
            totalLiquidAssetsUSD: 0,
            totalReceivablesUSD: 0,
            totalLiabilitiesUSD: 0,
            totalCommissionLiabilityUSD: 0,
        };

        CURRENCIES.forEach(c => {
            totals.totalLiquidAssetsUSD += convertToUsd(c, breakdown.liquidAssets[c] || 0);
            totals.totalReceivablesUSD += convertToUsd(c, breakdown.receivables[c] || 0);
            totals.totalLiabilitiesUSD += convertToUsd(c, breakdown.liabilities[c] || 0);
            totals.totalCommissionLiabilityUSD += convertToUsd(c, breakdown.commissionLiability[c] || 0);
        });

        const grossAssets = totals.totalLiquidAssetsUSD + totals.totalReceivablesUSD;
        const netWorth = grossAssets - totals.totalLiabilitiesUSD - totals.totalCommissionLiabilityUSD;
        const liquidNetWorth = totals.totalLiquidAssetsUSD - totals.totalLiabilitiesUSD - totals.totalCommissionLiabilityUSD;

        const finalAnalysis = { grossAssets, netWorth, liquidNetWorth, breakdown: { ...breakdown, usdTotals: totals } };
        setAnalysis(finalAnalysis);

        setIsLoading(false);

    }, [api, liveRates]);

    const handlePrint = () => {
        if (!analysis) return;
        const container = document.getElementById('printable-area-container');
        if (container) {
            // Convert numeric rates to string for print view
            const stringRates: {[key:string]: string} = {};
            Object.keys(liveRates).forEach(k => stringRates[k] = String(liveRates[k]));

            ReactDOM.render(
                <AccountingPrintView analysis={analysis} rates={stringRates} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
                        ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
    };
    
    return (
        <div style={{ direction: 'rtl' }} className="space-y-12">
            <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-wider">حسابداری و تحلیل دارایی</h1>
            
            <SettingsCard 
                title="۱. مدیریت نرخ‌های تبدیل ارز (نسبت به USD)"
                actions={
                    <button onClick={fetchLiveRates} disabled={isFetchingRates} className="px-4 py-2 text-lg font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait w-64 text-center">
                        {isFetchingRates ? 'در حال دریافت...' : 'به‌روزرسانی و ذخیره نرخ جهانی'}
                    </button>
                }
            >
                <p className="text-slate-400 mb-6">برای تغییر نرخ، عدد را وارد کنید و سپس خارج از کادر کلیک کنید (یا کلید تب را بزنید) تا به صورت خودکار ذخیره شود.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {CURRENCIES.filter(c => c !== 'USD').map(currency => (
                        <div key={currency}>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">1 USD = ? {currency}</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={localRates[currency] || ''}
                                onChange={e => handleRateChange(currency as Currency, e.target.value)}
                                onBlur={() => handleRateBlur(currency as Currency)}
                                placeholder={`نرخ ${currency}`}
                                className={`w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 transition-all duration-300 ${highlightedCurrencies.includes(currency) ? 'glowing-border' : ''}`}
                            />
                        </div>
                    ))}
                </div>
            </SettingsCard>
            
             <div className="text-center">
                <button
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className="px-12 py-4 text-2xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                    {isLoading ? 'در حال محاسبه...' : '۲. محاسبه دقیق و نمایش جزئیات'}
                </button>
            </div>

            {analysis && (
                <div className="animate-fadeIn space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">۳. نتایج تحلیل (به ارزش USD)</h2>
                        <button onClick={handlePrint} className="px-6 py-3 text-xl font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700">چاپ گزارش</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ResultCard title="مجموع کل دارایی‌ها (ناخالص)" value={analysis.grossAssets} description="شامل تمام موجودی نقد (صندوق، بانک و حسابات کرایی) و کل طلبی که از دیگران دارید." />
                        <ResultCard title="دارایی خالص واقعی" value={analysis.netWorth} description="ثروت واقعی شما پس از کسر تمام بدهی‌ها و تعهدات از مجموع کل دارایی‌ها." />
                        <ResultCard title="دارایی خالص نقد" value={analysis.liquidNetWorth} description="سرمایه نقدی خالص شما، با فرض اینکه طلب‌های خود را هنوز دریافت نکرده‌اید." />
                    </div>
                </div>
            )}

        </div>
    );
};

export default AccountingPage;
