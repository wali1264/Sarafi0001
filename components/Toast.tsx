import React, { useState, useEffect } from 'react';
import { useToastManager } from '../contexts/ToastContext';

interface ToastProps {
    id: number;
    message: string;
    type: 'success' | 'error';
}

const SuccessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const Toast: React.FC<ToastProps> = ({ id, message, type }) => {
    const { removeToast } = useToastManager();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        setIsVisible(true);

        // Set timers to animate out and then remove from state
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for fade-out animation to finish before removing
            setTimeout(() => removeToast(id), 200); // This duration should match the transition duration
        }, 3000); // 3 sec total visible time before starting fade-out

        return () => clearTimeout(timer);
    }, [id, removeToast]);

    const baseClasses = "flex items-center gap-4 w-full max-w-sm p-4 text-slate-100 bg-[#12122E]/90 backdrop-blur-sm border-2 rounded-lg shadow-lg transition-all duration-200 ease-in-out";
    const visibilityClasses = isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full';
    
    const typeClasses = {
        success: 'border-green-500/50',
        error: 'border-red-500/50'
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`}>
            {type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
            <p className="text-xl font-semibold tracking-wider">{message}</p>
        </div>
    );
};

export default Toast;
