
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { RentedAccount, RentedAccountTransaction, RentedAccountUser, Currency, Customer, PartnerAccount, User } from '../types';
import { useAuth } from './AuthContext';
import { useApi } from '../hooks/useApi';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContext';

// --- CONTEXT INTERFACE ---
interface RentedAccountContextType {
    accounts: RentedAccount[];
    transactions: RentedAccountTransaction[];
    users: RentedAccountUser[];
    addAccount: (details: Omit<RentedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => Promise<void>;
    addTransaction: (details: Omit<RentedAccountTransaction, 'id' | 'created_by'>) => Promise<boolean>;
    toggleAccountStatus: (accountId: string) => Promise<void>;
    hideGuest: (userIdentifier: string) => void; // New capability
    customers: Customer[];
    partners: PartnerAccount[];
    isLoading: boolean;
}

const RentedAccountContext = createContext<RentedAccountContextType | undefined>(undefined);

export const RentedAccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const api = useApi();
    const { addToast } = useToast();
    
    const [accounts, setAccounts] = useState<RentedAccount[]>([]);
    const [transactions, setTransactions] = useState<RentedAccountTransaction[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Runtime state for hidden guests (no database, no localStorage)
    const [hiddenGuestIds, setHiddenGuestIds] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        // To prevent flicker on forced re-fetch, we don't set loading to true here
        // if data already exists.
        if (accounts.length === 0) {
            setIsLoading(true);
        }
        const [rentedData, customersData, partnersData] = await Promise.all([
            api.getRentedAccountsData(),
            api.getCustomers(),
            api.getPartnerAccounts(),
        ]);
        
        setAccounts(rentedData.accounts || []);
        
        const processedTransactions = (rentedData.transactions || []).map(tx => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
        }));
        setTransactions(processedTransactions);

        setCustomers(customersData || []);
        setPartners(partnersData || []);

        setIsLoading(false);
    }, [api, accounts.length]);


    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('rented-accounts-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rented_accounts' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rented_account_transactions' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_accounts' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const addAccount = useCallback(async (details: Omit<RentedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => {
        if (!user || user.userType !== 'internal') return;
        const result = await api.createRentedAccount({ ...details, user });
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast('حساب کرایی با موفقیت ایجاد شد.', 'success');
            await fetchData(); // Force refresh
        }
    }, [user, api, addToast, fetchData]);
    
    const toggleAccountStatus = useCallback(async (accountId: string) => {
        if (!user || user.userType !== 'internal') return;
        const result = await api.toggleRentedAccountStatus({ accountId, user });
        if (result.error) {
            addToast(result.error, 'error');
        } else {
            addToast('وضعیت حساب با موفقیت تغییر کرد.', 'success');
            await fetchData(); // Force refresh
        }
    }, [user, api, addToast, fetchData]);

    const addTransaction = useCallback(async (details: Omit<RentedAccountTransaction, 'id' | 'created_by'>): Promise<boolean> => {
        if (!user || user.userType !== 'internal') return false;
        
        const result = await api.createRentedTransaction({ ...details, user });

        if ('error' in result) {
            addToast(result.error, 'error');
            return false;
        } else {
            addToast('تراکنش با موفقیت ثبت شد.', 'success');
            await fetchData(); // Force a refresh to ensure UI is updated.
            return true;
        }
    }, [user, api, addToast, fetchData]);

    const hideGuest = useCallback((userIdentifier: string) => {
        setHiddenGuestIds(prev => [...prev, userIdentifier]);
        addToast('دفتر حساب مشتری گذری موقتاً مخفی شد.', 'success');
    }, [addToast]);

    // 1. Calculate raw data (balances) for everyone, including potentially hidden guests.
    const calculatedData = useMemo(() => {
        const allUsersMap = new Map<string, { name: string; type: 'Customer' | 'Partner' | 'Guest' }>();
        customers.forEach(c => allUsersMap.set(`customer-${c.id}`, { name: c.name, type: 'Customer' }));
        partners.forEach(p => allUsersMap.set(`partner-${p.id}`, { name: p.name, type: 'Partner' }));

        const userAggregates = new Map<string, { balance: number; lastActivity: Date; entityId: string }>();
        const accountBalances = new Map<string, number>();

        const sortedTransactions = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        sortedTransactions.forEach(tx => {
            let userIdentifier = '';
            let entityId = '';
            let name = '';
            
            if (tx.user_type === 'Guest') {
                entityId = tx.guest_name || 'Unknown';
                userIdentifier = `guest-${entityId}`;
                name = tx.guest_name || 'مشتری گذری';
            } else {
                userIdentifier = `${tx.user_type.toLowerCase()}-${tx.user_id}`;
                entityId = tx.user_id!;
            }

            // Add guest to map if not exists
            if (tx.user_type === 'Guest' && !allUsersMap.has(userIdentifier)) {
                allUsersMap.set(userIdentifier, { name, type: 'Guest' });
            }

            const currentUserData = userAggregates.get(userIdentifier) || { balance: 0, lastActivity: new Date(0), entityId };
            
            const amountChange = tx.type === 'deposit' ? tx.amount : -tx.total_transaction_amount;
            currentUserData.balance += amountChange;
            currentUserData.lastActivity = tx.timestamp;
            userAggregates.set(userIdentifier, currentUserData);
            
            const currentAccountBalance = accountBalances.get(tx.rented_account_id) || 0;
            accountBalances.set(tx.rented_account_id, currentAccountBalance + amountChange);
        });
        
        const finalUsers: RentedAccountUser[] = Array.from(userAggregates.entries()).map(([id, data]) => {
            const userInfo = allUsersMap.get(id);
            return {
                id,
                name: userInfo?.name || (id.startsWith('guest-') ? id.replace('guest-', '') : 'کاربر حذف شده'),
                type: userInfo?.type || 'Customer',
                balance: data.balance,
                lastActivity: data.lastActivity,
                entityId: data.entityId,
            };
        });

        const finalAccounts = accounts.map(acc => ({
            ...acc,
            balance: accountBalances.get(acc.id) || 0,
        }));

        return { finalAccounts, finalUsers };

    }, [accounts, transactions, customers, partners]);

    // 2. Smart Auto-Unhide Logic
    // If a hidden guest now has a non-zero balance (due to a new transaction), remove them from hidden list.
    useEffect(() => {
        const guestsToRestore = calculatedData.finalUsers
            .filter(u => hiddenGuestIds.includes(u.id) && u.balance !== 0)
            .map(u => u.id);
        
        if (guestsToRestore.length > 0) {
            setHiddenGuestIds(prev => prev.filter(id => !guestsToRestore.includes(id)));
        }
    }, [calculatedData.finalUsers, hiddenGuestIds]);

    // 3. Filter the users list for display
    const visibleUsers = useMemo(() => {
        return calculatedData.finalUsers.filter(u => !hiddenGuestIds.includes(u.id));
    }, [calculatedData.finalUsers, hiddenGuestIds]);
    
    const value = useMemo(() => ({
        accounts: calculatedData.finalAccounts, 
        transactions, 
        users: visibleUsers, // Only return visible users
        addAccount, 
        addTransaction,
        toggleAccountStatus,
        hideGuest,
        customers,
        partners,
        isLoading
    }), [calculatedData.finalAccounts, transactions, visibleUsers, addAccount, addTransaction, toggleAccountStatus, hideGuest, customers, partners, isLoading]);

    return (
        <RentedAccountContext.Provider value={value}>
            {children}
        </RentedAccountContext.Provider>
    );
};

export const useRentedAccounts = (): RentedAccountContextType => {
    const context = useContext(RentedAccountContext);
    if (context === undefined) {
        throw new Error('useRentedAccounts must be used within a RentedAccountProvider');
    }
    return context;
};
