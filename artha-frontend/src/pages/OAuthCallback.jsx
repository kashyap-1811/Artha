import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const token = searchParams.get('token');
        const userId = searchParams.get('userId');

        if (token && userId) {
            login(token, { id: userId });
            navigate('/');
        } else {
            navigate('/login');
        }
    }, [searchParams, login, navigate]);

    return (
        <div className="auth-container">
            <p style={{ color: 'var(--text-muted)' }}>Authenticating...</p>
        </div>
    );
}
