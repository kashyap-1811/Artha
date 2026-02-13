import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import './Dashboard.css';

export default function CompanyList() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [iscreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [newCompanyName, setNewCompanyName] = useState('');
    const [createError, setCreateError] = useState('');
    const [error, setError] = useState(null);

    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user?.id) return;
            const response = await api.companies.getMyCompanies(user.id);
            setCompanies(response);
        } catch (error) {
            console.error("Failed to fetch companies", error);
            setError("Failed to load companies. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, [user]);

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setCreateError('');
        try {
            await api.companies.create(newCompanyName, user.id);
            setIsCreateModalOpen(false);
            setNewCompanyName('');
            fetchCompanies();
        } catch (error) {
            setCreateError('Failed to create company. Please try again.');
        }
    };

    return (
        <div className="company-list-page">
            <header className="page-header">
                <div>
                    <h1>My Companies</h1>
                    <p className="subtitle">Manage your businesses and projects.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + Create Company
                </button>
            </header>

            {error && <Alert type="error" message={error} />}

            {loading ? (
                <div className="company-grid">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <Skeleton width="60%" height="24px" className="mb-2" />
                            <Skeleton width="40%" height="16px" />
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="company-grid">
                    {companies.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <EmptyState
                                title="No Companies Found"
                                description="You haven't created any companies yet. Start by creating one to track budget and expenses."
                                action={
                                    <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                                        Create Your First Company
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        companies.map((item) => (
                            <Card key={item.companyId} title={item.companyName}>
                                <div className="company-role-badge">
                                    Role: {item.role}
                                </div>
                                <div className="company-card-action">
                                    <Link
                                        to={`/dashboard/companies/${item.companyId}`}
                                        className="btn btn-primary"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Modal
                isOpen={iscreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Company"
            >
                <form onSubmit={handleCreateCompany}>
                    {createError && <div className="error-message mb-4">{createError}</div>}
                    <div className="form-group">
                        <label>Company Name</label>
                        <input
                            type="text"
                            placeholder="Enter company name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create Company
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
