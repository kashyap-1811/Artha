import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Alert from '../components/ui/Alert';
import './Dashboard.css';

export default function DashboardHome() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalBudget: 0,
        totalExpenses: 0,
        companyCount: 0
    });
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!user?.id) return;

                // 1. Fetch user companies
                const companies = await api.companies.getMyCompanies(user.id);

                let totalBudget = 0;
                let totalExpenses = 0;

                // 2. Filter for Personal Company ONLY
                // Note: The naming convention is usually "<Name>'s personal company" or likely the first created one.
                // We will look for a match.
                if (!user?.name) return; // Should satisfy before.

                const personalCompanyName = `${user.name}'s Personal Account`;
                // Case-insensitive match or exact match.
                const personalCompany = companies.find(c =>
                    c.companyName?.toLowerCase() === personalCompanyName.toLowerCase()
                );

                if (personalCompany) {
                    try {
                        const [activeBudget, expenses] = await Promise.all([
                            api.budgets.getActive(personalCompany.companyId).catch(() => null),
                            api.expenses.getAll(personalCompany.companyId).catch(() => [])
                        ]);

                        if (activeBudget) {
                            totalBudget = activeBudget.totalAmount;
                        }
                        if (expenses && expenses.length > 0) {
                            totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                        }
                    } catch (err) {
                        console.warn(`Error fetching personal company data`, err);
                    }
                } else {
                    // Fallback: If no personal company found (unlikely if created on signup), 
                    // we could either show 0 or maybe the first one? 
                    // User request: "only show ... <name>'s personal company". 
                    // So if not found, 0 is correct.
                    console.log("No personal company found with name:", personalCompanyName);
                }

                setStats({
                    totalBudget,
                    totalExpenses,
                    companyCount: companies.length
                });

            } catch (error) {
                console.error("Dashboard data fetch failed:", error);
                setError("Failed to load dashboard data. Please check your connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <div className="dashboard-home">
            <header className="page-header">
                <div>
                    <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
                    <p className="subtitle">Here's what's happening with your finances today.</p>
                </div>
            </header>

            {error && <Alert type="error" message={error} />}

            <div className="stats-grid">
                <Card title="Total Current Budget">
                    {loading ? (
                        <Skeleton width="150px" height="40px" />
                    ) : (
                        <div className="stat-value highlight">
                            {formatCurrency(stats.totalBudget)}
                        </div>
                    )}
                    <p className="stat-desc">Across {stats.companyCount} active companies</p>
                </Card>

                <Card title="Total Expenses">
                    {loading ? (
                        <Skeleton width="150px" height="40px" />
                    ) : (
                        <div className="stat-value error">
                            {formatCurrency(stats.totalExpenses)}
                        </div>
                    )}
                    <p className="stat-desc">Total spendings recorded</p>
                </Card>

                <Card title="Remaining">
                    {loading ? (
                        <Skeleton width="150px" height="40px" />
                    ) : (
                        <div className={`stat-value ${stats.totalBudget - stats.totalExpenses < 0 ? 'error' : 'success'}`}>
                            {formatCurrency(stats.totalBudget - stats.totalExpenses)}
                        </div>
                    )}
                    <p className="stat-desc">Total available funds</p>
                </Card>
            </div>
        </div>
    );
}
