
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { DedicatedAccount, DedicatedAccountTransaction, Currency, Customer, PartnerAccount } from '../types';
import { useAuth } from './AuthContext';

// --- MOCK DATA ---
const now = new Date();
const yesterday = new Date();
yesterday.setDate(now.getDate() - 1);
const dayBefore = new Date();
dayBefore.setDate(now.getDate() - 2);

const mockAccounts: DedicatedAccount[] = [
    { id: 'acc_1', owner_id: 'cust_1', owner_type: 'Customer', owner_name: 'مشتری نمونه ۱', bank_name: 'ملت', account_holder: 'صرافی الشیخ (برای مشتری ۱)', account_number: '111111', balance: 4622700, currency: Currency.IRT_BANK, created_at: new Date(), status: 'Active' },
    { id: 'acc_2', owner_id: 'part_1', owner_type: 'Partner', owner_name: 'همکار نمونه هرات', bank_name: 'صادرات', account_holder: 'صرافی الشیخ (برای همکار هرات)', account_number: '222222', balance: 7960000, currency: Currency.IRT_BANK, created_at: new Date(), status: 'Active' },
    { id: 'acc_3', owner_id: 'cust_2', owner_type: 'Customer', owner_name: 'مشتری ویژه تهران', bank_name: 'ملی', account_holder: 'صرافی الشیخ (مشتری تهران)', account_number: '333333', balance: 13679000, currency: Currency.IRT_BANK, created_at: dayBefore, status: 'Active' },
    { id: 'acc_4', owner_id: 'part_2', owner_type: 'Partner', owner_name: 'همکار کابل', bank_name: 'تجارت', account_holder: 'صرافی الشیخ (همکار کابل)', account_number: '444444', balance: 6420000, currency: Currency.IRT_BANK, created_at: dayBefore, status: 'Inactive' },
];

const mockTransactions: DedicatedAccountTransaction[] = [
    // --- TODAY'S TRANSACTIONS ---
    { id: 'tx_3', account_id: 'acc_1', type: 'withdrawal', amount: 15000, commission_amount: 300, total_deducted: 15300, timestamp: new Date(now.getTime() - 1000 * 60 * 5), created_by: 'مدیر کل', destination_account: '555-444', receipt_serial: 'QWE-3' },
    { id: 'tx_5', account_id: 'acc_1', type: 'deposit', amount: 250000, commission_amount: 0, total_deducted: 250000, timestamp: new Date(now.getTime() - 1000 * 60 * 30), created_by: 'ادمین سیستم', source_bank: 'پاسارگاد', source_account: '202-303', receipt_serial: 'ASD-5', source_card_last_digits: '3344' },
    { id: 'tx_6', account_id: 'acc_1', type: 'withdrawal', amount: 500000, commission_amount: 10000, total_deducted: 510000, timestamp: new Date(now.getTime() - 1000 * 60 * 90), created_by: 'مدیر کل', destination_account: '606-707', receipt_serial: 'ZXC-6' },
    { id: 'tx_9', account_id: 'acc_3', type: 'withdrawal', amount: 300000, commission_amount: 6000, total_deducted: 306000, timestamp: new Date(now.getTime() - 1000 * 60 * 20), created_by: 'ادمین سیستم', destination_account: '321-654', receipt_serial: 'VBN-9' },
    { id: 'tx_11', account_id: 'acc_4', type: 'withdrawal', amount: 4000000, commission_amount: 80000, total_deducted: 4080000, timestamp: new Date(now.getTime() - 1000 * 60 * 120), created_by: 'مدیر کل', destination_account: '112-233', receipt_serial: 'FGH-11' },
    
    // --- YESTERDAY'S TRANSACTIONS ---
    { id: 'tx_2', account_id: 'acc_1', type: 'withdrawal', amount: 100000, commission_amount: 2000, total_deducted: 102000, timestamp: yesterday, created_by: 'مدیر کل', destination_account: '987-654', receipt_serial: 'XYZ-2' },
    { id: 'tx_7', account_id: 'acc_2', type: 'withdrawal', amount: 2000000, commission_amount: 40000, total_deducted: 2040000, timestamp: yesterday, created_by: 'مدیر کل', destination_account: '888-999', receipt_serial: 'JKL-7' },
    { id: 'tx_8', account_id: 'acc_3', type: 'withdrawal', amount: 1000000, commission_amount: 15000, total_deducted: 1015000, timestamp: yesterday, created_by: 'ادمین سیستم', destination_account: '777-111', receipt_serial: 'UIO-8' },
    { id: 'tx_10', account_id: 'acc_4', type: 'deposit', amount: 2500000, commission_amount: 0, total_deducted: 2500000, timestamp: yesterday, created_by: 'ادمین سیستم', source_bank: 'کشاورزی', source_account: '456-789', receipt_serial: 'RTY-10', source_card_last_digits: '5678' },

    // --- DAY BEFORE YESTERDAY'S TRANSACTIONS ---
    { id: 'tx_1', account_id: 'acc_1', type: 'deposit', amount: 5000000, commission_amount: 0, total_deducted: 5000000, timestamp: dayBefore, created_by: 'مدیر کل', source_bank: 'ملی', source_account: '123-456', receipt_serial: 'ABC-1', source_card_last_digits: '1234' },
    { id: 'tx_4', account_id: 'acc_2', type: 'deposit', amount: 10000000, commission_amount: 0, total_deducted: 10000000, timestamp: dayBefore, created_by: 'مدیر کل', source_bank: 'تجارت', source_account: '777-888', receipt_serial: 'TYU-4', source_card_last_digits: '5566' },
    { id: 'tx_new_1', account_id: 'acc_3', type: 'deposit', amount: 15000000, commission_amount: 0, total_deducted: 15000000, timestamp: dayBefore, created_by: 'مدیر کل', source_bank: 'سپه', source_account: '333-444', receipt_serial: 'DFG-12', source_card_last_digits: '7788' },
    { id: 'tx_new_2', account_id: 'acc_4', type: 'deposit', amount: 8000000, commission_amount: 0, total_deducted: 8000000, timestamp: dayBefore, created_by: 'مدیر کل', source_bank: 'مسکن', source_account: '555-666', receipt_serial: 'HJK-13', source_card_last_digits: '9900' },
];


