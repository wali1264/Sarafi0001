
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApi } from '../hooks/useApi';
import { Currency } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface FinancialPulseContextType {
    netWorth: number; // In USD
    totalAssets: number; // In USD
    totalLiabilities: number; // In USD
    rates: { [key: string]: number }; // Rates relative to USD
    updateRate: (currency: string, rate: string) => Promise<void>;
    isLoading: boolean;
    lastUpdated: Date;
}

const FinancialPulseContext = createContext<FinancialPulseContextType | undefined>(undefined);

export const FinancialPulseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const api = useApi();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [rates, setRates] = useState<{ [key: string]: number }>({ 'USD': 1 });
    const [balances, setBalances] = useState({
        cashbox: [] as any[],
        bank: [] as any[],
        customers: [] as any[],
        partners: [] as any[],
        rentedAccounts: [] as any[],
        commissionLiability: [] as any[],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // 1. Fetch Rates from DB
    const fetchRates = useCallback(async () => {
        const ratesData = await api.getExchangeRates();
        const numericRates: { [key: string]: number } = { 'USD': 1 };
        ratesData.forEach(r => {
            numericRates[r.currency] = Number(r.rate_to_usd);
        });
        setRates(numericRates);
    }, [api]);

    // 2. Update Rate in DB
    const updateRate = useCallback(async (currency: string, rateStr: string) => {
        if (!user || user.userType !== 'internal') return;
        
        const val = parseFloat(persianToEnglishNumber(rateStr));
        if (!isNaN(val)) {
            // Optimistic update
            setRates(prev => ({ ...prev, [currency]: val }));
            
            // Send to DB
            const result = await api.updateExchangeRate(currency, val, user);
            if ('error' in result) {
                addToast(`خطا در ذخیره نرخ ${currency}: ${result.error}`, 'error');
                // Revert logic could be added here if needed, but fetchRates will eventually sync it
            } else {
                addToast(`نرخ ${currency} ذخیره شد.`, 'success');
            }
        }
    }, [api, user, addToast]);

    // 3. Fetch All Data
    const fetchAllFinancialData = useCallback(async () => {
        try {
            // Fetch everything in parallel
            const [cashbox, bank, customers, partners, rentedData, commissions, ratesData] = await Promise.all([
                api.getCashboxBalances(),
                api.getBankAccounts(),
                api.getCustomers(),
                api.getPartnerAccounts(),
                api.getRentedAccountsData(),
                api.getCommissionTransfers(),
                api.getExchangeRates(), // Fetch rates here too to ensure sync
            ]);

            setBalances({
                cashbox: cashbox || [],
                bank: bank || [],
                customers: customers || [],
                partners: partners || [],
                rentedAccounts: rentedData.accounts || [],
                commissionLiability: commissions || [],
            });

            // Update rates from DB
            const numericRates: { [key: string]: number } = { 'USD': 1 };
            (ratesData || []).forEach(r => {
                numericRates[r.currency] = Number(r.rate_to_usd);
            });
            setRates(numericRates);

            setLastUpdated(new Date());
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching financial pulse data:", error);
            setIsLoading(false);
        }
    }, [api]);

    // 4. Real-time Subscriptions
    useEffect(() => {
        fetchAllFinancialData();

        const channel = supabase.channel('financial_pulse_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_balances' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_accounts' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rented_accounts' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'commission_transfers' }, fetchAllFinancialData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_rates' }, fetchRates) // Listen for rate changes specifically
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAllFinancialData, fetchRates]);

    // 5. Calculate Totals (Memoized)
    const totals = useMemo(() => {
        let assetsUSD = 0;
        let liabilitiesUSD = 0;

        const convertToUSD = (amount: number, currency: string) => {
            const rate = rates[currency];
            if (!rate || rate === 0) return 0;
            return amount / rate;
        };

        // A. Liquid Assets (Cashbox)
        balances.cashbox.forEach(cb => {
            if (cb.balance > 0) assetsUSD += convertToUSD(cb.balance, cb.currency);
        });

        // B. Bank Accounts (Real Assets)
        balances.bank.forEach(b => {
            if (b.balance > 0 && b.status === 'Active') assetsUSD += convertToUSD(b.balance, b.currency);
        });

        // C. Rented Accounts (Real Assets held by us)
        balances.rentedAccounts.forEach(ra => {
            if (ra.balance > 0 && ra.status === 'Active') assetsUSD += convertToUSD(ra.balance, Currency.IRT_BANK);
        });

        // D. Customers & Partners (Receivables vs Payables)
        const processEntity = (entity: any) => {
            for (const key in entity.balances) {
                const currency = key;
                const amount = entity.balances[currency] || 0;
                if (amount > 0) {
                    // Positive balance means we owe them -> Liability
                    liabilitiesUSD += convertToUSD(amount, currency);
                } else if (amount < 0) {
                    // Negative balance means they owe us -> Asset (Receivable)
                    assetsUSD += convertToUSD(Math.abs(amount), currency);
                }
            }
        };

        balances.customers.forEach(processEntity);
        balances.partners.forEach(processEntity);

        // E. Pending Commission Transfers (Liability)
        // Funds received but not yet paid out = Liability
        const pendingCommissions = balances.commissionLiability.filter((t: any) => ['PendingExecution', 'PendingWithdrawalApproval'].includes(t.status));
        pendingCommissions.forEach((t: any) => {
            const commissionAmount = t.amount * (t.commission_percentage / 100);
            const liabilityAmount = t.amount - commissionAmount;
            // The principal is a liability (we must pay it out)
            liabilitiesUSD += convertToUSD(liabilityAmount, t.currency);
        });

        return {
            assets: assetsUSD,
            liabilities: liabilitiesUSD,
            netWorth: assetsUSD - liabilitiesUSD
        };

    }, [balances, rates]);

    return (
        <FinancialPulseContext.Provider value={{
            netWorth: totals.netWorth,
            totalAssets: totals.assets,
            totalLiabilities: totals.liabilities,
            rates,
            updateRate,
            isLoading,
            lastUpdated
        }}>
            {children}
        </FinancialPulseContext.Provider>
    );
};

export const useFinancialPulse = () => {
    const context = useContext(FinancialPulseContext);
    if (context === undefined) {
        throw new Error('useFinancialPulse must be used within a FinancialPulseProvider');
    }
    return context;
};
