import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleGetStarted = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="app-container">
            <header className="hero">
                <h1>Artha</h1>
                <p className="subtitle">Premium Budget & Expense Tracker</p>
                <div className="actions">
                    <button onClick={() => handleGetStarted()} className="btn btn-primary">
                        Get Started
                    </button>
                </div>
            </header>
        </div>
    );
}
