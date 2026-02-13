import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ui/ThemeToggle';
import './Sidebar.css';

export default function Sidebar() {
    const { logout } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Artha</h2>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    Dashboard
                </NavLink>
                <NavLink
                    to="/dashboard/companies"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    Companies
                </NavLink>
                <NavLink
                    to="/dashboard/profile"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    Profile
                </NavLink>
            </nav>

            <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <ThemeToggle />
                <button onClick={logout} className="btn-logout" style={{ marginLeft: '1rem' }}>
                    Logout
                </button>
            </div>
        </aside>
    );
}
