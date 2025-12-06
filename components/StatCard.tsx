import React, { useRef, useLayoutEffect } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    accent: 'cyan' | 'magenta' | 'green' | 'plain';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, accent }) => {
    const valueRef = useRef<HTMLParagraphElement>(null);

    const accentClass = {
        cyan: 'text-cyan-300',
        magenta: 'text-fuchsia-400',
        green: 'text-green-400',
        plain: 'text-slate-100'
    }[accent];

    const shadowClass = {
        cyan: 'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
        magenta: 'shadow-[0_0_20px_rgba(255,0,255,0.3)]',
        green: 'shadow-[0_0_20px_rgba(74,222,128,0.3)]',
        plain: 'shadow-lg'
    }[accent];

    useLayoutEffect(() => {
        const resizeText = () => {
            const element = valueRef.current;
            if (!element) return;
            
            // Reset font size to the Tailwind base class size to recalculate
            element.style.fontSize = ''; 
            
            const baseFontSize = parseFloat(window.getComputedStyle(element).fontSize);
            let currentFontSize = baseFontSize;

            // Check for overflow. The element's clientWidth is the available space.
            // Using a small buffer (e.g., -10) can prevent text from touching the edges.
            while (element.scrollWidth > (element.clientWidth) && currentFontSize > 18) { // Min font size of 18px
                currentFontSize -= 1; // Decrement slowly for precision
                element.style.fontSize = `${currentFontSize}px`;
            }
        };

        // Run on initial render and when value changes
        resizeText();

        // Re-run on window resize for full responsiveness
        window.addEventListener('resize', resizeText);
        return () => window.removeEventListener('resize', resizeText);

    }, [value]);

    return (
        <div 
            className={`bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right transition-all duration-300 hover:border-cyan-400/50 hover:-translate-y-1 flex flex-col justify-between min-h-[150px] ${shadowClass}`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
            <h3 className="text-2xl font-semibold text-slate-300 tracking-wider">{title}</h3>
            <p 
                ref={valueRef} 
                className={`mt-2 text-6xl font-bold whitespace-nowrap overflow-hidden text-ellipsis ${accentClass}`}
            >
                {value}
            </p>
        </div>
    );
};

export default StatCard;