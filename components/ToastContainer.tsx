import React from 'react';
import Toast from './Toast';
import { useToastManager } from '../contexts/ToastContext';

const ToastContainer: React.FC = () => {
    const { toasts } = useToastManager();

    return (
        <div className="fixed top-24 left-8 z-[100] space-y-3" style={{direction: 'rtl'}}>
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
        </div>
    );
};

export default ToastContainer;
