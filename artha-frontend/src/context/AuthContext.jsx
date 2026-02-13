import { createContext, useState, useEffect, useContext } from 'react';

import { api } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const fetchUser = async (userId) => {
        try {
            const userData = await api.users.get(userId);
            setUser({ ...userData, name: userData.fullName });
        } catch (error) {
            console.error("Failed to fetch user details", error);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUserId = localStorage.getItem('userId');

            if (storedToken && storedUserId) {
                setToken(storedToken);
                await fetchUser(storedUserId);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (newToken, appUser) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('userId', appUser.id);
        setToken(newToken);
        await fetchUser(appUser.id);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
