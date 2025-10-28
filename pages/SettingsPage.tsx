
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { User, PartnerAccount, Role, Currency, SystemSettings, Permissions, PermissionModule, permissionModules, BankAccount, Customer, ExternalLogin, CreateExternalLoginPayload, CashboxRequest, CashboxRequestStatus } from '../types';
import { permissionModuleTranslations, permissionActionTranslations, cashboxRequestStatusTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import AddPartnerModal from '../components/AddPartnerModal';
import AddBankAccountModal from '../components/AddBankAccountModal';
import EditPartnerModal from '../components/EditPartnerModal';
import EditBankAccountModal from '../components/EditBankAccountModal';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';


// --- Reusable Components ---

const SettingsCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, actions }) => (
    <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
            <div>{actions}</div>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const ActionButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; type?: 'button' | 'submit' | 'reset'; disabled?: boolean }> = ({ onClick, children, className = '', type = 'button', disabled = false }) => (
     <button 
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 ${className}`}
        style={{
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
        }}
    >
        {children}
    </button>
);

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
            active
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
    >
        {children}
    </button>
);


// --- Main Page Component ---
const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'partners' | 'bankAccounts' | 'externalUsers' | 'general'>('users');

    return (
         <div style={{direction: 'rtl'}} className="space-y-12">
            <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-wider">تنظیمات و مدیریت</h1>

            <div className="border-b-2 border-cyan-400/20 mb-8 flex flex-wrap">
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>مدیریت کاربران</TabButton>
                <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>مدیریت نقش‌ها</TabButton>
                <TabButton active={activeTab === 'externalUsers'} onClick={() => setActiveTab('externalUsers')}>دسترسی کاربران خارجی</TabButton>
                <TabButton active={activeTab === 'partners'} onClick={() => setActiveTab('partners')}>مدیریت همکاران</TabButton>
                <TabButton active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')}>حسابات بانکی</TabButton>
                <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>تنظیمات عمومی</TabButton>
            </div>
            
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'roles' && <RoleManagement />}
            {activeTab === 'externalUsers' && <ExternalUserManagement />}
            {activeTab === 'partners' && <PartnerManagement />}
            {activeTab === 'bankAccounts' && <BankAccountManagement />}
            {activeTab === 'general' && <GeneralSettings />}

        </div>
    );
};

// --- Tab Content Components ---
const UserManagement = () => {
    const api = useApi();
    const { addToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    const fetchData = useCallback(async () => {
        const [userData, roleData] = await Promise.all([api.getUsers(), api.getRoles()]);
        setUsers(userData);
        setRoles(roleData);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setUserModalOpen(false);
        setSelectedUser(null);
        fetchData();
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
            const { success } = await api.deleteUser({ id: userId });
            if (success) {
                addToast("کاربر با موفقیت حذف شد.", 'success');
                fetchData();
            } else {
                addToast("خطا در حذف کاربر.", 'error');
            }
        }
    };
    
    return (
        <SettingsCard 
            title="لیست کاربران سیستم"
            actions={<ActionButton onClick={() => { setSelectedUser(null); setUserModalOpen(true); }}>افزودن کاربر جدید</ActionButton>}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium">نام کامل</th>
                            <th scope="col" className="px-6 py-4 font-medium">نام کاربری</th>
                            <th scope="col" className="px-6 py-4 font-medium">نقش</th>
                            <th scope="col" className="px-6 py-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-cyan-400/10">
                                <td className="px-6 py-4 font-semibold text-slate-100">{user.name}</td>
                                <td className="px-6 py-4 font-mono text-cyan-300">{user.username}</td>
                                <td className="px-6 py-4">{rolesMap.get(user.role_id) || 'نامشخص'}</td>
                                <td className="px-6 py-4 text-left space-x-4 space-x-reverse">
                                    <button onClick={() => { setSelectedUser(user); setUserModalOpen(true); }} className="text-amber-400 hover:text-amber-300">ویرایش</button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isUserModalOpen && <UserModal user={selectedUser} roles={roles} onClose={() => { setUserModalOpen(false); setSelectedUser(null); }} onSuccess={handleSuccess} />}
        </SettingsCard>
    );
};

const RoleManagement = () => {
    const api = useApi();
    const { addToast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isRoleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

     const fetchData = useCallback(async () => {
        setRoles(await api.getRoles());
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
     const handleSuccess = () => {
        setRoleModalOpen(false);
        setSelectedRole(null);
        fetchData();
    };

    const handleDeleteRole = async (roleId: string) => {
         if (window.confirm('آیا از حذف این نقش اطمینان دارید؟ کاربرانی که این نقش را دارند دسترسی خود را از دست خواهند داد.')) {
            const { success } = await api.deleteRole({ id: roleId });
            if (success) {
                addToast("نقش با موفقیت حذف شد.", 'success');
                fetchData();
            } else {
                addToast("خطا در حذف نقش.", 'error');
            }
        }
    };

    return (
        <SettingsCard 
            title="نقش‌های کاربری و دسترسی‌ها"
            actions={<ActionButton onClick={() => { setSelectedRole(null); setRoleModalOpen(true); }}>ایجاد نقش جدید</ActionButton>}
        >
             <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium">نام نقش</th>
                            <th scope="col" className="px-6 py-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(role => (
                            <tr key={role.id} className="border-b border-cyan-400/10">
                                <td className="px-6 py-4 font-semibold text-slate-100 text-2xl">{role.name}</td>
                                <td className="px-6 py-4 text-left space-x-4 space-x-reverse">
                                     <button onClick={() => { setSelectedRole(role); setRoleModalOpen(true); }} className="text-amber-400 hover:text-amber-300">ویرایش دسترسی‌ها</button>
                                     <button onClick={() => handleDeleteRole(role.id)} className="text-red-400 hover:text-red-300">حذف نقش</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {isRoleModalOpen && <RoleModal role={selectedRole} onClose={() => { setRoleModalOpen(false); setSelectedRole(null); }} onSuccess={handleSuccess} />}
        </SettingsCard>
    );
};

const ExternalUserManagement = () => {
    const api = useApi();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [logins, setLogins] = useState<(ExternalLogin & { entityName: string })[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    
    // Customer form state
    const [customerCode, setCustomerCode] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    
    // Common state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Partner form state
    const [selectedPartnerId, setSelectedPartnerId] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [loginsData, partnersData] = await Promise.all([
            api.getExternalLogins(),
            api.getPartnerAccounts()
        ]);
        setLogins(loginsData);
        setPartners(partnersData.filter(p => p.status === 'Active'));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const checkCustomerCode = useCallback(debounce(async (code: string) => {
        if (!code) {
            setFoundCustomer(null);
            return;
        }
        setIsCheckingCustomer(true);
        // FIX: Property 'getCustomerByCode' does not exist on type 'SarrafiApiService'. Did you mean 'getCustomerById'?
        const result = await api.findCustomerByCodeOrName(code);
        setFoundCustomer(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    const handleCustomerCodeChange = (code: string) => {
        setCustomerCode(code);
        checkCustomerCode(code);
    };

    const resetForms = () => {
        setCustomerCode('');
        setFoundCustomer(null);
        setSelectedPartnerId('');
        setUsername('');
        setPassword('');
    };
    
    const handleSubmit = async (e: React.FormEvent, type: 'customer' | 'partner') => {
        e.preventDefault();
        if (!user || user.userType !== 'internal') return;
        setIsLoading(true);

        let payload: CreateExternalLoginPayload;
        if (type === 'customer') {
            if (!foundCustomer) {
                addToast('لطفا یک کد مشتری معتبر وارد کنید.', 'error');
                setIsLoading(false);
                return;
            }
            payload = {
                username, password, login_type: 'customer', linked_entity_id: foundCustomer.id, user
            };
        } else { // partner
            if (!selectedPartnerId) {
                addToast('لطفا یک همکار را انتخاب کنید.', 'error');
                setIsLoading(false);
                return;
            }
            payload = {
                username, password, login_type: 'partner', linked_entity_id: selectedPartnerId, user
            };
        }

        const result = await api.createExternalLogin(payload);
        setIsLoading(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast(`دسترسی برای ${username} با موفقیت ایجاد شد.`, 'success');
            resetForms();
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!user || user.userType !== 'internal') return;
        if (window.confirm('آیا از حذف این دسترسی اطمینان دارید؟')) {
            const { success } = await api.deleteExternalLogin({ id, user });
            if (success) {
                addToast("دسترسی با موفقیت حذف شد.", 'success');
                fetchData();
            } else {
                addToast("خطا در حذف دسترسی.", 'error');
            }
        }
    };

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <SettingsCard title="ایجاد دسترسی برای مشتری">
                    <form onSubmit={(e) => handleSubmit(e, 'customer')} className="space-y-4">
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">کد مشتری</label>
                            <input type="text" value={customerCode} onChange={e => handleCustomerCodeChange(persianToEnglishNumber(e.target.value))} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md"/>
                            {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال بررسی...</p>}
                            {foundCustomer && <p className="text-sm text-green-400 mt-1">✓ مشتری یافت شد: {foundCustomer.name}</p>}
                            {foundCustomer === null && customerCode && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری یافت نشد.</p>}
                        </div>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری (انگلیسی)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-left" style={{direction: 'ltr'}}/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-left" style={{direction: 'ltr'}}/>
                        <div className="text-left pt-2"><ActionButton type="submit" disabled={isLoading || !foundCustomer}>ایجاد دسترسی</ActionButton></div>
                    </form>
                </SettingsCard>
                <SettingsCard title="ایجاد دسترسی برای همکار">
                     <form onSubmit={(e) => handleSubmit(e, 'partner')} className="space-y-4">
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">انتخاب همکار</label>
                            <select value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                <option value="" disabled>-- یک همکار را انتخاب کنید --</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری (انگلیسی)" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-left" style={{direction: 'ltr'}}/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-left" style={{direction: 'ltr'}}/>
                        <div className="text-left pt-2"><ActionButton type="submit" disabled={isLoading || !selectedPartnerId}>ایجاد دسترسی</ActionButton></div>
                    </form>
                </SettingsCard>
            </div>
            <SettingsCard title="لیست دسترسی‌های ایجاد شده">
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">نام کاربری</th>
                                <th className="px-6 py-4 font-medium">نوع کاربر</th>
                                <th className="px-6 py-4 font-medium">مرتبط با</th>
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {logins.map(login => (
                                <tr key={login.id} className="border-b border-cyan-400/10">
                                    <td className="px-6 py-4 font-mono text-cyan-300">{login.username}</td>
                                    <td className="px-6 py-4">{login.login_type === 'customer' ? 'مشتری' : 'همکار'}</td>
                                    <td className="px-6 py-4 font-semibold">{login.entityName}</td>
                                    <td className="px-6 py-4 text-left">
                                        <button onClick={() => handleDelete(login.id)} className="text-red-400 hover:text-red-300">حذف</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsCard>
        </div>
    );
};


const BalanceSummary: React.FC<{ balances: PartnerAccount['balances'] }> = ({ balances }) => {
    const nonZeroBalances = CURRENCIES
        .map(currency => ({ currency, amount: balances[currency] || 0 }))
        .filter(b => b.amount !== 0);

    if (nonZeroBalances.length === 0) {
        return <span className="text-slate-400">بی حساب</span>;
    }

    return (
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-base font-mono">
            {nonZeroBalances.map(({ currency, amount }) => (
                <span key={currency} className={amount < 0 ? 'text-red-400' : 'text-green-400'}>
                    {`${new Intl.NumberFormat('en-US').format(amount)} ${currency}`}
                </span>
            ))}
        </div>
    );
};

const PartnerManagement = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<PartnerAccount | null>(null);


    const fetchData = useCallback(async () => {
        setPartners(await api.getPartnerAccounts());
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setCreateModalOpen(false);
        setEditModalOpen(false);
        setSelectedPartner(null);
        fetchData();
    };

    const handleEditClick = (partner: PartnerAccount) => {
        setSelectedPartner(partner);
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (partner: PartnerAccount) => {
        if (!user || user.userType !== 'internal') return;
        if (window.confirm(`آیا از غیرفعال کردن همکار "${partner.name}" اطمینان دارید؟ این همکار دیگر در لیست‌های انتخابی نمایش داده نخواهد شد.`)) {
            const result = await api.deletePartner({ id: partner.id, user });
            if ('error' in result) {
                addToast(result.error, 'error');
            } else {
                addToast("همکار با موفقیت غیرفعال شد.", 'success');
                fetchData();
            }
        }
    };

    const getStatusStyle = (status: string) => status === 'Active' ? 'text-green-400' : 'text-slate-500';

    return (
        <SettingsCard 
            title="لیست صرافان همکار"
            actions={hasPermission('partnerAccounts', 'create') && (
                 <ActionButton onClick={() => setCreateModalOpen(true)}>+ ثبت همکار جدید</ActionButton>
            )}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium">نام همکار</th>
                            <th scope="col" className="px-6 py-4 font-medium">ولایت</th>
                            <th scope="col" className="px-6 py-4 font-medium">شماره واتس‌اپ</th>
                            <th scope="col" className="px-6 py-4 font-medium">موجودی‌ها</th>
                            <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                            <th scope="col" className="px-6 py-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {partners.map(p => (
                            <tr key={p.id} className={`border-b border-cyan-400/10 ${p.status === 'Inactive' ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4 font-semibold text-slate-100">{p.name}</td>
                                <td className="px-6 py-4">{p.province}</td>
                                <td className="px-6 py-4 font-mono">{p.whatsapp_number}</td>
                                <td className="px-6 py-4 text-left">
                                    <BalanceSummary balances={p.balances} />
                                </td>
                                <td className={`px-6 py-4 font-bold ${getStatusStyle(p.status)}`}>{p.status === 'Active' ? 'فعال' : 'غیرفعال'}</td>
                                <td className="px-6 py-4 text-left space-x-4 space-x-reverse">
                                    {p.status === 'Active' && hasPermission('partnerAccounts', 'edit') && (
                                        <button onClick={() => handleEditClick(p)} className="text-amber-400 hover:text-amber-300">ویرایش</button>
                                    )}
                                     {p.status === 'Active' && hasPermission('partnerAccounts', 'delete') && (
                                        <button onClick={() => handleDeleteClick(p)} className="text-red-400 hover:text-red-300">حذف</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isCreateModalOpen && user && <AddPartnerModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />}
            {isEditModalOpen && user && selectedPartner && <EditPartnerModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} currentUser={user} partner={selectedPartner} />}
        </SettingsCard>
    );
};

