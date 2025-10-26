import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);


const Header: React.FC = () => {
    const { user, logout } = useAuth();

    // FIX: Add a type guard. Since this component is only for internal users, this helps TypeScript
    // narrow the type of `user` and allows safe access to properties like `name` and `role`.
    if (!user || user.userType !== 'internal') {
        // This case should not be reached due to routing, but it's a good safeguard.
        return null;
    }

    return (
        <header className="flex items-center justify-between h-24 px-8 border-b-2 border-cyan-400/20">
            <div>
                 <h1 className="text-4xl font-bold text-slate-100 tracking-wider">به صرافی الشیخ خوش آمدید</h1>
                 <p className="text-lg text-slate-400">سیستم عامل صرافی مبتنی بر صدا</p>
            </div>
            <div className="flex items-center space-x-6 space-x-reverse">
                <div className="text-right">
                    <p className="text-2xl text-slate-100 font-semibold">{user.name}</p>
                    <p className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500">{user.role.name || ''}</p>
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
    );
};

export default Header;