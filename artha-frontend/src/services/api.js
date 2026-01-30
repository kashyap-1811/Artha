const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8080/api';
const BUDGET_API_URL = import.meta.env.VITE_BUDGET_API_URL || 'http://localhost:8081/api';
const EXPENSE_API_URL = import.meta.env.VITE_EXPENSE_API_URL || 'http://localhost:8082/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper for debugging
const request = async (url, options = {}) => {
    console.log(`🚀 API Request: ${options.method || 'GET'} ${url}`, options);
    try {
        const response = await fetch(url, options);
        console.log(`Testing response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error [${response.status}]:`, errorText);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        // Handle 204 No Content
        if (response.status === 204) return null;

        return response.json();
    } catch (error) {
        console.error("🔥 Network/Fetch Error:", error);
        throw error;
    }
};

export const api = {
    auth: {
        login: (email, password) => request(`${AUTH_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }),
        signup: (fullName, email, password) => request(`${AUTH_API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password }),
        })
    },
    users: {
        get: (id) => request(`${AUTH_API_URL}/users/${id}`, {
            headers: { ...getAuthHeaders() }
        })
    },
    companies: {
        create: (name, ownerId) => request(`${AUTH_API_URL}/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-USER-ID': ownerId, ...getAuthHeaders() },
            body: JSON.stringify({ name }),
        }),
        getMyCompanies: (userId) => request(`${AUTH_API_URL}/companies/my`, {
            headers: { 'X-USER-ID': userId, ...getAuthHeaders() }
        }),
        getDetails: async (id) => ({})
    },
    budgets: {
        create: (companyId, name, totalAmount, startDate, endDate) => request(`${BUDGET_API_URL}/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ companyId, name, totalAmount, startDate, endDate }),
        }),
        getActive: async (companyId) => {
            try {
                return await request(`${BUDGET_API_URL}/budgets/active?companyId=${companyId}`, {
                    headers: { ...getAuthHeaders() }
                });
            } catch (error) {
                // Special handling for 404/500 from Budget Service
                if (error.message.includes('404') || error.message.includes('500')) return null;
                throw error;
            }
        },
        getAll: (companyId) => request(`${BUDGET_API_URL}/budgets?companyId=${companyId}`, {
            headers: { ...getAuthHeaders() }
        }),
        addAllocation: (budgetId, categoryName, allocatedAmount) => request(`${BUDGET_API_URL}/budgets/${budgetId}/allocations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ categoryName, allocatedAmount })
        }),
        removeAllocation: (budgetId, allocationId) => request(`${BUDGET_API_URL}/budgets/${budgetId}/allocations/${allocationId}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() }
        })
    },
    expenses: {
        create: (expenseData) => request(`${EXPENSE_API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(expenseData),
        }),
        getAll: (companyId) => request(`${EXPENSE_API_URL}/expenses?companyId=${companyId}`, {
            headers: { ...getAuthHeaders() }
        }),
        approve: (expenseId) => request(`${EXPENSE_API_URL}/expenses/${expenseId}/approve`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        }),
        reject: (expenseId) => request(`${EXPENSE_API_URL}/expenses/${expenseId}/reject`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        })
    }
};

export const endpoints = {
    googleAuth: 'http://localhost:8080/oauth2/login/google'
};

