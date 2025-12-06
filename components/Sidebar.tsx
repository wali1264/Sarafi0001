import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { permissionModuleTranslations } from '../utils/translations';
import { PermissionModule } from '../types';

interface NavLinkConfig {
    to: string;
    label: string;
    module: PermissionModule;
}

const allNavLinks: NavLinkConfig[] = [
    { to: '/dashboard', label: permissionModuleTranslations.dashboard, module: 'dashboard' },
    { to: '/cashbox', label: permissionModuleTranslations.cashbox, module: 'cashbox' },
    { to: '/domestic-transfers', label: permissionModuleTranslations.domesticTransfers, module: 'domesticTransfers' },
    { to: '/foreign-transfers', label: permissionModuleTranslations.foreignTransfers, module: 'foreignTransfers' },
    { to: '/commission-transfers', label: permissionModuleTranslations.commissionTransfers, module: 'commissionTransfers' },
    { to: '/rented-accounts', label: permissionModuleTranslations.rentedAccounts, module: 'rentedAccounts' },
    { to: '/account-transfers', label: permissionModuleTranslations.accountTransfers, module: 'accountTransfers' },
    { to: '/customers', label: permissionModuleTranslations.customers, module: 'customers' },
    { to: '/partner-accounts', label: permissionModuleTranslations.partnerAccounts, module: 'partnerAccounts' },
    { to: '/expenses', label: permissionModuleTranslations.expenses, module: 'expenses' },
    { to: '/reports', label: permissionModuleTranslations.reports, module: 'reports' },
    { to: '/accounting', label: permissionModuleTranslations.accounting, module: 'accounting' },
    { to: '/settings', label: permissionModuleTranslations.settings, module: 'settings' },
];


const Sidebar: React.FC = () => {
    const { hasPermission } = useAuth();

    const visibleLinks = allNavLinks.filter(link => hasPermission(link.module, 'view'));

    const baseLinkClass = "flex items-center px-6 py-4 text-xl font-medium rounded-r-lg transition-colors duration-200";
    const inactiveLinkClass = "text-slate-400 hover:bg-cyan-400/10 hover:text-slate-100";
    const activeLinkClass = "bg-cyan-400/20 text-cyan-300 font-bold border-r-4 border-cyan-400";

    return (
        <aside className="w-80 bg-[#0A091A] flex-shrink-0" style={{ direction: 'rtl' }}>
            <div className="h-24 flex items-center justify-center border-b-2 border-cyan-400/20">
                <h1 className="text-4xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500" style={{'--tw-text-opacity': 1, textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'} as React.CSSProperties}>
                    Sarrafi Alsheikh
                </h1>
            </div>
            <nav className="mt-10 pr-4">
                <ul>
                    {visibleLinks.map(link => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;