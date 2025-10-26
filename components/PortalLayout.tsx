import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Outlet } from 'react-router-dom';

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const PortalLayout: React.FC = () => {
    const { user, logout } = useAuth();
    
    // FIX: Correctly access the user's name. For internal users it's 'name' not 'details.name'.
    // For external users, it's on the 'entity' property.
    const entityName = user ? (user.userType === 'internal' ? user.name : user.entity.name) : '';


    return (
        <div className="min-h-screen bg-[#0D0C22] text-slate-100 font-sans" style={{ direction: 'rtl' }}>
            <header className="flex items-center justify-between h-24 px-8 border-b-2 border-cyan-400/20 bg-[#0A091A]">
                <h1 className="text-4xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500" style={{'--tw-text-opacity': 1, textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'} as React.CSSProperties}>
                    پورتال صرافی الشیخ
                </h1>
                <div className="flex items-center space-x-6 space-x-reverse">
                    <div className="text-right">
                        <p className="text-2xl text-slate-100 font-semibold">{entityName}</p>
                        <p className="text-lg font-medium text-slate-400">
                            {user?.userType === 'customer' ? 'مشتری' : 'همکار'}
                        </p>
                    </div>
                    <button 
                        onClick={logout}
                        className="p-3 rounded-full text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D0C22] focus:ring-cyan-400 transition-colors duration-300"
                        aria-label="خروج"
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </header>
            <main className="p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default PortalLayout;