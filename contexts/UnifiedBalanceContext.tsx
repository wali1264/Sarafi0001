import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useRentedAccounts } from './RentedAccountContext';
import { Customer, PartnerAccount, Currency } from '../types';

interface UnifiedBalanceContextType {
    unifiedCustomers: Customer[];
    getUnifiedCustomerById: (id: string) => Customer | undefined;
    getRentedIrtBalance: (customerId: string) => number;
}

const UnifiedBalanceContext = createContext<UnifiedBalanceContextType | undefined>(undefined);

export const UnifiedBalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { users: rentedUsers, customers: baseCustomers, isLoading } = useRentedAccounts();
    
    const customerRentedBalances = useMemo(() => {
        const map = new Map<string, number>();
        if (rentedUsers) {
            rentedUsers.forEach(user => {
                if (user.type === 'Customer') {
                    map.set(user.entityId, user.balance);
                }
            });
        }
        return map;
    }, [rentedUsers]);

    // This context now simply passes through the base customers.
    // The "unification" of display happens at the component level.
    const unifiedCustomers = useMemo(() => {
        if (isLoading || !baseCustomers) {
            return [];
        }
        return baseCustomers;
    }, [baseCustomers, isLoading]);

    const getUnifiedCustomerById = (id: string) => {
        return unifiedCustomers.find(c => c.id === id);
    };

    const getRentedIrtBalance = (customerId: string): number => {
        return customerRentedBalances.get(customerId) || 0;
    };
    
    const value = {
        unifiedCustomers,
        getUnifiedCustomerById,
        getRentedIrtBalance,
    };

    return (
        <UnifiedBalanceContext.Provider value={value}>
            {children}
        </UnifiedBalanceContext.Provider>
    );
};

export const useUnifiedBalance = (): UnifiedBalanceContextType => {
    const context = useContext(UnifiedBalanceContext);
    if (context === undefined) {
        throw new Error('useUnifiedBalance must be used within a UnifiedBalanceProvider');
    }
    return context;
};
