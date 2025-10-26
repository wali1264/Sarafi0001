import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const api = useApi();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const result = await api.login(username, password);

        setIsLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            login(result);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0D0C22] p-4 font-sans">
            <div 
                className="w-full max-w-lg p-10 space-y-8 bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/30"
                style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)',
                    boxShadow: '0 0 40px rgba(0, 255, 255, 0.2)'
                }}
            >
                <div className="text-center space-y-2">
                    <h1 className="text-6xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500" style={{'--tw-text-opacity': 1, textShadow: '0 0 15px rgba(0, 255, 255, 0.4)'} as React.CSSProperties}>
                        Sarrafi Alsheikh
                    </h1>
                    <p className="text-slate-400 text-xl">سیستم عامل هوشمند صرافی</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-center">{error}</div>}
                    <div>
                        <label htmlFor="username" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">
                            نام کاربری
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left transition-colors duration-300"
                            style={{direction: 'ltr'}}
                        />
                    </div>
                     <div>
                        <label htmlFor="password" aria-label="Password" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">
                           رمز عبور
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left transition-colors duration-300"
                             style={{direction: 'ltr'}}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 px-4 text-2xl font-bold tracking-widest text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                             boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}
                    >
                        {isLoading ? 'در حال ورود...' : 'ورود'}
                    </button>
                </form>
            </div>
            <p className="fixed bottom-5 right-5 text-slate-500/70 text-lg pointer-events-none" style={{ direction: 'ltr' }}>
                Meraj Production and Programming Company
            </p>
        </div>
    );
};

export default Login;