// --- CONTEXT ---
interface DedicatedAccountContextType {
    accounts: DedicatedAccount[];
    transactions: DedicatedAccountTransaction[];
    addAccount: (details: Omit<DedicatedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => void;
    addTransaction: (details: Omit<DedicatedAccountTransaction, 'id' | 'created_by'>) => void;
}

const DedicatedAccountContext = createContext<DedicatedAccountContextType | undefined>(undefined);

export const DedicatedAccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<DedicatedAccount[]>(mockAccounts);
    const [transactions, setTransactions] = useState<DedicatedAccountTransaction[]>(mockTransactions);

    const addAccount = useCallback((details: Omit<DedicatedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => {
        const newAccount: DedicatedAccount = {
            ...details,
            id: `acc_${Date.now()}`,
            balance: 0,
            currency: Currency.IRT_BANK,
            created_at: new Date(),
        };
        setAccounts(prev => [...prev, newAccount]);
    }, []);

    const addTransaction = useCallback((details: Omit<DedicatedAccountTransaction, 'id' | 'created_by'>) => {
        if (!user) return;
        
        // FIX: Add a type guard. Since the Dedicated Accounts feature is only for internal users,
        // this helps TypeScript narrow the type of `user` and allows safe access to `user.name`.
        if (user.userType !== 'internal') {
            // This case should not be reached due to routing, but it's a good safeguard.
            return;
        }

        const newTransaction: DedicatedAccountTransaction = {
            ...details,
            id: `tx_${Date.now()}`,
            created_by: user.name,
        };
        setTransactions(prev => [newTransaction, ...prev]);

        setAccounts(prevAccounts => prevAccounts.map(acc => {
            if (acc.id === newTransaction.account_id) {
                const newBalance = newTransaction.type === 'deposit'
                    ? acc.balance + newTransaction.amount
                    : acc.balance - newTransaction.total_deducted;
                return { ...acc, balance: newBalance };
            }
            return acc;
        }));
    }, [user]);
    
    const value = useMemo(() => ({ accounts, transactions, addAccount, addTransaction }), [accounts, transactions, addAccount, addTransaction]);

    return (
        <DedicatedAccountContext.Provider value={value}>
            {children}
        </DedicatedAccountContext.Provider>
    );
};

export const useDedicatedAccounts = (): DedicatedAccountContextType => {
    const context = useContext(DedicatedAccountContext);
    if (context === undefined) {
        throw new Error('useDedicatedAccounts must be used within a DedicatedAccountProvider');
    }
    return context;
};
