import { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import './../Dashboard.css';

export default function CompanyBudgets() {
    const { id: companyId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState([]);
    const [error, setError] = useState(null);

    // Create Budget Modal State
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ name: '', amount: '', startDate: '', endDate: '' });

    // Expanded State for Allocations
    const [expandedBudgetId, setExpandedBudgetId] = useState(null);
    const [allocForm, setAllocForm] = useState({ categoryName: 'Operational', allocatedAmount: '' });

    const ALLOCATION_CATEGORIES = ['Operational', 'Marketing', 'Capital', 'Events', 'Research', 'Payroll', 'General', 'Food', 'Travel', 'Utility'];

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const allBudgets = await api.budgets.getAll(companyId);
            setBudgets(allBudgets.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
        } catch (error) {
            console.error("Error fetching budgets", error);
            setError("Failed to load budgets.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId) fetchData();
    }, [companyId]);

    const handleCreateBudget = async (e) => {
        e.preventDefault();
        try {
            await api.budgets.create(
                companyId,
                budgetForm.name,
                parseFloat(budgetForm.amount),
                budgetForm.startDate,
                budgetForm.endDate
            );
            setIsBudgetModalOpen(false);
            setBudgetForm({ name: '', amount: '', startDate: '', endDate: '' });
            fetchData();
        } catch (err) {
            alert('Failed to create budget. Ensure dates do not overlap with existing budgets.');
        }
    };

    const handleAddAllocation = async (e, budgetId) => {
        e.preventDefault();
        try {
            await api.budgets.addAllocation(
                budgetId,
                allocForm.categoryName,
                parseFloat(allocForm.allocatedAmount)
            );
            setAllocForm({ categoryName: 'Operational', allocatedAmount: '' });
            fetchData(); // Refresh to see new allocation
        } catch (err) {
            alert('Failed to add allocation. Ensure total does not exceed budget limit.');
        }
    };

    const toggleExpand = (id) => {
        setExpandedBudgetId(expandedBudgetId === id ? null : id);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div className="company-page">
            <header className="page-header">
                <div>
                    <button onClick={() => navigate(-1)} className="btn btn-secondary mb-2" style={{ marginBottom: '1rem' }}>
                        &larr; Back to Dashboard
                    </button>
                    <h1>Budget Management</h1>
                </div>
                <button className="btn btn-primary" onClick={() => setIsBudgetModalOpen(true)}>
                    + New Fiscal Budget
                </button>
            </header>

            {error && <Alert type="error" message={error} />}

            {loading ? <Skeleton height="200px" /> : (
                <Card title="Budget History">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Period / Name</th>
                                    <th>Total Budget</th>
                                    <th>Allocated</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgets.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center p-4">No budgets found</td></tr>
                                ) : (
                                    budgets.map(b => {
                                        const allocatedTotal = b.allocations?.reduce((sum, a) => sum + a.allocatedAmount, 0) || 0;
                                        return (
                                            <Fragment key={b.id}>
                                                <tr className={expandedBudgetId === b.id ? 'highlight-row' : ''}>
                                                    <td className="font-semibold">{b.name}</td>
                                                    <td className="font-mono">{formatCurrency(b.totalAmount)}</td>
                                                    <td className="font-mono text-sm">
                                                        {formatCurrency(allocatedTotal)}
                                                        <span className="text-muted ml-1">
                                                            ({Math.round((allocatedTotal / b.totalAmount) * 100)}%)
                                                        </span>
                                                    </td>
                                                    <td>{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={`status-badge ${b.status === 'ACTIVE' ? 'status-approved' : 'status-pending'}`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline" onClick={() => toggleExpand(b.id)}>
                                                            {expandedBudgetId === b.id ? 'Hide Details' : 'Manage Allocations'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Allocation Row */}
                                                {
                                                    expandedBudgetId === b.id && (
                                                        <tr>
                                                            <td colSpan="6" className="p-0">
                                                                <div className="allocation-drawer">
                                                                    <h4 className="mb-3 text-sm uppercase text-secondary font-bold" style={{ letterSpacing: '0.05em' }}>
                                                                        Allocations for {b.name}
                                                                    </h4>

                                                                    {/* Helper Form */}
                                                                    <form onSubmit={(e) => handleAddAllocation(e, b.id)} className="allocation-form">
                                                                        <div className="flex-1">
                                                                            <label className="text-secondary text-xs block mb-2">Category (Select or Type)</label>
                                                                            <input
                                                                                list="category-options"
                                                                                type="text"
                                                                                value={allocForm.categoryName}
                                                                                onChange={e => setAllocForm({ ...allocForm, categoryName: e.target.value })}
                                                                                className="allocation-input"
                                                                                placeholder="Select or type custom..."
                                                                                required
                                                                            />
                                                                            <datalist id="category-options">
                                                                                {ALLOCATION_CATEGORIES.map(cat => (
                                                                                    <option key={cat} value={cat} />
                                                                                ))}
                                                                            </datalist>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="text-secondary text-xs block mb-2">Amount</label>
                                                                            <input
                                                                                type="number"
                                                                                value={allocForm.allocatedAmount}
                                                                                onChange={e => setAllocForm({ ...allocForm, allocatedAmount: e.target.value })}
                                                                                className="allocation-input"
                                                                                placeholder="0.00"
                                                                                required
                                                                            />
                                                                        </div>
                                                                        <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 1.5rem' }}>
                                                                            Add
                                                                        </button>
                                                                    </form>

                                                                    {/* List of Allocations */}
                                                                    <div className="allocation-list">
                                                                        {b.allocations && b.allocations.length > 0 ? (
                                                                            b.allocations.map(alloc => (
                                                                                <div key={alloc.id} className="allocation-card">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm text-secondary mb-1">{alloc.categoryName}</span>
                                                                                        <span className="font-mono font-bold text-lg text-white">
                                                                                            {formatCurrency(alloc.allocatedAmount)}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (confirm('Remove allocation?')) {
                                                                                                api.budgets.removeAllocation(b.id, alloc.id).then(() => fetchData());
                                                                                            }
                                                                                        }}
                                                                                        className="text-secondary hover:text-red-400 text-xl leading-none px-2"
                                                                                        title="Remove"
                                                                                    >
                                                                                        &times;
                                                                                    </button>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-sm text-secondary italic">No categories allocated yet.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )
            }

            {/* Create Budget Modal (Main Budget only) */}
            <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Create Fiscal Budget">
                <form onSubmit={handleCreateBudget}>
                    <div className="form-group">
                        <label>Budget Name (Period)</label>
                        <input
                            type="text"
                            placeholder="e.g. January 2026"
                            required
                            onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Total Budget Limit</label>
                        <input type="number" required onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" required onChange={e => setBudgetForm({ ...budgetForm, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <input type="date" required onChange={e => setBudgetForm({ ...budgetForm, endDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Create Budget</button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
