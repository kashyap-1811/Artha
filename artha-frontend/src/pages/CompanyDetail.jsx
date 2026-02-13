import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import './Dashboard.css';

export default function CompanyDetail() {
    const { id: companyId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Need user to fetch companies list
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [activeBudget, setActiveBudget] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Company Details
            const myCompanies = await api.companies.getMyCompanies(user.id);
            const foundCompany = myCompanies.find(c => c.companyId === companyId);
            setCompany(foundCompany || { companyName: 'Unknown Company' });

            // 2. Fetch Data (Budget & Expenses)
            const [budgetData, expensesData] = await Promise.all([
                api.budgets.getActive(companyId).catch(() => null),
                api.expenses.getAll(companyId).catch(() => [])
            ]);

            setActiveBudget(budgetData);
            setExpenses(expensesData.sort((a, b) => new Date(b.spentDate) - new Date(a.spentDate)));
        } catch (error) {
            console.error("Error fetching details", error);
            setError("Failed to load company details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId && user?.id) fetchData();
    }, [companyId, user]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budgetUtilization = activeBudget ? (totalExpenses / activeBudget.totalAmount) * 100 : 0;

    return (
        <div className="company-detail-page">
            <header className="page-header">
                <div>
                    <button onClick={() => navigate('/dashboard/companies')} className="btn btn-secondary mb-2" style={{ marginBottom: '1rem' }}>
                        &larr; Back to List
                    </button>
                    <h1>{company?.companyName || 'Company Dashboard'}</h1>
                    <p className="subtitle">Overview & Quick Actions</p>
                </div>
                <div className="flex-gap" style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => navigate(`/dashboard/companies/${companyId}/budgets`)}>
                        Manage Budget
                    </button>
                    <button className="btn btn-outline" onClick={() => navigate(`/dashboard/companies/${companyId}/expenses`)}>
                        Manage Expenses
                    </button>
                </div>
            </header>

            {error && <Alert type="error" message={error} />}

            {loading ? <Skeleton height="200px" /> : (
                <>
                    {/* Budget Overview Card */}
                    <div className="stats-grid">
                        <Card title="Active Budget">
                            {activeBudget ? (
                                <>
                                    <h2 className="stat-value highlight">{activeBudget.name}</h2>
                                    <div className="progress-bar-container">
                                        <div className="progress-labels">
                                            <span>Spent: {formatCurrency(totalExpenses)}</span>
                                            <span>Total: {formatCurrency(activeBudget.totalAmount)}</span>
                                        </div>
                                        <div className="progress-track">
                                            <div
                                                className={`progress-fill ${budgetUtilization > 100 ? 'over-budget' : 'under-budget'}`}
                                                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {formatCurrency(activeBudget.totalAmount - totalExpenses)} remaining
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                                    No active budget set.
                                    <div className="mt-4">
                                        <button className="btn btn-outline" onClick={() => navigate(`budgets`)}>Create Budget</button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Recent Expenses Preview */}
                    <Card title="Recent Activity" className="mt-8">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reference</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.slice(0, 5).map(exp => (
                                        <tr key={exp.id}>
                                            <td>{new Date(exp.spentDate).toLocaleDateString()}</td>
                                            <td>{exp.reference || '-'}</td>
                                            <td><span className="badge">{exp.type}</span></td>
                                            <td className="font-mono">{formatCurrency(exp.amount)}</td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center p-4">
                                                No recent activity.
                                                <div className="mt-2">
                                                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`expenses`)}>Add First Expense</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
