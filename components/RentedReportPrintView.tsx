import React from 'react';

interface ReportResult {
    title: string;
    summary: { label: string; value: string; currency: string }[];
    headers: string[];
    rows: (string | number)[][];
}

interface RentedReportPrintViewProps {
    reportData: ReportResult;
}

const RentedReportPrintView: React.FC<RentedReportPrintViewProps> = ({ reportData }) => {
    const { title, summary, headers, rows } = reportData;

    return (
        <div id="printable-area" className="bg-white text-black p-8 font-[sans-serif]" style={{ direction: 'rtl', width: '21cm', minHeight: '29.7cm', margin: 'auto' }}>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-8">
                <div>
                    <h1 className="text-4xl font-bold" style={{ fontFamily: "'Times New Roman', serif" }}>صرافی الشیخ</h1>
                    <p className="text-xl text-gray-600 mt-1">گزارش حسابات کرایی</p>
                </div>
                <div className="text-left text-sm text-gray-700">
                    <p><strong>عنوان گزارش:</strong> {title}</p>
                    <p><strong>تاریخ گزارش:</strong> {new Date().toLocaleDateString('fa-IR')}</p>
                </div>
            </header>
            
            <main>
                <div className="flex gap-4 mb-6 text-center text-sm">
                    {summary.map(item => (
                        <div key={item.label} className="flex-1 bg-gray-100 p-2 rounded border">
                            <h4 className="font-bold">{item.label}</h4>
                            <p className="font-mono text-lg">{item.value} <span className="text-sm">{item.currency}</span></p>
                        </div>
                    ))}
                </div>
                <table className="w-full text-sm border-collapse border border-gray-400">
                    <thead className="bg-gray-200">
                        <tr className="text-right">
                            {headers.map(h => <th key={h} className="p-2 border">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length > 0 ? rows.map((row, i) => (
                            <tr key={i} className="odd:bg-white even:bg-gray-50">
                                {row.map((cell, j) => (
                                    <td key={j} className="p-2 border">{typeof cell === 'number' ? new Intl.NumberFormat('en-US').format(cell) : cell}</td>
                                ))}
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={headers.length} className="text-center p-6 text-gray-500 border">هیچ رکوردی برای نمایش وجود ندارد.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
        </div>
    );
};

export default RentedReportPrintView;