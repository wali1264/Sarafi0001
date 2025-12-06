
import { useContext } from 'react';
import ApiContext from '../contexts/ApiContext';
import SarrafiApiService from '../services/sarrafiApiService';

export const useApi = (): SarrafiApiService => {
    const context = useContext(ApiContext);
    if (context === undefined) {
        throw new Error('useApi must be used within an ApiProvider');
    }
    return context;
};
