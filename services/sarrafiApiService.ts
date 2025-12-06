
import { supabase } from './supabaseClient';
import { 
    User, Role, Permissions, DomesticTransfer, CreateDomesticTransferPayload, 
    UpdateTransferStatusPayload, TransferStatus, PartnerAccount, PartnerTransaction, 
    Currency, Expense, CreateExpensePayload, CashboxRequest,
    CreateCashboxRequestPayload, ResolveCashboxRequestPayload, CashboxRequestStatus,
    CashboxBalance, SystemSettings, UpdateSystemSettingsPayload, ActivityLog,
    Customer, CustomerTransaction, AccountTransfer, CreateAccountTransferPayload, ReassignTransferPayload,
    BankAccount, AddBankAccountPayload,
    ForeignTransaction, IncreaseCashboxBalancePayload,
    InitiateForeignExchangePayload, CompleteForeignExchangePayload, ForeignTransactionStatus,
    CreateUserPayload, UpdateUserPayload, DeleteUserPayload, CreateRolePayload, UpdateRolePayload, CreatePartnerPayload,
    UpdatePartnerPayload, DeletePartnerPayload, UpdateBankAccountPayload, DeleteBankAccountPayload,
    CreateCustomerPayload, UpdateCustomerPayload, FindTransfersByQueryPayload, PayoutIncomingTransferPayload,
    DashboardAnalyticsData, ProfitAndLossReportData, ReportType, CashboxSummaryReportData, GenerateReportPayload,
    GetPartnerAccountByNamePayload, Asset, InternalCustomerExchangePayload,
    InternalLedgerReportData, CommissionTransfer, LogCommissionTransferPayload, ExecuteCommissionTransferPayload,
    Amanat, CreateAmanatPayload, ReturnAmanatPayload,
    ReceiveFromPartnerPayload,
    PayToPartnerPayload,
    AuthenticatedUser,
    ExternalLogin,
    CreateExternalLoginPayload,
    DeleteExternalLoginPayload,
    InternalExchange,
    RentedAccount,
    RentedAccountTransaction,
    ExchangeRate,
    DeleteCustomerPayload,
} from '../types';

// --- Sarrafi API Service with Supabase ---

class SarrafiApiService {

    private async logActivity(user: string, action: string) {
        await supabase.from('activity_logs').insert({ user, action });
    }
    
    // --- Auth ---
    async login(username: string, password?: string): Promise<AuthenticatedUser | { error: string }> {
        // This RPC is assumed to exist and return snake_case keys which are handled by the AuthenticatedUser type
        const { data, error } = await supabase.rpc('login', {
            p_username: username,
            p_password: password
        });

        if (error) {
            console.error('Login RPC error:', error);
            return { error: error.message };
        }
        if (!data) {
             return { error: 'نام کاربری یا رمز عبور اشتباه است.' };
        }
        
        return data as AuthenticatedUser;
    }

    // --- Exchange Rates ---
    async getExchangeRates(): Promise<ExchangeRate[]> {
        const { data, error } = await supabase.from('exchange_rates').select('*');
        if (error) {
            console.error('Error fetching exchange rates:', error);
            return [];
        }
        return data || [];
    }

    async updateExchangeRate(currency: string, rate: number, user: User): Promise<ExchangeRate | { error: string }> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .upsert({ currency, rate_to_usd: rate, updated_at: new Date().toISOString(), updated_by: user.name })
            .select()
            .single();
        
