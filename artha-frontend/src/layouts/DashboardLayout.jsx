import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './DashboardLayout.css';

export default function DashboardLayout() {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-content">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
