import React from 'react';
import { DomesticTransfer } from '../types';
import { statusTranslations } from '../utils/translations';

interface TransferPrintViewProps {
    transfer: DomesticTransfer | null;
    partnerProvince?: string;
}

const TransferPrintView: React.FC<TransferPrintViewProps> = ({ transfer, partnerProvince }) => {
    
    if (!transfer) {
        return <div className="text-center p-10 text-gray-700">سند یافت نشد.</div>;
    }

    const isIncoming = !!transfer.partnerReference;
    const totalAmount = transfer.amount + transfer.commission;

    return (
        <div id="printable-area" className="bg-white text-black p-8 max-w-2xl mx-auto font-sans" style={{ direction: 'rtl' }}>
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
                <div>
                    <h1 className="text-3xl font-bold">صرافی الشیخ</h1>
                    <p className="text-lg">رسید حواله داخلی</p>
                </div>
                <div className="text-left">
                    <p><strong>کد حواله:</strong> <span className="font-mono">{transfer.id}</span></p>
                    {isIncoming && <p><strong>کد همکار:</strong> <span className="font-mono">{transfer.partnerReference}</span></p>}
                    <p><strong>تاریخ:</strong> {new Date(transfer.createdAt).toLocaleString('fa-IR')}</p>
                </div>
            </header>

            <main className="my-8 space-y-6">
                <div className="border border-black p-4">
                    <h2 className="text-xl font-bold mb-2">مشخصات فرستنده</h2>
                    <div className="grid grid-cols-2 gap-x-4">
                        <p><strong>نام:</strong> {transfer.sender.name}</p>
                        <p><strong>شماره تذکره:</strong> {transfer.sender.tazkereh}</p>
                    </div>
                </div>

                <div className="border border-black p-4">
                    <h2 className="text-xl font-bold mb-2">مشخصات گیرنده</h2>
                    <div className="grid grid-cols-2 gap-x-4">
                        <p><strong>نام:</strong> {transfer.receiver.name}</p>
                        <p><strong>شماره تذکره:</strong> {transfer.receiver.tazkereh}</p>
                    </div>
                </div>
                
                <div className="border border-black p-4">
                     <h2 className="text-xl font-bold mb-2">جزئیات مالی</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-lg">
                        <p><strong>مبلغ اصلی:</strong></p>
                        <p className="font-mono text-left">{new Intl.NumberFormat('fa-IR').format(transfer.amount)} {transfer.currency}</p>
                        
                        {!isIncoming && transfer.commission > 0 && (
                            <>
                                <p><strong>کارمزد:</strong></p>
                                <p className="font-mono text-left">{new Intl.NumberFormat('fa-IR').format(transfer.commission)} {transfer.currency}</p>
                                
                                <p className="font-bold border-t pt-2 mt-2">مبلغ کل دریافتی:</p>
                                <p className="font-mono font-bold text-left border-t pt-2 mt-2">{new Intl.NumberFormat('fa-IR').format(totalAmount)} {transfer.currency}</p>
                            </>
                        )}
                        
                         <p className="col-span-2 pt-2 mt-2 border-t">
                             <strong>مقصد / مبدا:</strong> {transfer.destination_province} (همکار: {transfer.partnerSarraf} {partnerProvince ? ` - ${partnerProvince}` : ''})
                         </p>
                         <p className="col-span-2"><strong>وضعیت فعلی:</strong> {statusTranslations[transfer.status]}</p>
                    </div>
                </div>

            </main>

            <footer className="pt-16">
                <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">امضای مشتری / گیرنده</p>
                    </div>
                     <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">مهر و امضای صرافی</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TransferPrintView;