const BankAccountManagement = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    const fetchData = useCallback(async () => {
        setAccounts(await api.getBankAccounts());
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSuccess = () => {
        setCreateModalOpen(false);
        setEditModalOpen(false);
        setSelectedAccount(null);
        fetchData();
    };

    const handleEditClick = (account: BankAccount) => {
        setSelectedAccount(account);
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (account: BankAccount) => {
        if (!user || user.userType !== 'internal') return;
        if (window.confirm(`آیا از غیرفعال کردن حساب بانکی "${account.account_holder}" اطمینان دارید؟`)) {
            const result = await api.deleteBankAccount({ id: account.id, user });
            if ('error' in result) {
                addToast(result.error, 'error');
            } else {
                addToast("حساب بانکی با موفقیت غیرفعال شد.", 'success');
                fetchData();
            }
        }
    };

    const getStatusStyle = (status: string) => status === 'Active' ? 'text-green-400' : 'text-slate-500';


    return (
        <SettingsCard 
            title="لیست حسابات بانکی (ایران)"
            actions={hasPermission('settings', 'edit') && (
                 <ActionButton onClick={() => setCreateModalOpen(true)}>+ افزودن حساب بانکی جدید</ActionButton>
            )}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium">صاحب حساب</th>
                            <th scope="col" className="px-6 py-4 font-medium">نام بانک</th>
                            <th scope="col" className="px-6 py-4 font-medium">شماره حساب</th>
                            <th scope="col" className="px-6 py-4 font-medium">موجودی فعلی</th>
                            <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                            <th scope="col" className="px-6 py-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(acc => (
                            <tr key={acc.id} className={`border-b border-cyan-400/10 ${acc.status === 'Inactive' ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4 font-semibold text-slate-100">{acc.account_holder}</td>
                                <td className="px-6 py-4">{acc.bank_name}</td>
                                <td className="px-6 py-4 font-mono text-cyan-300">{acc.account_number}</td>
                                <td className="px-6 py-4 font-mono">{new Intl.NumberFormat('fa-IR').format(acc.balance)} {acc.currency}</td>
                                <td className={`px-6 py-4 font-bold ${getStatusStyle(acc.status)}`}>{acc.status === 'Active' ? 'فعال' : 'غیرفعال'}</td>
                                <td className="px-6 py-4 text-left space-x-4 space-x-reverse">
                                     {acc.status === 'Active' && hasPermission('settings', 'edit') && (
                                        <button onClick={() => handleEditClick(acc)} className="text-amber-400 hover:text-amber-300">ویرایش</button>
                                    )}
                                     {acc.status === 'Active' && hasPermission('settings', 'edit') && (
                                        <button onClick={() => handleDeleteClick(acc)} className="text-red-400 hover:text-red-300">حذف</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isCreateModalOpen && user && <AddBankAccountModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />}
            {isEditModalOpen && user && selectedAccount && <EditBankAccountModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} currentUser={user} bankAccount={selectedAccount} />}
        </SettingsCard>
    )
};

const getStatusStyle = (status: CashboxRequestStatus) => {
    switch (status) {
        case CashboxRequestStatus.Approved:
        case CashboxRequestStatus.AutoApproved:
            return 'bg-green-500/20 text-green-300';
        case CashboxRequestStatus.Pending:
            return 'bg-yellow-500/20 text-yellow-300';
        case CashboxRequestStatus.PendingCashboxApproval:
            return 'bg-amber-500/20 text-amber-300';
        case CashboxRequestStatus.Rejected:
            return 'bg-red-500/20 text-red-300';
        default:
            return 'bg-slate-600/20 text-slate-300';
    }
};

const GeneralSettings = () => {
    const api = useApi();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    
    const [increaseAmount, setIncreaseAmount] = useState('');
    const [increaseCurrency, setIncreaseCurrency] = useState<Currency>(CURRENCIES[0]);
    const [increaseDescription, setIncreaseDescription] = useState('');
    const [isIncreasing, setIsIncreasing] = useState(false);
    const [increaseBankAccountId, setIncreaseBankAccountId] = useState('');
    const [increaseSourceAccount, setIncreaseSourceAccount] = useState('');
    const [requestHistory, setRequestHistory] = useState<CashboxRequest[]>([]);


    const fetchData = useCallback(async () => {
        const [settingsData, accountsData, allRequests] = await Promise.all([
            api.getSystemSettings(),
            api.getBankAccounts(),
            api.getCashboxRequests(),
        ]);
        setSettings(settingsData);
        const activeIrtAccounts = accountsData.filter(a => a.status === 'Active' && a.currency === Currency.IRT_BANK);
        setBankAccounts(activeIrtAccounts);
        if (activeIrtAccounts.length > 0) {
            setIncreaseBankAccountId(activeIrtAccounts[0].id);
        }
        const manualRequests = allRequests
            .filter(r => r.linked_entity?.type === 'Manual' && r.linked_entity.id === 'BALANCE_ADJUST')
            .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRequestHistory(manualRequests);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

     const handleSettingsChange = (currency: Currency, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                approval_thresholds: {
                    ...prev.approval_thresholds,
                    [currency]: parseFloat(persianToEnglishNumber(value)) || 0,
                }
            };
        });
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        await api.updateSystemSettings({ settings });
        addToast("تنظیمات با موفقیت ذخیره شد.", 'success');
        fetchData();
    };

    const handleIncreaseBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || user.userType !== 'internal') return;

        if (increaseCurrency === Currency.IRT_BANK && !increaseBankAccountId) {
            addToast("لطفاً یک حساب بانکی مقصد را انتخاب کنید.", 'error');
            return;
        }

        setIsIncreasing(true);
        const result = await api.increaseCashboxBalance({
            amount: parseFloat(persianToEnglishNumber(increaseAmount)) || 0,
            currency: increaseCurrency,
            description: increaseDescription,
            user,
            bank_account_id: increaseCurrency === Currency.IRT_BANK ? increaseBankAccountId : undefined,
            source_account_number: increaseCurrency === Currency.IRT_BANK ? increaseSourceAccount : undefined,
        });
        setIsIncreasing(false);
        if ('error' in result) {
            addToast(result.error, 'error');
        } else {
            addToast('درخواست افزایش موجودی به صندوق ارسال شد.', 'success');
            setIncreaseAmount('');
            setIncreaseDescription('');
            setIncreaseSourceAccount('');
            fetchData();
        }
    };


     const handleBackup = async () => {
        const backupData = await api.getBackupState();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sarrafai_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast("فایل پشتیبان با موفقیت ایجاد شد.", 'success');
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("فایل قابل خواندن نیست");
                const backupData = JSON.parse(text);
                
                if (window.confirm("آیا اطمینان دارید؟ با این کار تمام اطلاعات فعلی شما با اطلاعات فایل پشتیبان جایگزین خواهد شد. این عمل غیرقابل بازگشت است.")) {
                    const { success, error } = await api.restoreState(backupData);
                    if (success) {
                        addToast("بازیابی با موفقیت انجام شد! برنامه اکنون دوباره بارگیری می‌شود.", 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        throw new Error(error || "خطای ناشناخته در بازیابی");
                    }
                }
            } catch (err: any) {
                console.error(err);
                addToast(`بازیابی پشتیبان با شکست مواجه شد: ${err.message}`, "error");
            } finally {
                if(fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };
    
    return (
        <div className="space-y-12">
            <SettingsCard title="افزایش موجودی صندوق">
                <p className="text-slate-400 mb-6">برای ثبت موجودی اولیه یا واریز وجه به صندوق از این فرم استفاده کنید. این عملیات یک درخواست "رسید" در روزنامچه صندوق ثبت می‌کند که نیازمند تایید است.</p>
                <form onSubmit={handleIncreaseBalance} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">مبلغ</label>
                            <input type="text" inputMode="decimal" value={increaseAmount} onChange={(e) => setIncreaseAmount(e.target.value)} required
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"/>
                        </div>
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                            <select value={increaseCurrency} onChange={(e) => setIncreaseCurrency(e.target.value as Currency)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-lg font-medium text-cyan-300 mb-2">توضیحات (اختیاری)</label>
                            <input type="text" value={increaseDescription} onChange={(e) => setIncreaseDescription(e.target.value)} placeholder="مثلا: ثبت موجودی اولیه صندوق"
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"/>
                        </div>
                    </div>
                    
                    {increaseCurrency === 'IRT_BANK' && (
                        <div className="mt-4 p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md space-y-4 animate-fadeIn">
                            <h4 className="text-xl font-bold text-cyan-300">جزئیات تراکنش بانکی</h4>
                            
                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">شماره حساب/کارت مبدأ (اختیاری)</label>
                                <input type="text" value={increaseSourceAccount} onChange={(e) => setIncreaseSourceAccount(persianToEnglishNumber(e.target.value))} placeholder="شماره حساب فرستنده"
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left"/>
                            </div>

                            <div>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">واریز به حساب بانکی ما</label>
                                <select value={increaseBankAccountId} onChange={(e) => setIncreaseBankAccountId(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                                    <option value="" disabled>-- حساب مقصد را انتخاب کنید --</option>
                                    {bankAccounts.map(b => (
                                        <option key={b.id} value={b.id}>{b.bank_name} - {b.account_holder}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                     <div className="mt-6 text-left">
                        <ActionButton type="submit" disabled={isIncreasing}>
                            {isIncreasing ? 'در حال ارسال...' : 'ارسال درخواست افزایش'}
                        </ActionButton>
                    </div>
                </form>
            </SettingsCard>

            <SettingsCard title="تاریخچه درخواست‌های افزایش موجودی">
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">توضیحات</th>
                                <th className="px-6 py-4 font-medium">درخواست کننده</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requestHistory.map(req => (
                                <tr key={req.id} className="border-b border-cyan-400/10">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(req.created_at).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(req.amount)} {req.currency}</td>
                                    <td className="px-6 py-4">{req.reason}</td>
                                    <td className="px-6 py-4">{req.requested_by}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(req.status)}`}>
                                            {cashboxRequestStatusTranslations[req.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {requestHistory.length === 0 && <p className="text-center p-4 text-slate-400">هیچ درخواستی برای افزایش موجودی ثبت نشده است.</p>}
                </div>
            </SettingsCard>

            <SettingsCard title="پشتیبان‌گیری و بازیابی اطلاعات">
                 <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1">
                        <h3 className="text-xl text-slate-200 font-bold">ایجاد فایل پشتیبان</h3>
                        <p className="text-slate-400 mt-2 mb-4">از تمام اطلاعات سیستم یک فایل پشتیبان با فرمت JSON تهیه کنید.</p>
                        <ActionButton onClick={handleBackup}>دانلود فایل پشتیبان</ActionButton>
                    </div>
                     <div className="w-full md:w-px bg-cyan-400/20 self-stretch"></div>
                    <div className="flex-1">
                        <h3 className="text-xl text-slate-200 font-bold">بازیابی از فایل پشتیبان</h3>
                        <p className="text-slate-400 mt-2 mb-4"><span className="font-bold text-red-400">هشدار:</span> این عمل تمام اطلاعات فعلی شما را پاک می‌کند.</p>
                        <ActionButton onClick={handleRestoreClick} className="bg-amber-500 hover:bg-amber-400 focus:ring-amber-500/50">بارگذاری فایل پشتیبان</ActionButton>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>
            </SettingsCard>

             {settings && (
                <SettingsCard title="تنظیمات صندوق">
                    <p className="text-slate-400 mb-6">مبالغی که از این حد تعیین شده کمتر باشند، به صورت خودکار تایید خواهند شد و نیازی به تایید مدیر نخواهند داشت.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CURRENCIES.map(currency => (
                            <div key={currency}>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">حد تایید برای {currency}</label>
                                <input type="text" inputMode="decimal" value={settings.approval_thresholds[currency] || ''} onChange={(e) => handleSettingsChange(currency, e.target.value)}
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"/>
                            </div>
                        ))}
                    </div>
                     <div className="mt-6 text-left"><ActionButton onClick={handleSaveSettings}>ذخیره تنظیمات</ActionButton></div>
                </SettingsCard>
            )}
        </div>
    );
};

// --- Modals ---
interface UserModalProps { user: User | null; roles: Role[]; onClose: () => void; onSuccess: () => void; }
const UserModal: React.FC<UserModalProps> = ({ user, roles, onClose, onSuccess }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({ name: '', username: '', password: '', role_id: roles[0]?.id || '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, username: user.username, password: '', role_id: user.role_id });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (user) {
            await api.updateUser({ ...formData, id: user.id });
        } else {
            await api.createUser(formData);
        }
        setIsLoading(false);
        addToast("اطلاعات کاربر با موفقیت به‌روزرسانی شد.", 'success');
        onSuccess();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-3xl font-bold text-cyan-300">{user ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</h2></div>
                    <div className="p-8 space-y-6">
                        <input type="text" placeholder='نام کامل' value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"/>
                        <input type="text" placeholder='نام کاربری (انگلیسی)' value={formData.username} onChange={e => setFormData(f => ({...f, username: e.target.value}))} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left" style={{direction: 'ltr'}}/>
                        <input type="password" placeholder={user ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'} value={formData.password} onChange={e => setFormData(f => ({...f, password: e.target.value}))} required={!user} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left" style={{direction: 'ltr'}}/>
                        <select value={formData.role_id} onChange={e => setFormData(f => ({...f, role_id: e.target.value}))} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                           {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <ActionButton type="submit" disabled={isLoading}>{isLoading ? 'در حال ثبت...' : 'ثبت کاربر'}</ActionButton>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    )
};

interface RoleModalProps { role: Role | null; onClose: () => void; onSuccess: () => void; }
const RoleModal: React.FC<RoleModalProps> = ({ role, onClose, onSuccess }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [name, setName] = useState(role?.name || '');
    const [permissions, setPermissions] = useState<Permissions>(role?.permissions || {} as Permissions);
    const [isLoading, setIsLoading] = useState(false);

    const handlePermissionChange = (module: PermissionModule, action: keyof typeof permissions[PermissionModule], value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: value,
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (role) {
            await api.updateRole({ id: role.id, name, permissions });
        } else {
            await api.createRole({ name, permissions });
        }
        setIsLoading(false);
        addToast("نقش با موفقیت ذخیره شد.", 'success');
        onSuccess();
    };
    
    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)] flex flex-col max-h-[90vh]">
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20 flex-shrink-0"><h2 className="text-3xl font-bold text-cyan-300">{role ? 'ویرایش نقش' : 'ایجاد نقش جدید'}</h2></div>
                    <div className="p-8 space-y-6 flex-grow overflow-y-auto">
                        <div>
                            <input 
                                type="text" 
                                placeholder="نام نقش (مثلا: صندوقدار)" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                required 
                                disabled={role?.name === 'مدیر کل'}
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 disabled:bg-slate-800 disabled:cursor-not-allowed"
                            />
                            {role?.name === 'مدیر کل' && (
                                <p className="text-sm text-yellow-400 mt-2">نام نقش "مدیر کل" برای حفظ یکپارچگی سیستم قابل تغییر نیست.</p>
                            )}
                        </div>
                        <div className="space-y-4">
                            {permissionModules.map(module => (
                                <div key={module} className="p-4 border border-cyan-400/20 rounded-lg">
                                    <h4 className="text-xl font-bold text-cyan-300 mb-2">{permissionModuleTranslations[module]}</h4>
                                    <div className="flex gap-x-6 gap-y-2 flex-wrap">
                                        {['view', 'create', 'edit', 'delete', 'approve', 'process'].map(action => (
                                            <label key={action} className="flex items-center gap-2 text-lg">
                                                <input type="checkbox" checked={permissions[module]?.[action as keyof typeof permissions[PermissionModule]] || false} onChange={e => handlePermissionChange(module, action as keyof typeof permissions[PermissionModule], e.target.checked)}
                                                    className="w-5 h-5 rounded bg-slate-700 border-slate-500 text-cyan-400 focus:ring-cyan-500"/>
                                                <span className="text-slate-200">{permissionActionTranslations[action]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <ActionButton type="submit" disabled={isLoading}>{isLoading ? 'در حال ذخیره...' : 'ذخیره نقش'}</ActionButton>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    )
};


export default SettingsPage;
