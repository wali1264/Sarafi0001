import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error';
}

interface ToastContextType {
    addToast: (message: string, type: 'success' | 'error') => void;
    removeToast: (id: number) => void;
    toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    }, []);
    
    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): { addToast: (message: string, type: 'success' | 'error') => void } => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return { addToast: context.addToast };
};

export const useToastManager = (): ToastContextType => {
     const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastManager must be used within a ToastProvider');
    }
    return context;
}
