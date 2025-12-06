import React from 'react';
import { Currency } from '../types';
import { CURRENCIES } from '../constants';


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

interface AccountingPrintViewProps {
    analysis: AnalysisResult;
    rates: {[key: string]: string};
}

const formatUSD = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const formatNum = (value: number, currency: string) => `${new Intl.NumberFormat('en-US').format(value)} ${currency}`;

const BreakdownTable: React.FC<{ title: string, data: { [key: string]: number | undefined }, rates: {[key: string]: string}, totalUsd: number }> = ({ title, data, rates, totalUsd }) => {
    const numericRates: {[key: string]: number} = {};
    for(const key in rates) {
        numericRates[key] = parseFloat(rates[key]) || 0;
    }
    const convertToUsd = (currency: Currency, amount: number) => {
        if (currency === 'USD') return amount;
        const rate = numericRates[currency];
        if (!rate || rate === 0) return 0;
        return amount / rate;
    };
    
    const entries = CURRENCIES.map(c => ({ currency: c, amount: data[c] || 0 })).filter(item => item.amount !== 0);

    if (entries.length === 0) return null;

    return (
        <div className="mb-4">
            <h4 className="font-bold text-lg">{title}</h4>
            <table className="w-full text-sm my-1 border-collapse border border-gray-400">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-1 border">ارز</th>
                        <th className="p-1 border">مبلغ</th>
                        <th className="p-1 border">نرخ به USD</th>
                        <th className="p-1 border">معادل USD</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(({ currency, amount }) => (
                        <tr key={currency}>
                            <td className="p-1 border">{currency}</td>
                            <td className="p-1 border text-left font-mono">{formatNum(amount, '')}</td>
                            <td className="p-1 border text-left font-mono">{numericRates[currency] || '-'}</td>
                            <td className="p-1 border text-left font-mono">{formatUSD(convertToUsd(currency as Currency, amount))}</td>
                        </tr>
                    ))}
                     <tr className="font-bold bg-gray-200">
                        <td colSpan={3} className="p-1 border">جمع کل</td>
                        <td className="p-1 border text-left font-mono">{formatUSD(totalUsd)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const AccountingPrintView: React.FC<AccountingPrintViewProps> = ({ analysis, rates }) => {
    
    return (
        <div id="printable-area" className="bg-white text-black p-8 font-[sans-serif]" style={{ direction: 'rtl', width: '21cm', minHeight: '29.7cm', margin: 'auto' }}>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-8">
                <div>
                    <h1 className="text-4xl font-bold" style={{ fontFamily: "'Times New Roman', serif" }}>صرافی الشیخ</h1>
                    <p className="text-xl text-gray-600 mt-1">صورت وضعیت مالی</p>
                </div>
                <div className="text-left text-sm text-gray-700">
                    <p><strong>تاریخ گزارش:</strong> {new Date().toLocaleString('fa-IR')}</p>
                </div>
            </header>
            
            <main className="space-y-6 text-base">
                <section>
                    <h2 className="text-2xl font-bold mb-3 text-center border-b pb-2">نرخ‌های تبدیل استفاده شده (نسبت به USD)</h2>
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                        {Object.entries(rates).map(([currency, rate]) => (
                             <div key={currency} className="bg-gray-100 p-2 rounded">
                                <p className="font-bold">{currency}</p>
                                <p className="font-mono">{rate}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-3 text-center border-b pb-2">تفکیک دارایی‌ها و بدهی‌ها</h2>
                    
                    <BreakdownTable title="موجودی نقد (صندوق و بانک)" data={analysis.breakdown.liquidAssets} rates={rates} totalUsd={analysis.breakdown.usdTotals.totalLiquidAssetsUSD} />
                    <BreakdownTable title="مجموع طلب‌ها (از مشتریان، همکاران و کمیسیون)" data={analysis.breakdown.receivables} rates={rates} totalUsd={analysis.breakdown.usdTotals.totalReceivablesUSD} />
                    <BreakdownTable title="مجموع بدهی‌ها (به مشتریان و همکاران)" data={analysis.breakdown.liabilities} rates={rates} totalUsd={analysis.breakdown.usdTotals.totalLiabilitiesUSD} />
                    <BreakdownTable title="بدهی بابت حواله‌های کمیشن‌کاری" data={analysis.breakdown.commissionLiability} rates={rates} totalUsd={analysis.breakdown.usdTotals.totalCommissionLiabilityUSD} />

                </section>

                <section>
                     <h2 className="text-2xl font-bold mb-3 text-center border-b pb-2">خلاصه نهایی (به ارزش USD)</h2>
                     <div className="space-y-4">
                        <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-800">
                            <h3 className="text-xl font-bold">دارایی خالص واقعی</h3>
                            <p className="text-3xl font-bold font-mono text-center my-2">{formatUSD(analysis.netWorth)}</p>
                            <p className="text-sm text-gray-600 text-center">ثروت واقعی شما پس از تسویه تمام بدهی‌ها و تعهدات.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="bg-gray-100 p-4 rounded-lg border">
                                <h3 className="text-lg font-bold">مجموع کل دارایی‌ها (ناخالص)</h3>
                                <p className="text-2xl font-bold font-mono text-center my-1">{formatUSD(analysis.grossAssets)}</p>
                                <p className="text-xs text-gray-600 text-center">کل پولی که در اختیار دارید یا از دیگران طلبکار هستید.</p>
                            </div>
                             <div className="bg-gray-100 p-4 rounded-lg border">
                                <h3 className="text-lg font-bold">دارایی خالص نقد</h3>
                                <p className="text-2xl font-bold font-mono text-center my-1">{formatUSD(analysis.liquidNetWorth)}</p>
                                <p className="text-xs text-gray-600 text-center">سرمایه نقدی خالص شما، با فرض اینکه طلب‌های خود را هنوز دریافت نکرده‌اید.</p>
                            </div>
                        </div>
                     </div>
                </section>
            </main>
        </div>
    );
};

export default AccountingPrintView;