        if (error) return { error: error.message };
        return data;
    }

    // --- Rented Accounts ---
    async getRentedAccountsData(): Promise<{ accounts: RentedAccount[], transactions: RentedAccountTransaction[] }> {
        const { data, error } = await supabase.rpc('get_rented_data');
        if (error) {
            console.error('Error fetching rented accounts data:', error);
            return { accounts: [], transactions: [] };
        }
        return data || { accounts: [], transactions: [] };
    }

    async createRentedAccount(payload: Omit<RentedAccount, 'id' | 'balance' | 'created_at' | 'currency'> & { user: User }): Promise<RentedAccount | { error: string }> {
        const { user, ...accountData } = payload;
        const { data, error } = await supabase.rpc('create_rented_account', accountData);
        if (error) return { error: error.message };
        await this.logActivity(user.name, `حساب کرایی جدید برای ${accountData.partner_name} در بانک ${accountData.bank_name} ایجاد کرد.`);
        return data;
    }

    async createRentedTransaction(payload: Omit<RentedAccountTransaction, 'id' | 'created_by' | 'timestamp'> & { user: User }): Promise<RentedAccountTransaction | { error: string }> {
        const { user, ...details } = payload;

        const rpcPayload = {
            p_rented_account_id: details.rented_account_id,
            p_user_id: details.user_id || null,
            p_user_type: details.user_type,
            p_guest_name: details.guest_name || null,
            p_type: details.type,
            p_amount: details.amount,
            p_commission_percentage: details.commission_percentage,
            p_commission_amount: details.commission_amount,
            p_total_transaction_amount: details.total_transaction_amount,
            p_created_by: user.name,
            p_receipt_serial: details.receipt_serial || null,
            p_source_bank_name: details.source_bank_name || null,
            p_source_card_last_digits: details.source_card_last_digits || null,
            p_destination_bank_name: details.destination_bank_name || null,
        };
        
        const { data, error } = await supabase.rpc('create_rented_transaction', rpcPayload);
        
        if (error) {
            console.error("RPC Error create_rented_transaction:", error);
            if (error.message.includes("duplicate key value violates unique constraint")) {
                 return { error: "این شماره سریال رسید قبلاً ثبت شده است." };
            }
            return { error: `خطای پایگاه داده: ${error.message}` };
        }

        await this.logActivity(user.name, `یک تراکنش ${payload.type === 'deposit' ? 'رسید' : 'برد'} به مبلغ ${payload.amount} در حسابات کرایی ثبت کرد.`);
        return data;
    }


    async toggleRentedAccountStatus(payload: { accountId: string, user: User }): Promise<{ success: boolean, error?: string }> {
        const { data, error } = await supabase.rpc('toggle_rented_account_status', { p_account_id: payload.accountId });
        if (error) return { success: false, error: error.message };
        await this.logActivity(payload.user.name, `وضعیت حساب کرایی ${payload.accountId} را تغییر داد.`);
        return { success: true };
    }
    
    async getUnifiedPortalBalance(payload: { userId: string, userType: 'Customer' | 'Partner' }): Promise<{[key in Currency]?: number}> {
        const { data, error } = await supabase.rpc('get_unified_portal_balance', {
            p_user_id: payload.userId,
            p_user_type: payload.userType,
        });
        if (error) {
            console.error('Error fetching unified portal balance:', error);
            return {};
        }
        return data || {};
    }


    // --- External Logins ---
    async getExternalLogins(): Promise<(ExternalLogin & { entityName: string })[]> {
         const { data, error } = await supabase.rpc('get_external_logins_with_details');
         if (error) {
            console.error(error);
            return [];
        }
        return data || [];
    }

    async createExternalLogin(payload: CreateExternalLoginPayload): Promise<ExternalLogin | { error: string }> {
        const { user, ...loginData } = payload;
        const { data, error } = await supabase.rpc('create_external_login', {
            p_username: loginData.username,
            p_password: loginData.password,
            p_login_type: loginData.login_type,
            p_linked_entity_id: loginData.linked_entity_id
        });
        
        if (error) return { error: error.message };
        await this.logActivity(user.name, `دسترسی کاربری برای ${payload.login_type} با نام کاربری ${payload.username} ایجاد کرد.`);
        return data as ExternalLogin;
    }
    
    async deleteExternalLogin(payload: DeleteExternalLoginPayload): Promise<{ success: boolean }> {
        const { error } = await supabase.from('external_logins').delete().eq('id', payload.id);
        if (error) return { success: false };
        await this.logActivity(payload.user.name, `دسترسی کاربر خارجی با شناسه ${payload.id} را حذف کرد.`);
        return { success: true };
    }

    // --- Users & Roles ---
    async getUsers(): Promise<User[]> { 
        const { data, error } = await supabase.from('users').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createUser(payload: CreateUserPayload): Promise<User> {
        const { data, error } = await supabase.rpc('create_user', {
            p_name: payload.name,
            p_username: payload.username,
            p_password: payload.password,
            p_role_id: payload.role_id
        });
        if (error) throw error;
        return data;
    }
    async updateUser(payload: UpdateUserPayload): Promise<User | undefined> {
        const { data, error } = await supabase.rpc('update_user', {
            p_id: payload.id,
            p_name: payload.name,
            p_username: payload.username,
            p_password: payload.password, // Pass null/empty string if not changing
            p_role_id: payload.role_id,
        });
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async deleteUser(payload: DeleteUserPayload): Promise<{ success: boolean }> {
        const { error } = await supabase.from('users').delete().eq('id', payload.id);
        return { success: !error };
    }
    
    async getRoles(): Promise<Role[]> { 
        const { data, error } = await supabase.from('roles').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createRole(payload: CreateRolePayload): Promise<Role> {
        const { data, error } = await supabase.from('roles').insert(payload).select().single();
        if (error) throw error;
        return data;
    }
    async updateRole(payload: UpdateRolePayload): Promise<Role | undefined> {
        const { data, error } = await supabase.from('roles').update(payload).eq('id', payload.id).select().single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async deleteRole(payload: {id: string}): Promise<{ success: boolean }> {
        const { error } = await supabase.from('roles').delete().eq('id', payload.id);
        return { success: !error };
    }

    // --- Customers ---
    async getCustomers(): Promise<Customer[]> { 
        const { data, error } = await supabase.from('customers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getCustomerById(id: string): Promise<Customer | undefined> { 
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async findCustomerByCodeOrName(query: string): Promise<Customer | undefined> {
        const { data, error } = await supabase.rpc('find_customer_by_code_or_name', {
            p_query: query
        });
        if (error) {
            console.error('findCustomerByCodeOrName error:', error);
            return undefined;
        }
        // The function returns a SETOF, so data will be an array. We expect 0 or 1 items.
        return data && data.length > 0 ? data[0] : undefined;
    }
    async createCustomer(payload: CreateCustomerPayload): Promise<Customer | { error: string }> {
        const { user, ...customerData } = payload;
        const { data, error } = await supabase.rpc('create_customer', {
             p_name: customerData.name,
             p_code: customerData.code,
             p_whatsapp_number: customerData.whatsapp_number
        });
        if (error) return { error: error.message };
        await this.logActivity(user.name, `مشتری جدید ${customerData.name} (کد: ${customerData.code}) را ثبت کرد.`);
        return data;
    }
     async updateCustomer(payload: UpdateCustomerPayload): Promise<Customer | { error: string }> {
        const { id, user, ...customerData } = payload;
        const { data, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات مشتری ${data.name} (کد: ${data.code}) را ویرایش کرد.`);
        return data;
    }

    async deleteCustomer(payload: DeleteCustomerPayload): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.from('customers').delete().eq('id', payload.id);
        
        if (error) {
            // Check for foreign key violation code (23503 in Postgres)
            if (error.code === '23503') {
                return { success: false, error: 'این مشتری دارای سوابق تراکنش است و نمی‌توان آن را حذف کرد.' };
            }
            return { success: false, error: error.message };
        }
        
        await this.logActivity(payload.user.name, `مشتری با شناسه ${payload.id} را حذف کرد.`);
        return { success: true };
    }
    
    // --- Domestic Transfers ---
    async getDomesticTransfers(): Promise<DomesticTransfer[]> { 
        const { data, error } = await supabase.from('domestic_transfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getDomesticTransferById(id: string): Promise<DomesticTransfer | undefined> { 
        const { data, error } = await supabase.from('domestic_transfers').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    
    async createDomesticTransfer(payload: CreateDomesticTransferPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('create_domestic_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست حواله ${data.id} را به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return data;
    }

    async updateTransferStatus(payload: UpdateTransferStatusPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('update_transfer_status', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `وضعیت حواله ${payload.transfer_id} را به ${payload.new_status} تغییر داد.`);
        return data;
    }
    
    async findTransfersByQuery(payload: FindTransfersByQueryPayload): Promise<DomesticTransfer[] | { error: string }> {
        const { data, error } = await supabase.rpc('find_transfers', { query: payload.query });
        if (error) return { error: error.message };
        return data || [];
    }

    async payoutIncomingTransfer(payload: PayoutIncomingTransferPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('payout_incoming_transfer', payload);
        if (error) return { error: error.message };
        return data;
    }

    // --- Partner Accounts ---
    async getPartnerAccounts(): Promise<PartnerAccount[]> { 
        const { data, error } = await supabase.from('partner_accounts').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getPartnerAccountById(id: string): Promise<PartnerAccount | undefined> { 
        const { data, error } = await supabase.from('partner_accounts').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async getTransactionsForPartner(partnerId: string): Promise<PartnerTransaction[]> {
        const { data, error } = await supabase.from('partner_transactions').select('*').eq('partner_id', partnerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    // --- Cashbox ---
    async getCashboxRequests(): Promise<CashboxRequest[]> { 
        const { data, error } = await supabase.from('cashbox_requests').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getCashboxRequestById(id: string): Promise<CashboxRequest | undefined> { 
        const { data, error } = await supabase.from('cashbox_requests').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async getCashboxBalances(): Promise<CashboxBalance[]> {
        const { data, error } = await supabase.rpc('get_cashbox_balances');
        if (error) {
            console.error("Error fetching cashbox balances:", error);
            return [];
        }
        return data || [];
    }

    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
       const { data, error } = await supabase.rpc('create_cashbox_request', payload);
       if (error) return { error: error.message };
       await this.logActivity(payload.user.name, `یک درخواست ${payload.request_type} به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
       return data;
    }
    
    async resolveCashboxRequest(payload: ResolveCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('resolve_cashbox_request', {
            request_id: payload.request_id,
            resolution: payload.resolution,
            user: payload.user,
        });

        if (error) return { error: error.message };

        await this.logActivity(payload.user.name, `درخواست صندوق ${payload.request_id} را ${payload.resolution === 'reject' ? 'رد' : 'تایید'} کرد.`);
        return data;
    }

    async increaseCashboxBalance(payload: IncreaseCashboxBalancePayload): Promise<CashboxRequest | { error: string }> {
        const reason = `افزایش موجودی دستی توسط مدیر: ${payload.description || 'ثبت موجودی اولیه/جدید'}`;
        const requestPayload: CreateCashboxRequestPayload = {
            request_type: 'deposit',
            amount: payload.amount,
            currency: payload.currency,
            reason,
            user: payload.user,
            linked_entity: { type: 'Manual', id: 'BALANCE_ADJUST', description: reason },
            bank_account_id: payload.bank_account_id,
            source_account_number: payload.source_account_number,
        };
        return this.createCashboxRequest(requestPayload);
    }
    
    // --- Expenses ---
    async getExpenses(): Promise<Expense[]> { 
        const { data, error } = await supabase.from('expenses').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createExpense(payload: CreateExpensePayload): Promise<Expense | { error: string }> {
        const { data, error } = await supabase.rpc('create_expense', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `هزینه ای به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return data;
    }
    
    // --- Reports & Analytics ---
    async getActivityLogs(): Promise<ActivityLog[]> { 
        const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(50);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
        const { data, error } = await supabase.rpc('get_dashboard_analytics');
        if (error) {
            console.error('getDashboardAnalytics error', error);
            return {
                weeklyActivity: { labels: [], domesticCounts: [], foreignCounts: [] },
                partnerActivity: [],
                cashboxSummary: []
            };
        }
        return data;
    }


    async getSystemSettings(): Promise<SystemSettings> { 
        const { data, error } = await supabase.from('system_settings').select('*').single();
        if (error) {
            console.error(error);
            return { approval_thresholds: {} };
        }
        return data;
    }
    async updateSystemSettings(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
        const { data, error } = await supabase.from('system_settings').update(payload.settings).eq('id', 1).select().single();
        if (error) throw error;
        return data;
    }

    async getBackupState(): Promise<any> {
        const { data, error } = await supabase.rpc('get_backup_state');
        if (error) {
            console.error('getBackupState RPC error:', error);
            throw error;
        }
        return data;
    }
    
    async getComprehensiveActivityData(): Promise<{
        cashboxRequests: CashboxRequest[];
        domesticTransfers: DomesticTransfer[];
        foreignTransactions: ForeignTransaction[];
        commissionTransfers: CommissionTransfer[];
        accountTransfers: AccountTransfer[];
        expenses: Expense[];
        amanat: Amanat[];
    }> {
        const [
            cashboxRequests,
            domesticTransfers,
            foreignTransactions,
            commissionTransfers,
            accountTransfers,
            expenses,
            amanat
        ] = await Promise.all([
            this.getCashboxRequests(),
            this.getDomesticTransfers(),
            this.getForeignTransactions(),
            this.getCommissionTransfers(),
            this.getAccountTransfers(),
            this.getExpenses(),
            this.getAmanat()
        ]);

        return {
            cashboxRequests,
            domesticTransfers,
            foreignTransactions,
            commissionTransfers,
            accountTransfers,
            expenses,
            amanat
        };
    }

    async restoreState(backupData: any): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.rpc('restore_state', { p_state_data: backupData });
        if (error) {
            console.error('restoreState RPC error:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    async getTransactionsForCustomer(customerId: string): Promise<CustomerTransaction[]> {
        const { data, error } = await supabase.from('customer_transactions').select('*').eq('customer_id', customerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getPartnerAccountByName(payload: GetPartnerAccountByNamePayload): Promise<PartnerAccount | {error: string}> {
        const { data, error } = await supabase.from('partner_accounts').select('*').eq('name', payload.partner_name).single();
        if (error) return { error: 'Partner not found' };
        return data;
    }
    
    async settlePartnerBalanceByName(payload: { partner_name: string, amount: number, currency: Currency, type: 'pay' | 'receive', user: User }): Promise<{success: true} | { error: string }> {
        const { data, error } = await supabase.rpc('settle_partner_balance_by_name', {
            p_partner_name: payload.partner_name,
            p_amount: payload.amount,
            p_currency: payload.currency,
            p_type: payload.type,
            p_user: payload.user,
        });
        if (error) return { error: error.message };
        return { success: true };
    }

    async receiveFromPartner(payload: ReceiveFromPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('receive_from_partner', {
            p_partner_id: payload.partner_id,
            p_amount: payload.amount,
            p_currency: payload.currency,
            p_user: payload.user,
            p_bank_account_id: payload.bank_account_id || null,
            p_source_account_number: payload.source_account_number || null
        });
        if (error) return { error: error.message };
        return data;
    }

    async payToPartner(payload: PayToPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('pay_to_partner', {
            p_partner_id: payload.partner_id,
            p_amount: payload.amount,
            p_currency: payload.currency,
            p_user: payload.user,
            p_bank_account_id: payload.bank_account_id || null,
            p_destination_account_number: payload.destination_account_number || null
        });
        if (error) return { error: error.message };
        return data;
    }

     async createAccountTransfer(payload: CreateAccountTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('create_account_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مبلغ ${payload.amount} ${payload.currency} را بین دو مشتری انتقال داد.`);
        return data;
    }
    async getAccountTransfers(): Promise<AccountTransfer[]> { 
        const { data, error } = await supabase.from('account_transfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async reassignPendingTransfer(payload: ReassignTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('reassign_pending_transfer', {
            p_transfer_id: payload.transfer_id,
            p_final_customer_code: payload.final_customer_code,
            p_user: payload.user,
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `حواله معلق ${payload.transfer_id} را به مشتری ${payload.final_customer_code} تخصیص داد.`);
        return data;
    }
    
    async addBankAccount(payload: AddBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { user, ...accountData } = payload;
        const dataToInsert = { ...accountData, status: 'Active' }; // Explicitly set status
        const { data, error } = await supabase.from('bank_accounts').insert(dataToInsert).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `حساب بانکی جدیدی برای ${payload.account_holder} در بانک ${payload.bank_name} ثبت کرد.`);
        return data;
    }


    async getBankAccounts(): Promise<BankAccount[]> { 
        const { data, error } = await supabase.from('bank_accounts').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getTransactionsForBankAccount(accountId: string): Promise<CashboxRequest[]> {
        const { data, error } = await supabase
            .from('cashbox_requests')
            .select('*')
            .eq('bank_account_id', accountId)
            .order('created_at', { ascending: true }); // Fetch oldest first for balance calculation
        if (error) { 
            console.error('Error fetching bank account transactions:', error); 
            return []; 
        }
        return data || [];
    }

    async createPartner(payload: CreatePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const { user, ...partnerData } = payload;
        const { data, error } = await supabase.rpc('create_partner', {
            p_name: partnerData.name,
            p_province: partnerData.province,
            p_whatsapp_number: partnerData.whatsapp_number
        });
        if (error) return { error: error.message };
        await this.logActivity(user.name, `همکار جدیدی با نام "${payload.name}" در ولایت ${payload.province} ثبت کرد.`);
        return data;
    }

    async updatePartner(payload: UpdatePartnerPayload): Promise<PartnerAccount | { error: string}> {
        const { id, user, ...partnerData } = payload;
        const { data, error } = await supabase.from('partner_accounts').update(partnerData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات همکار "${data.name}" را ویرایش کرد.`);
        return data;
    }

    async deletePartner(payload: DeletePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const { data, error } = await supabase.from('partner_accounts').update({ status: 'Inactive' }).eq('id', payload.id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `همکار "${data.name}" را غیرفعال کرد.`);
        return data;
    }

    async updateBankAccount(payload: UpdateBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { id, user, ...accountData } = payload;
        const { data, error } = await supabase.from('bank_accounts').update(accountData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات حساب بانکی "${data.account_holder} - ${data.bank_name}" را ویرایش کرد.`);
        return data;
    }

    async deleteBankAccount(payload: DeleteBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { data, error } = await supabase.from('bank_accounts').update({ status: 'Inactive' }).eq('id', payload.id).select().single();
        if(error) return { error: error.message };
        await this.logActivity(payload.user.name, `حساب بانکی "${data.account_holder} - ${data.bank_name}" را غیرفعال کرد.`);
        return data;
    }
    
    async activateBankAccount(payload: DeleteBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { data, error } = await supabase.from('bank_accounts').update({ status: 'Active' }).eq('id', payload.id).select().single();
        if(error) return { error: error.message };
        await this.logActivity(payload.user.name, `حساب بانکی "${data.account_holder} - ${data.bank_name}" را فعال کرد.`);
        return data;
    }

    async getAvailableAssets(): Promise<Asset[]> {
        const { data, error } = await supabase.rpc('get_available_assets');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async initiateForeignExchange(payload: InitiateForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { data, error } = await supabase.rpc('initiate_foreign_exchange', {
            p_user: payload.user,
            p_description: payload.description,
            p_from_asset_id: payload.from_asset_id,
            p_from_amount: payload.from_amount,
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست تبادله ${payload.from_amount} از دارایی ${payload.from_asset_id} را ثبت کرد.`);
        return data;
    }

    async completeForeignExchange(payload: CompleteForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { data, error } = await supabase.rpc('complete_foreign_exchange', {
            p_user: payload.user,
            p_transaction_id: payload.transaction_id,
            p_to_asset_id: payload.to_asset_id,
            p_to_amount: payload.to_amount,
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مرحله دوم تبادله ${payload.transaction_id} را با واریز ${payload.to_amount} ثبت کرد.`);
        return data;
    }

    async performInternalCustomerExchange(payload: InternalCustomerExchangePayload): Promise<{success: true} | { error: string }> {
        const { error } = await supabase.rpc('perform_internal_customer_exchange', {
            p_customer_id: payload.customer_id,
            p_from_currency: payload.from_currency,
            p_from_amount: payload.from_amount,
            p_to_currency: payload.to_currency,
            p_to_amount: payload.to_amount,
            p_rate: payload.rate,
            p_user: payload.user
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مبلغ ${payload.from_amount} ${payload.from_currency} از حساب مشتری ${payload.customer_id} را به ${payload.to_amount} ${payload.to_currency} تبدیل کرد.`);
        return { success: true };
    }


    async getForeignTransactions(): Promise<ForeignTransaction[]> { 
        const { data, error } = await supabase.from('foreign_transactions').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async getInternalExchangesForCustomer(customerId: string): Promise<InternalExchange[]> {
        const { data, error } = await supabase.from('internal_exchanges').select('*').eq('customer_id', customerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getCommissionTransfers(): Promise<CommissionTransfer[]> {
        const { data, error } = await supabase.from('commission_transfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getCommissionTransfersForInitiator(initiatorId: string): Promise<CommissionTransfer[]> {
        const { data, error } = await supabase
            .from('commission_transfers')
            .select('*')
            .eq('initiator_id', initiatorId);
        if (error) { console.error(error); return []; }
        return data || [];
    }


    async logCommissionTransfer(payload: LogCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('log_commission_transfer', {
            p_user: payload.user,
            p_initiator_type: payload.initiator_type,
            p_customer_code: payload.customer_code || null,
            p_partner_id: payload.partner_id || null,
            p_amount: payload.amount,
            p_source_account_number: payload.source_account_number,
            p_received_into_bank_account_id: payload.received_into_bank_account_id,
            p_commission_percentage: payload.commission_percentage,
            p_receipt_serial: payload.receipt_serial,
            p_source_card_last_digits: payload.source_card_last_digits
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست ورود وجه کمیشن‌کاری به مبلغ ${payload.amount} از حساب ${payload.source_account_number} را ثبت کرد.`);
        return data;
    }

    async executeCommissionTransfer(payload: ExecuteCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('execute_commission_transfer', {
            p_user: payload.user,
            p_transfer_id: payload.transfer_id,
            p_paid_from_bank_account_id: payload.paid_from_bank_account_id,
            p_destination_account_number: payload.destination_account_number,
            p_execution_receipt_serial: payload.execution_receipt_serial,
            p_execution_destination_card_digits: payload.execution_destination_card_digits,
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `دستور پرداخت حواله کمیشن‌کاری ${payload.transfer_id} را صادر کرد.`);
        return data;
    }

    async generateReport(payload: GenerateReportPayload): Promise<any[] | { error: string }> {
        const { data, error } = await supabase.rpc('generate_report', {
            p_report_type: payload.report_type,
            p_start_date: payload.start_date,
            p_end_date: payload.end_date,
        });
        if (error) {
            console.error('generateReport RPC error:', error);
            return { error: error.message };
        }
        return data || [];
    }
    
    async getAmanat(): Promise<Amanat[]> {
        const { data, error } = await supabase.from('amanat').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async createAmanat(payload: CreateAmanatPayload): Promise<Amanat | { error: string }> {
        const { data, error } = await supabase.rpc('create_amanat', {
            p_customer_name: payload.customer_name,
            p_amount: payload.amount,
            p_currency: payload.currency,
            p_notes: payload.notes,
            p_user: payload.user,
            p_bank_account_id: payload.bank_account_id
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `امانتی به مبلغ ${payload.amount} ${payload.currency} برای ${payload.customer_name} ثبت کرد.`);
        return data;
    }

    async returnAmanat(payload: ReturnAmanatPayload): Promise<Amanat | { error: string }> {
        const { data, error } = await supabase.rpc('return_amanat', {
            p_amanat_id: payload.amanat_id,
            p_user: payload.user
        });
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `امانت ${payload.amanat_id} را بازگشت داد.`);
        return data;
    }

    async createOpeningBalanceTransaction(payload: { customerId: string, amount: number, currency: Currency, type: 'credit' | 'debit', user: User }): Promise<{ success: boolean; error?: string }> {
        // 1. Fetch current balances
        const { data: customer, error: fetchError } = await supabase.from('customers').select('balances').eq('id', payload.customerId).single();
        if (fetchError) return { success: false, error: fetchError.message };

        // 2. Calculate new balance
        const currentBalances = customer.balances || {};
        const currentAmount = currentBalances[payload.currency] || 0;
        
        // type 'credit' here maps to 'deposit' (receipt - liability), 'debit' maps to 'withdrawal' (bard - asset)
        const change = payload.type === 'credit' ? payload.amount : -payload.amount;
        const newAmount = currentAmount + change;
        const newBalances = { ...currentBalances, [payload.currency]: newAmount };

        // 3. Update Customer
        const { error: updateError } = await supabase.from('customers').update({ balances: newBalances }).eq('id', payload.customerId);
        if (updateError) return { success: false, error: updateError.message };

        // 4. Insert Transaction
        const { error: txError } = await supabase.from('customer_transactions').insert({
            customer_id: payload.customerId,
            type: payload.type,
            amount: payload.amount,
            currency: payload.currency,
            description: 'ثبت به عنوان طلب سابقه (تراز اول دوره) - بدون درگیری صندوق',
            linked_entity_type: 'OpeningBalance',
            linked_entity_id: 'OB_' + Date.now(),
            timestamp: new Date().toISOString()
        });
        
        if (txError) return { success: false, error: txError.message };
        
        await this.logActivity(payload.user.name, `تراز اول دوره برای مشتری ${payload.customerId} ثبت شد: ${payload.amount} ${payload.currency}`);
        return { success: true };
    }

    async getOpeningBalanceTransactions(customerId: string): Promise<CustomerTransaction[]> {
        const { data, error } = await supabase
            .from('customer_transactions')
            .select('*')
            .eq('customer_id', customerId)
            .eq('linked_entity_type', 'OpeningBalance');
        
        if (error) {
            console.error('Error fetching OB transactions:', error);
            return [];
        }
        return data || [];
    }

    async upsertOpeningBalance(payload: { transactionId?: string, customerId: string, currency: Currency, amount: number, type: 'credit' | 'debit', user: User }): Promise<{ success: boolean; error?: string }> {
        const { transactionId, customerId, currency, amount, type, user } = payload;

        // 1. Fetch Customer to get current balances
        const { data: customer, error: fetchError } = await supabase.from('customers').select('balances').eq('id', customerId).single();
        if (fetchError) return { success: false, error: fetchError.message };

        const balances = { ...customer.balances };

        // 2. If Updating: Revert impact of OLD transaction from its SPECIFIC currency balance
        if (transactionId) {
            const { data: oldTx, error: txError } = await supabase.from('customer_transactions').select('*').eq('id', transactionId).single();
            if (txError) return { success: false, error: txError.message };
            
            // Revert logic:
            // credit (deposit/liability) -> subtracted to revert
            // debit (withdrawal/asset) -> added to revert (or subtract negative impact)
            // Basically: oldImpact = (type == credit ? amount : -amount)
            // balance = balance - oldImpact
            const oldAmount = oldTx.amount;
            const oldCurrency = oldTx.currency as Currency;
            const oldType = oldTx.type;

            const oldImpact = oldType === 'credit' ? oldAmount : -oldAmount;
            
            // Remove the old transaction's effect from the old currency bucket
            balances[oldCurrency] = (balances[oldCurrency] || 0) - oldImpact;
        }

        // 3. Apply New Impact to the NEW currency bucket
        const newImpact = type === 'credit' ? amount : -amount;
        balances[currency] = (balances[currency] || 0) + newImpact;

        // 4. Update Customer with the new balances map
        const { error: updateCustError } = await supabase.from('customers').update({ balances: balances }).eq('id', customerId);
        if (updateCustError) return { success: false, error: updateCustError.message };

        // 5. Update/Insert Transaction Record
        if (transactionId) {
            const { error: updateTxError } = await supabase.from('customer_transactions').update({
                amount: amount,
                type: type,
                currency: currency, 
                description: 'طلب سابقه (تراز اول دوره) - ویرایش شده',
            }).eq('id', transactionId);
            if (updateTxError) return { success: false, error: updateTxError.message };
        } else {
            const { error: insertTxError } = await supabase.from('customer_transactions').insert({
                customer_id: customerId,
                currency: currency,
                amount: amount,
                type: type,
                linked_entity_type: 'OpeningBalance',
                linked_entity_id: `OB_${Date.now()}`,
                description: 'ثبت به عنوان طلب سابقه (تراز اول دوره) - بدون درگیری صندوق',
                timestamp: new Date().toISOString()
            });
            if (insertTxError) return { success: false, error: insertTxError.message };
        }

        await this.logActivity(user.name, `موجودی اول دوره مشتری ${customerId} را ویرایش/ثبت کرد: ${amount} ${currency}`);
        return { success: true };
    }

    async deleteOpeningBalance(payload: { transactionId: string, customerId: string, user: User }): Promise<{ success: boolean; error?: string }> {
        const { transactionId, customerId, user } = payload;

        // 1. Get Transaction
        const { data: tx, error: txError } = await supabase.from('customer_transactions').select('*').eq('id', transactionId).single();
        if (txError) return { success: false, error: txError.message };

        // 2. Get Customer
        const { data: customer, error: fetchError } = await supabase.from('customers').select('balances').eq('id', customerId).single();
        if (fetchError) return { success: false, error: fetchError.message };

        // 3. Revert Impact
        const currentBalance = customer.balances[tx.currency] || 0;
        const txImpact = tx.type === 'credit' ? tx.amount : -tx.amount;
        const newBalance = currentBalance - txImpact;

        // 4. Update Customer
        const newBalances = { ...customer.balances, [tx.currency]: newBalance };
        const { error: updateCustError } = await supabase.from('customers').update({ balances: newBalances }).eq('id', customerId);
        if (updateCustError) return { success: false, error: updateCustError.message };

        // 5. Delete Transaction
        const { error: deleteError } = await supabase.from('customer_transactions').delete().eq('id', transactionId);
        if (deleteError) return { success: false, error: deleteError.message };

        await this.logActivity(user.name, `تراکنش موجودی اول دوره ${transactionId} را برای مشتری ${customerId} حذف کرد.`);
        return { success: true };
    }
}

export default SarrafiApiService;
