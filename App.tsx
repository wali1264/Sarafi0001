
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { PermissionAction, PermissionModule, DomesticTransfer } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import DashboardPage from './pages/DashboardPage';
import CashboxPage from './pages/CashboxPage';
import DomesticTransfersPage from './pages/DomesticTransfersPage';
import ExpensesPage from './pages/ExpensesPage';
import VoiceAssistant from './components/VoiceAssistant';
import PartnerAccountsPage from './pages/PartnerAccountsPage';
import PartnerAccountDetailPage from './pages/PartnerAccountDetailPage';
import AccountTransfersPage from './pages/AccountTransfersPage';
// FIX: ReportsPage is not a default export.
import { ReportsPage } from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import StatementPrintView from './components/StatementPrintView';
import ForeignTransfersPage from './pages/ForeignTransfersPage';
import CommissionTransfersPage from './pages/CommissionTransfersPage';
import TransferPrintView from './components/TransferPrintView';
import PortalLayout from './components/PortalLayout';
import PortalStatementPage from './pages/PortalStatementPage';
import { useApi } from './hooks/useApi';
import AccountingPage from './pages/AccountingPage';
import { RentedAccountProvider } from './contexts/RentedAccountContext';
import RentedAccountsPage from './pages/RentedAccountsPage';
import RentedAccountDetailPage from './pages/RentedAccountDetailPage';
import RentedAccountUserPage from './pages/RentedAccountUserPage';
import { UnifiedBalanceProvider } from './contexts/UnifiedBalanceContext';
import { DedicatedAccountProvider } from './contexts/DedicatedAccountContext';
import DedicatedAccountsPage from './pages/DedicatedAccountsPage';
import DedicatedAccountDetailPage from './pages/DedicatedAccountDetailPage';
import AmanatPage from './pages/AmanatPage';
import { FinancialPulseProvider } from './contexts/FinancialPulseContext';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ApiProvider>
                <ToastProvider>
                    <SarrafAIApp />
                </ToastProvider>
            </ApiProvider>
        </AuthProvider>
    );
};

const PermissionRoute: React.FC<{ module: PermissionModule, action: PermissionAction }> = ({ module, action }) => {
    const { user, hasPermission } = useAuth();
    if (!user) {
        return <Navigate to="/" />;
    }
    return hasPermission(module, action) ? <Outlet /> : <Navigate to="/dashboard" />;
};

const MainLayout: React.FC = () => (
    <div className="flex h-screen bg-[#0D0C22] text-slate-100 font-sans" style={{ direction: 'rtl' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
            <div id="header-container">
                <Header />
            </div>
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
        <div id="voice-assistant">
            <VoiceAssistant />
        </div>
    </div>
);

const StatementPrintWrapper: React.FC<{type: 'customer' | 'partner'}> = ({ type }) => {
    const { customerId, partnerId } = useParams();
    const id = type === 'customer' ? customerId : partnerId;
    if (!id) return <div className="p-10 text-center text-red-500">Error: Missing Customer or Partner ID.</div>;
    return <StatementPrintView entityId={id} type={type} />;
}

const TransferPrintWrapper: React.FC = () => {
    const { transferId } = useParams<{ transferId: string }>();
    const api = useApi();
    const [transfer, setTransfer] = useState<DomesticTransfer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!transferId) {
            setIsLoading(false);
            return;
        }
        api.getDomesticTransferById(transferId).then(data => {
            setTransfer(data || null);
            setIsLoading(false);
        });
    }, [transferId, api]);

    useEffect(() => {
        if (!isLoading && transfer) {
            setTimeout(() => window.print(), 500);
        }
    }, [isLoading, transfer]);
    
    if (isLoading) return <div className="p-10 text-center text-gray-800">در حال بارگذاری سند...</div>;

    return <TransferPrintView transfer={transfer} />;
}


const SarrafAIApp: React.FC = () => {
    const { user } = useAuth();
    
    if (!user) {
        return (
            <>
                <ToastContainer />
                <Login />
            </>
        );
    }

    return (
        <>
            <ToastContainer />
            <HashRouter>
                <FinancialPulseProvider>
                    <RentedAccountProvider>
                        <UnifiedBalanceProvider>
                            <DedicatedAccountProvider>
                                {user.userType === 'internal' ? (
                                    <Routes>
                                        {/* Routes with the main layout */}
                                        <Route element={<MainLayout />}>
                                            <Route element={<PermissionRoute module="dashboard" action="view" />}>
                                                <Route path="/dashboard" element={<DashboardPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="reports" action="view" />}>
                                                <Route path="/reports" element={<ReportsPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="cashbox" action="view" />}>
                                                <Route path="/cashbox" element={<CashboxPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="domesticTransfers" action="view" />}>
                                                <Route path="/domestic-transfers" element={<DomesticTransfersPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="foreignTransfers" action="view" />}>
                                                <Route path="/foreign-transfers" element={<ForeignTransfersPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="commissionTransfers" action="view" />}>
                                                <Route path="/commission-transfers" element={<CommissionTransfersPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="rentedAccounts" action="view" />}>
                                                <Route path="/rented-accounts" element={<RentedAccountsPage />} />
                                                <Route path="/rented-accounts/:accountId" element={<RentedAccountDetailPage />} />
                                                <Route path="/rented-accounts/user/:userIdentifier" element={<RentedAccountUserPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="dedicatedAccounts" action="view" />}>
                                                <Route path="/dedicated-accounts" element={<DedicatedAccountsPage />} />
                                                <Route path="/dedicated-accounts/:accountId" element={<DedicatedAccountDetailPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="partnerAccounts" action="view" />}>
                                                <Route path="/partner-accounts" element={<PartnerAccountsPage />} />
                                                <Route path="/partner-accounts/:partnerId" element={<PartnerAccountDetailPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="accountTransfers" action="view" />}>
                                                <Route path="/account-transfers" element={<AccountTransfersPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="customers" action="view" />}>
                                                <Route path="/customers" element={<CustomersPage />} />
                                                <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="expenses" action="view" />}>
                                                <Route path="/expenses" element={<ExpensesPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="amanat" action="view" />}>
                                                <Route path="/amanat" element={<AmanatPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="settings" action="view" />}>
                                                <Route path="/settings" element={<SettingsPage />} />
                                            </Route>
                                            <Route element={<PermissionRoute module="accounting" action="view" />}>
                                                <Route path="/accounting" element={<AccountingPage />} />
                                            </Route>
                                            <Route path="*" element={<Navigate to="/dashboard" />} />
                                        </Route>
                                        
                                        {/* Routes without the main layout (e.g., for printing) */}
                                        <Route path="/print/transfer/:transferId" element={<TransferPrintWrapper />} />
                                        <Route path="/print/customer-statement/:customerId" element={<StatementPrintWrapper type="customer" />} />
                                        <Route path="/print/partner-statement/:partnerId" element={<StatementPrintWrapper type="partner" />} />
                                    </Routes>
                                ) : (
                                    <Routes>
                                        <Route element={<PortalLayout />}>
                                            <Route path="/portal/statement" element={<PortalStatementPage />} />
                                            <Route path="*" element={<Navigate to="/portal/statement" />} />
                                        </Route>
                                    </Routes>
                                )}
                            </DedicatedAccountProvider>
                        </UnifiedBalanceProvider>
                    </RentedAccountProvider>
                </FinancialPulseProvider>
            </HashRouter>
        </>
    );
};


export default App;
