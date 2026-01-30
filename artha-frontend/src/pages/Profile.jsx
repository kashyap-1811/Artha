import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import './Dashboard.css';

export default function Profile() {
    const { user } = useAuth();

    return (
        <div className="profile-page">
            <header className="page-header">
                <h1>My Profile</h1>
            </header>

            <Card title="Personal Information">
                <div className="profile-details">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" value={user?.name || ''} readOnly className="readonly-input" />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" value={user?.email || ''} readOnly className="readonly-input" />
                    </div>
                    <div className="form-group">
                        <label>User ID</label>
                        <input type="text" value={user?.id || ''} readOnly className="readonly-input" />
                    </div>
                </div>
            </Card>
        </div>
    );
}
