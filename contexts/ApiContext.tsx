
import React, { createContext, ReactNode, useMemo } from 'react';
import SarrafiApiService from '../services/sarrafiApiService';

const ApiContext = createContext<SarrafiApiService | undefined>(undefined);

export const ApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const apiService = useMemo(() => new SarrafiApiService(), []);

    return (
        <ApiContext.Provider value={apiService}>
            {children}
        </ApiContext.Provider>
    );
};

export default ApiContext;
