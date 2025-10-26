import React, { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, ForeignTransaction, CommissionTransfer } from '../types';
declare const Chart: any;

type ActivityType = 'domestic' | 'exchange' | 'commission';

const WeeklyTrendChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const api = useApi();
    const [activeTab, setActiveTab] = useState<ActivityType>('domestic');
    const [chartData, setChartData] = useState<{ labels: string[], data: number[] } | null>(null);

    const [allData, setAllData] = useState<{
        domestic: DomesticTransfer[];
        exchange: ForeignTransaction[];
        commission: CommissionTransfer[];
    } | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            const [domestic, exchange, commission] = await Promise.all([
                api.getDomesticTransfers(),
                api.getForeignTransactions(),
                api.getCommissionTransfers(),
            ]);
            setAllData({ domestic, exchange, commission });
        };
        fetchAllData();
    }, [api]);

    useEffect(() => {
        if (!allData) return;

        const processData = (items: { created_at?: Date, timestamp?: Date }[]) => {
            const now = new Date();
            const weekLabels = ["هفته جاری", "۱ هفته پیش", "۲ هفته پیش", "۳ هفته پیش", "۴ هفته پیش", "۵ هفته پیش"];
            const weeklyCounts = Array(6).fill(0);

            const startOfThisWeek = new Date(now);
            startOfThisWeek.setDate(now.getDate() - (now.getDay() + 1) % 7); // Assuming Saturday is start of week
            startOfThisWeek.setHours(0, 0, 0, 0);

            items.forEach(item => {
                const itemDate = new Date(item.created_at || item.timestamp!);
                if (itemDate >= startOfThisWeek) {
                    weeklyCounts[0]++;
                } else {
                    const diffTime = startOfThisWeek.getTime() - itemDate.getTime();
                    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                    if (diffWeeks >= 0 && diffWeeks < 5) {
                        weeklyCounts[diffWeeks + 1]++;
                    }
                }
            });
            
            return { labels: weekLabels, data: weeklyCounts };
        };
        
        let dataToProcess;
        switch (activeTab) {
            case 'exchange':
                dataToProcess = allData.exchange;
                break;
            case 'commission':
                dataToProcess = allData.commission;
                break;
            case 'domestic':
            default:
                dataToProcess = allData.domestic;
                break;
        }

        setChartData(processData(dataToProcess));
    }, [activeTab, allData]);

    useEffect(() => {
        if (!chartRef.current || !chartData) return;
        
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        Chart.defaults.color = 'rgba(203, 213, 225, 0.7)';
        Chart.defaults.font.family = 'Teko, sans-serif';
        Chart.defaults.font.size = 16;

        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'تعداد معاملات',
                    data: chartData.data,
                    borderColor: 'rgba(34, 211, 238, 1)',
                    backgroundColor: 'rgba(34, 211, 238, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(34, 211, 238, 1)',
                    pointRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            stepSize: 1,
                            color: 'rgba(148, 163, 184, 1)'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                         ticks: { color: 'rgba(148, 163, 184, 1)' },
                         grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: { legend: { display: false } }
            },
        });

    }, [chartData]);
    
    const TabButton: React.FC<{ label: string; type: ActivityType; }> = ({ label, type }) => (
        <button
            onClick={() => setActiveTab(type)}
            className={`px-6 py-3 text-xl font-bold transition-colors duration-300 rounded-t-lg ${
                activeTab === type 
                ? 'bg-cyan-400/20 text-cyan-300 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 pb-0 border-b-2 border-cyan-400/20 flex justify-between items-end flex-wrap gap-4">
                 <h2 className="text-3xl font-semibold text-slate-100 tracking-wider mb-2">تحلیلگر روند فعالیت</h2>
                 <div className="flex gap-x-2">
                    <TabButton label="حواله‌جات داخلی" type="domestic" />
                    <TabButton label="تبادلات" type="exchange" />
                    <TabButton label="حواله‌جات کمیشن‌کاری" type="commission" />
                 </div>
            </div>
             <div className="p-6 h-96 relative">
                 <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

export default WeeklyTrendChart;