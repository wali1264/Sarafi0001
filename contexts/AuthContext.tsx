import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User, Role, ExternalLogin, Customer, PartnerAccount, Permissions, PermissionModule, PermissionAction } from '../types';

export type AuthenticatedUser = (User & { userType: 'internal'; role: Role }) | 
                               (ExternalLogin & { userType: 'customer'; entity: Customer }) | 
                               (ExternalLogin & { userType: 'partner'; entity: PartnerAccount });


interface AuthContextType {
    user: AuthenticatedUser | null;
    login: (user: AuthenticatedUser) => void;
    logout: () => void;
    hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null);

    const login = (userData: AuthenticatedUser) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    const hasPermission = useCallback((module: PermissionModule, action: PermissionAction): boolean => {
        if (!user || user.userType !== 'internal') {
            return false;
        }
        // Special case for the General Manager (Super Admin) role to grant all permissions
        if (user.role?.name === 'مدیر کل') {
            return true;
        }
        if (!user.role || !user.role.permissions) {
            return false;
        }
        const modulePermissions = user.role.permissions[module];
        if (!modulePermissions) {
            return false;
        }
        return modulePermissions[action] === true;
    }, [user]);


    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};