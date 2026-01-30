import { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import './../Dashboard.css';

export default function CompanyExpenses() {
    const { id: companyId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState([]);
    const [activeBudget, setActiveBudget] = useState(null);
    const [error, setError] = useState(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const { user } = useAuth();

    // Grouping State
    const [currentPeriodExpenses, setCurrentPeriodExpenses] = useState([]);
    const [historyGroups, setHistoryGroups] = useState({});
    const [expandedMonth, setExpandedMonth] = useState(null);

    // Form inputs
    const [mainExpenseForm, setMainExpenseForm] = useState({ description: '', amount: '', expenseDate: '', type: '' });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Parallel fetch: Expenses + Active Budget
            const [expensesData, budgetData] = await Promise.all([
                api.expenses.getAll(companyId),
                api.budgets.getActive(companyId)
            ]);

            setExpenses(expensesData);
            setActiveBudget(budgetData);

            // Process expenses based on budget period
            processExpenses(expensesData, budgetData);

            // Set default category if allocations exist
            if (budgetData?.allocations?.length > 0) {
                setMainExpenseForm(prev => ({ ...prev, type: budgetData.allocations[0].categoryName }));
            }

        } catch (error) {
            console.error("Error fetching data", error);
            setError("Failed to load data.");
        } finally {
            setLoading(false);
        }
    };

    const processExpenses = (allExpenses, budget) => {
        if (!budget) {
            // Fallback if no active budget: everything is history
            groupHistoryExpenses(allExpenses);
            setCurrentPeriodExpenses([]);
            return;
        }

        const startDate = new Date(budget.startDate);
        const endDate = new Date(budget.endDate);

        const current = [];
        const history = [];

        allExpenses.forEach(exp => {
            const expDate = new Date(exp.spentDate || exp.expenseDate); // Handle naming inconsistency
            if (expDate >= startDate && expDate <= endDate) {
                current.push(exp);
            } else {
                history.push(exp);
            }
        });

        setCurrentPeriodExpenses(current.sort((a, b) => new Date(b.spentDate) - new Date(a.spentDate)));
        groupHistoryExpenses(history);
    };

    const groupHistoryExpenses = (data) => {
        const groups = {};
        data.forEach(exp => {
            const date = new Date(exp.spentDate || exp.expenseDate);
            const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!groups[monthKey]) {
                groups[monthKey] = {
                    key: monthKey,
                    totalAmount: 0,
                    items: [],
                    lastDate: date
                };
            }
            groups[monthKey].items.push(exp);
            groups[monthKey].totalAmount += exp.amount;
        });
        setHistoryGroups(groups);
    };

    useEffect(() => {
        if (companyId) fetchData();
    }, [companyId]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            await api.expenses.create({
                companyId,
                ...mainExpenseForm,
                amount: parseFloat(mainExpenseForm.amount),
                spentDate: mainExpenseForm.expenseDate,
                privateCompany: false, // Default
                createdBy: user?.id || localStorage.getItem('userId')
            });
            setIsExpenseModalOpen(false);
            setMainExpenseForm({ description: '', amount: '', expenseDate: '', type: activeBudget?.allocations?.[0]?.categoryName || '' });
            fetchData();
        } catch (err) {
            alert('Failed to add expense');
        }
    };

    const toggleExpand = (monthKey) => {
        setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Calculate totals for active period
    const currentTotal = currentPeriodExpenses.reduce((sum, item) => sum + item.amount, 0);
    const budgetLimit = activeBudget ? activeBudget.totalAmount : 0;
    const remainingBudget = budgetLimit - currentTotal;
    const progress = budgetLimit > 0 ? (currentTotal / budgetLimit) * 100 : 0;

    const sortedHistoryGroups = Object.values(historyGroups).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));


    // Calculate spent per category
    const spentByCategory = currentPeriodExpenses.reduce((acc, exp) => {
        acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
        return acc;
    }, {});

    return (
        <div className="company-page">
            <header className="page-header">
                <div>
                    <button onClick={() => navigate(-1)} className="btn btn-secondary mb-2" style={{ marginBottom: '1rem' }}>
                        &larr; Back to Dashboard
                    </button>
                    <h1>Expense Management</h1>
                </div>
                {activeBudget && (
                    <button className="btn btn-primary" onClick={() => setIsExpenseModalOpen(true)}>
                        + New Expense
                    </button>
                )}
            </header>

            {error && <Alert type="error" message={error} />}

            {loading ? <Skeleton height="200px" /> : (
                <div className="flex flex-col gap-8">
                    {/* Active Budget Overview */}
                    {activeBudget ? (
                        <Card title={`Current Period: ${activeBudget.name}`}>
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <span className="text-secondary text-sm">Total Spent</span>
                                        <div className="text-3xl font-bold text-white">{formatCurrency(currentTotal)}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-secondary text-sm">Budget Limit</span>
                                        <div className="text-xl font-mono text-muted">{formatCurrency(budgetLimit)}</div>
                                    </div>
                                </div>
                                <div className="progress-bar-bg">
                                    <div
                                        className={`progress-bar-fill ${progress > 90 ? 'bg-red-500' : 'bg-primary'}`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-xs text-secondary">{formatCurrency(remainingBudget)} remaining</span>
                                </div>
                            </div>

                            <div className="table-container">
                                <h4 className="text-sm font-bold text-secondary uppercase mb-3">Recent Transactions</h4>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Category</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPeriodExpenses.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center p-4 text-muted">No expenses in this period yet.</td></tr>
                                        ) : (
                                            currentPeriodExpenses.map(exp => (
                                                <tr key={exp.id}>
                                                    <td>{new Date(exp.spentDate || exp.expenseDate).toLocaleDateString()}</td>
                                                    <td>{exp.description}</td>
                                                    <td><span className="badge">{exp.type}</span></td>
                                                    <td className="font-mono">{formatCurrency(exp.amount)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : (
                        <Alert type="warning" message="No active budget found. Please create a budget first to start tracking period expenses." />
                    )}

                    {/* History Section */}
                    {sortedHistoryGroups.length > 0 && (
                        <Card title="Expense History">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th>Total Spent</th>
                                            <th>Transactions</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedHistoryGroups.map(group => (
                                            <Fragment key={group.key}>
                                                <tr className={expandedMonth === group.key ? 'highlight-row' : ''}>
                                                    <td className="font-semibold">{group.key}</td>
                                                    <td className="font-mono text-lg">{formatCurrency(group.totalAmount)}</td>
                                                    <td>{group.items.length} items</td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline" onClick={() => toggleExpand(group.key)}>
                                                            {expandedMonth === group.key ? 'Hide Details' : 'View Expenses'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedMonth === group.key && (
                                                    <tr>
                                                        <td colSpan="4" className="p-0">
                                                            <div className="allocation-drawer">
                                                                <div className="allocation-list">
                                                                    {group.items.map(exp => (
                                                                        <div key={exp.id} className="allocation-card">
                                                                            <div className="flex flex-col">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <span className="badge">{exp.type}</span>
                                                                                    <span className="text-xs text-secondary">{new Date(exp.spentDate || exp.expenseDate).toLocaleDateString()}</span>
                                                                                </div>
                                                                                <span className="text-sm text-white mb-1">{exp.description}</span>
                                                                                <span className="font-mono font-bold text-lg text-white">
                                                                                    {formatCurrency(exp.amount)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Add Expense Modal */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Expense">
                <form onSubmit={handleAddExpense}>
                    <div className="form-group">
                        <label>Category (from Active Budget)</label>
                        <select
                            value={mainExpenseForm.type}
                            onChange={e => setMainExpenseForm({ ...mainExpenseForm, type: e.target.value })}
                            className="form-select"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: '#1e293b',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <option value="" style={{ color: '#94a3b8' }}>Select Category</option>
                            {activeBudget?.allocations?.map(alloc => {
                                const spent = spentByCategory[alloc.categoryName] || 0;
                                const remaining = alloc.allocatedAmount - spent;
                                return (
                                    <option key={alloc.id} value={alloc.categoryName} style={{ background: '#1e293b', color: 'white' }}>
                                        {alloc.categoryName} (Rem: {formatCurrency(remaining)})
                                    </option>
                                );
                            })}
                        </select>
                        {(!activeBudget?.allocations || activeBudget.allocations.length === 0) && (
                            <p className="text-xs text-red-400 mt-1">No allocations found in budget. Please add allocations first.</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Server costs"
                            onChange={e => setMainExpenseForm({ ...mainExpenseForm, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label>Amount</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                onChange={e => setMainExpenseForm({ ...mainExpenseForm, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                min={activeBudget?.startDate}
                                max={activeBudget?.endDate}
                                onChange={e => setMainExpenseForm({ ...mainExpenseForm, expenseDate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={!activeBudget}>Save Expense</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
