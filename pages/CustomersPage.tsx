
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, User, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateCustomerModal from '../components/CreateCustomerModal';
import EditCustomerModal from '../components/EditCustomerModal';
import { useToast } from '../contexts/ToastContext';

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CustomersPage: React.FC = () => {
    const api = useApi();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getCustomers();
        setCustomers(data);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setCreateModalOpen(false);
        setEditModalOpen(false);
        setSelectedCustomer(null);
        fetchData();
    };

    const handleEditClick = (customer: Customer) => {
        setSelectedCustomer(customer);
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (customer: Customer) => {
        if (!user || user.userType !== 'internal') return;
        
        if (window.confirm(`هشدار مهم:\nآیا از حذف کامل مشتری "${customer.name}" اطمینان دارید؟\nاین عمل تمام سوابق مشتری را پاک می‌کند و قابل بازگشت نیست.`)) {
            const result = await api.deleteCustomer({ id: customer.id, user });
            if (result.error) {
                addToast(result.error, 'error');
            } else {
                addToast("مشتری با موفقیت حذف شد.", 'success');
                fetchData();
            }
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.whatsapp_number && c.whatsapp_number.includes(searchTerm))
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [customers, searchTerm]);

    return (
        <div style={{direction: 'rtl'}}>
            <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت مشتریان</h1>
                {hasPermission('customers', 'create') && (
                    <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت مشتری جدید
                    </button>
                )}
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-4 border-b-2 border-cyan-400/20">
                     <input 
                        type="text"
                        placeholder="جستجو بر اساس نام، کد، یا شماره واتس‌اپ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">کد</th>
                                <th className="px-6 py-4 font-medium">نام مشتری</th>
                                <th className="px-6 py-4 font-medium">شماره واتس‌اپ</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(c => {
                                // Check if customer has zero balance in all currencies
                                const isZeroBalance = Object.values(c.balances).every(val => val === 0);
                                
                                return (
                                    <tr key={c.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-cyan-300 text-2xl">{c.code}</td>
                                        <td className="px-6 py-4 text-2xl font-semibold text-slate-100">{c.name}</td>
                                        <td className="px-6 py-4 font-mono text-left">{c.whatsapp_number}</td>
                                        <td className="px-6 py-4 text-left whitespace-nowrap space-x-4 space-x-reverse flex justify-end">
                                            {hasPermission('customers', 'edit') && (
                                                <button onClick={() => handleEditClick(c)} className="text-amber-400 hover:text-amber-300">ویرایش</button>
                                            )}
                                            <button onClick={() => navigate(`/customers/${c.id}`)} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                                                مشاهده دفتر حساب
                                            </button>
                                            {hasPermission('customers', 'delete') && (
                                                <button 
                                                    onClick={() => handleDeleteClick(c)} 
                                                    disabled={!isZeroBalance}
                                                    title={!isZeroBalance ? "امکان حذف مشتری با حساب دارای مانده وجود ندارد." : "حذف مشتری"}
                                                    className={`p-2 rounded transition-colors ${!isZeroBalance ? 'text-slate-600 cursor-not-allowed' : 'text-red-500 hover:text-red-400 hover:bg-red-500/10'}`}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateCustomerModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleSuccess} />
            )}

            {isEditModalOpen && selectedCustomer && user && (
                <EditCustomerModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} customer={selectedCustomer} currentUser={user} />
            )}
        </div>
    );
};

export default CustomersPage;
