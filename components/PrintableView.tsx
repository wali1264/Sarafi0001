
import React, { useEffect, useState } from 'react';
import { CashboxRequest, Customer } from '../types';
import { useApi } from '../hooks/useApi';
import { numberToWords } from '../utils/numberToWords';
import { formatTrackingCode } from '../utils/idGenerator';

interface PrintableViewProps {
    request: CashboxRequest;
    printNote?: string;
    id: string;
}

const DetailRow: React.FC<{ label: string; value?: string | null; className?: string, valueClassName?: string }> = ({ label, value, className = '', valueClassName = '' }) => {
    if (!value) return null;
    return (
        <div className={`flex justify-between items-baseline py-3 px-4 ${className}`}>
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className={`text-gray-900 ${valueClassName}`}>{value}</span>
        </div>
    );
};

const PrintableView: React.FC<PrintableViewProps> = ({ request, printNote, id }) => {
    const api = useApi();
    const [customer, setCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        if (request.customer_code) {
            api.findCustomerByCodeOrName(request.customer_code).then(customerData => {
                if (customerData) {
                    setCustomer(customerData);
                }
            });
        }
    }, [request.customer_code, api]);

    const isWithdrawal = request.request_type === 'withdrawal';
    const title = isWithdrawal ? 'سند برداشت از صندوق (برد)' : 'سند واریز به صندوق (رسید)';
    const amountInWords = numberToWords(request.amount);

    const signature1Label = isWithdrawal ? 'امضای تحویل گیرنده' : 'امضای واریز کننده';
    const signature2Label = isWithdrawal ? 'امضای پرداخت کننده (صندوقدار)' : 'امضای تحویل گیرنده (صندوقدار)';

    return (
        <div id={id} className="printable-area bg-white text-black p-10 font-sans shadow-2xl" style={{ direction: 'rtl', width: '210mm', minHeight: '297mm', margin: 'auto', fontSize: '14pt' }}>
            <div className="flex flex-col h-full">
                <header className="flex justify-between items-start pb-6 border-b-4 border-gray-800">
                    <div>
                        <h1 className="text-5xl font-extrabold text-gray-900">صرافی الشیخ</h1>
                    </div>
                    <div className="text-left text-lg">
                        <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                    </div>
                </header>

                <main className="my-10 flex-grow">
                    
                    <div className="border-2 border-black p-6 rounded-lg">
                         <div className="text-center mb-6">
                            <p className="text-2xl text-gray-600">مبلغ</p>
                            <p className="text-6xl font-extrabold font-mono text-black my-2">
                                {new Intl.NumberFormat('fa-IR-u-nu-latn').format(request.amount)}
                                <span className="text-4xl font-semibold mr-3">{request.currency}</span>
                            </p>
                            <p className="text-xl font-semibold text-gray-700">{amountInWords} {request.currency.replace('_', ' ')}</p>
                        </div>
                        
                        <div className="mt-8 border-t-2 border-dashed border-gray-400 pt-6">
                             <h3 className="text-2xl font-bold mb-4 text-center text-gray-800 border-b pb-2">مشخصات تراکنش</h3>
                             <div className="text-lg space-y-2">
                                <DetailRow label="کد رهگیری سند" value={formatTrackingCode(request.created_at)} valueClassName="font-mono text-2xl font-bold" className="bg-gray-100 rounded-t-lg" />
                                <DetailRow label="تاریخ ثبت" value={new Date(request.created_at).toLocaleString('fa-IR-u-nu-latn')} />
                                <DetailRow label="درخواست کننده" value={request.requested_by} className="bg-gray-100" />
                                <DetailRow label="تایید کننده" value={request.resolved_by} />
                                <DetailRow label="تاریخ تایید" value={request.resolved_at ? new Date(request.resolved_at).toLocaleString('fa-IR-u-nu-latn') : null} className="bg-gray-100" />
                                {customer && <DetailRow label="مربوط به مشتری" value={`${customer.name} (کد: ${customer.code})`} />}
                             </div>
                        </div>

                        {request.linked_entity && (
                            <div className="mt-6 border-t-2 border-dashed border-gray-400 pt-6">
                                <h3 className="text-xl font-bold mb-2 text-gray-800">تراکنش مرتبط</h3>
                                <p className="bg-gray-100 p-3 rounded-md text-lg">{request.linked_entity.description} (کد: {formatTrackingCode(new Date()) /* Placeholder as linked entity date unknown here, usually redundant */})</p>
                            </div>
                        )}
                        
                        {request.currency === 'IRT_BANK' && (
                             <div className="mt-6 border-t-2 border-dashed border-gray-400 pt-6">
                                <h3 className="text-xl font-bold mb-2 text-gray-800">جزئیات بانکی</h3>
                                 <div className="bg-gray-100 p-3 rounded-md text-lg space-y-2">
                                    <DetailRow label="حساب مبدا" value={request.source_account_number} />
                                    <DetailRow label="حساب مقصد" value={request.destination_account_number} />
                                 </div>
                            </div>
                        )}

                        <div className="mt-6 border-t-2 border-dashed border-gray-400 pt-6">
                             <h3 className="text-xl font-bold mb-2 text-gray-800">شرح اصلی</h3>
                             <p className="bg-gray-100 p-3 rounded-md min-h-[60px] text-lg">{request.reason}</p>
                        </div>
                        
                        {printNote && (
                            <div className="mt-6 border-t-2 border-dashed border-gray-400 pt-6">
                                <h3 className="text-xl font-bold mb-2 text-gray-800">یادداشت ضمیمه چاپ</h3>
                                <p className="bg-yellow-100 border-2 border-dashed border-yellow-400 p-3 rounded-md whitespace-pre-wrap text-lg">{printNote}</p>
                            </div>
                        )}

                    </div>

                </main>

                <footer className="pt-10">
                    <div className="grid grid-cols-3 gap-12 text-center text-lg">
                        <div>
                            <div className="h-24 mb-2"></div>
                            <p className="border-t-2 border-gray-500 pt-2 font-bold">{signature1Label}</p>
                        </div>
                        <div>
                            <div className="h-24 mb-2"></div>
                            <p className="border-t-2 border-gray-500 pt-2 font-bold">{signature2Label}</p>
                        </div>
                        <div>
                            <div className="h-24 mb-2"></div>
                            <p className="border-t-2 border-gray-500 pt-2 font-bold">مهر صرافی</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PrintableView;
