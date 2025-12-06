import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

declare const html2canvas: any;
declare const jspdf: any;

interface ShareButtonProps {
    printableAreaId: string;
    fileName: string;
}

const ShareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);

const ShareButton: React.FC<ShareButtonProps> = ({ printableAreaId, fileName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const { addToast } = useToast();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const shareOrDownload = async (file: File, title: string, text: string) => {
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title, text });
            } catch (error) {
                console.error('Sharing failed:', error);
                addToast("اشتراک گذاری لغو شد.", "error");
            }
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(file);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            addToast(`سند به صورت ${file.type.split('/')[1].toUpperCase()} دانلود شد.`, 'success');
        }
    };

    const handleShare = async (format: 'image' | 'pdf' | 'text') => {
        setIsOpen(false);
        const element = document.getElementById(printableAreaId);
        if (!element) {
            addToast("محتوای قابل اشتراک یافت نشد.", "error");
            return;
        }

        setIsLoading(format);
        try {
            if (format === 'image' || format === 'pdf') {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                if (format === 'image') {
                    canvas.toBlob(async (blob: Blob | null) => {
                        if (blob) {
                            const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
                            await shareOrDownload(file, fileName, `Receipt: ${fileName}`);
                        }
                    }, 'image/png');
                } else { // PDF
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jspdf.jsPDF({
                        orientation: 'p',
                        unit: 'mm',
                        format: 'a4'
                    });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const imgX = (pdfWidth - imgWidth * ratio) / 2;
                    const imgY = 0;
                    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                    
                    const pdfBlob = pdf.output('blob');
                    const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
                    await shareOrDownload(file, fileName, `Document: ${fileName}`);
                }
            } else { // Text
                const textContent = element.innerText;
                if (navigator.share) {
                    await navigator.share({ text: textContent, title: fileName });
                } else {
                    const encodedText = encodeURIComponent(textContent);
                    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                }
            }
        } catch (error) {
            console.error(`Failed sharing as ${format}:`, error);
            addToast(`خطا در اشتراک گذاری به عنوان ${format}.`, "error");
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={!!isLoading}
                className="flex items-center justify-center px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all rounded-md disabled:opacity-60 min-w-[200px]"
            >
                <ShareIcon />
                {isLoading ? `...${{image: 'عکس', pdf: 'PDF', text: 'متن'}[isLoading]}` : 'اشتراک گذاری'}
                 <svg className={`w-5 h-5 ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-full bg-slate-700/90 backdrop-blur-sm border border-slate-500 rounded-md shadow-lg z-10">
                    <button onClick={() => handleShare('image')} className="w-full text-right px-4 py-3 text-lg text-slate-200 hover:bg-slate-600/50">به عنوان عکس (PNG)</button>
                    <button onClick={() => handleShare('pdf')} className="w-full text-right px-4 py-3 text-lg text-slate-200 hover:bg-slate-600/50">به عنوان سند (PDF)</button>
                    <button onClick={() => handleShare('text')} className="w-full text-right px-4 py-3 text-lg text-slate-200 hover:bg-slate-600/50">به عنوان متن</button>
                </div>
            )}
        </div>
    );
};

export default ShareButton;
